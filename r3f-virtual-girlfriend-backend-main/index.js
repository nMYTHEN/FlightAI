import cors from "cors";
import "dotenv/config";
import voice from "elevenlabs-node";
import express from "express";
import { promises as fs } from "fs";
import { WebSocketServer } from "ws";
import { searchOffers, activeProvider } from "./data/index.js";
import { complete as llmComplete, activeLlm } from "./llm/index.js";
import { speak, ttsLabel } from "./tts.js";
import { appendLead, readLeads } from "./leads.js";
import { sysMessage } from "./prompts/systemPrompt.js";

const elevenLabsApiKey = process.env.ELEVEN_LABS_API_KEY;

const app = express();
app.use(express.json());
app.use(cors());
const port = 25576;

app.get("/", (req, res) => {
  res.send("NuriReisen backend");
});

app.get("/voices", async (req, res) => {
  res.send(await voice.getVoices(elevenLabsApiKey));
});

// Geschütztes Leads-Dashboard (HTTP Basic Auth via LEADS_PASSWORD).
const esc = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

app.get(["/admin/leads", "/apiv2/admin/leads"], async (req, res) => {
  const pass = process.env.LEADS_PASSWORD;
  const hdr = req.headers.authorization || "";
  const given = hdr.startsWith("Basic ")
    ? Buffer.from(hdr.slice(6), "base64").toString().split(":").slice(1).join(":")
    : "";
  if (!pass || given !== pass) {
    res.set("WWW-Authenticate", 'Basic realm="NuriReisen Leads"');
    return res.status(401).send("Zugang erforderlich");
  }
  const leads = (await readLeads()).slice().reverse();

  const fmtDate = (iso) => {
    try {
      return esc(new Date(iso).toLocaleString("de-AT"));
    } catch {
      return esc(iso);
    }
  };
  const fmtCriteria = (a) => {
    if (!a) return "—";
    const p = [];
    if (a.to) p.push(`Ziel: ${a.to}`);
    if (a.from) p.push(`ab ${a.from}`);
    if (a.startDate) p.push(a.duration ? `${a.startDate} (${a.duration} T.)` : a.startDate);
    if (a.adults) p.push(`${a.adults} Erw.${a.children ? " + " + a.children + " Ki." : ""}`);
    if (a.board) p.push(a.board);
    if (a.minStars) p.push(`ab ${a.minStars}★`);
    if (a.maxPricePerPerson) p.push(`≤ ${a.maxPricePerPerson}€ p.P.`);
    return esc(p.join(" · ")) || "—";
  };
  const fmtHotel = (l) => {
    const h = l.hotel;
    if (!h) return '<span class="muted">Allg. Beratung</span>';
    const name = typeof h === "object" ? h.name : h;
    const loc = typeof h === "object" ? h.location || "" : "";
    const price = typeof h === "object" && h.price ? ` · ${h.price}€` : "";
    const q = encodeURIComponent(`${name} ${loc} Hotel`);
    return `<a href="https://www.google.com/search?q=${q}" target="_blank" rel="noopener">${esc(name)}</a>${esc((loc ? " — " + loc : "") + price)}`;
  };
  const fmtConv = (conv) => {
    if (!conv || !conv.length) return "";
    const lines = conv
      .map((m) => `<div><b>${m.role === "user" ? "Kunde" : "Lara"}:</b> ${esc(m.text)}</div>`)
      .join("");
    return `<details><summary>Verlauf (${conv.length})</summary><div class="conv">${lines}</div></details>`;
  };

  const rows = leads
    .map(
      (l) => `<tr>
    <td>${fmtDate(l.receivedAt)}</td>
    <td><b>${esc(l.name) || "—"}</b><br><a href="mailto:${esc(l.email)}">${esc(l.email)}</a>${l.phone ? "<br>" + esc(l.phone) : ""}</td>
    <td>${fmtHotel(l)}</td>
    <td>${fmtCriteria(l.searchArgs)}</td>
    <td>${esc(l.note)}${fmtConv(l.conversation)}</td>
  </tr>`
    )
    .join("");

  res.send(`<!doctype html><html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>NuriReisen — Leads</title>
<style>body{font-family:system-ui,sans-serif;margin:24px;color:#16232b;background:#fff}
h1{font-size:20px}.count{color:#4a5a60;font-weight:400}.muted{color:#4a5a60}
table{border-collapse:collapse;width:100%;font-size:14px}
th,td{border-bottom:1px solid #e2e6e7;text-align:left;padding:8px 10px;vertical-align:top}
th{background:#f4f5f6;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#4a5a60}
tr:hover td{background:#fafbfb}a{color:#127279}
details{margin-top:6px}summary{cursor:pointer;color:#127279;font-size:13px}
.conv{margin-top:6px;max-height:220px;overflow:auto;background:#f7f8f8;border-radius:8px;padding:8px;font-size:13px;line-height:1.5}
.conv b{color:#134b50}</style></head>
<body><h1>NuriReisen — Kontaktanfragen <span class="count">(${leads.length})</span></h1>
<table><thead><tr><th>Eingegangen</th><th>Kontakt</th><th>Interesse</th><th>Kriterien</th><th>Nachricht / Verlauf</th></tr></thead>
<tbody>${rows || '<tr><td colspan="5">Noch keine Anfragen.</td></tr>'}</tbody></table></body></html>`);
});

const runDbQuery = async (args) => {
  console.log("DbQuery args:", args);
  const offers = await searchOffers(args || {});
  console.log(`DbQuery -> ${offers.length} Angebote (Provider: ${activeProvider})`);
  return offers;
};

const server = app.listen(port, () => {
  console.log(`NuriReisen backend listening on port ${port}`);
  console.log(`  LLM: ${activeLlm} | Data: ${activeProvider} | TTS: ${ttsLabel}`);
});

const wss = new WebSocketServer({ server });

// Session-Speicher: sessionId -> chatHistory. In-memory (reset bei Neustart).
// TODO: TTL/Größenlimit bzw. echte Persistenz (Redis/DB).
const sessions = new Map();
// Zusatzkontext pro Session: sessionId -> { lastArgs, lastHotels } (für Lead-Anreicherung).
const sessionMeta = new Map();

wss.on("connection", (ws) => {
  console.log("WebSocket client connected");
  let chatHistory = []; // Fallback ohne sessionId (nicht persistent)
  let sessionId = null;

  ws.on("message", async (data) => {
    try {
      const { message: userText, sessionId: sid, lead } = JSON.parse(data);

      // Session-Persistenz: bei bekannter sessionId den Verlauf wiederherstellen,
      // damit Reconnect/Reload das Gespräch nicht verliert.
      if (sid && sid !== sessionId) {
        sessionId = sid;
        if (!sessions.has(sid)) sessions.set(sid, []);
        chatHistory = sessions.get(sid);
      }

      // Lead-Erfassung (Kontaktanfrage) — hat Vorrang vor dem Chat.
      if (lead && typeof lead === "object") {
        const meta = sessionId ? sessionMeta.get(sessionId) : null;
        const transcript = (sessionId ? sessions.get(sessionId) : chatHistory) || [];
        const conversation = transcript
          .filter(
            (m) =>
              typeof m.content === "string" &&
              !m.content.startsWith("DbQuery-Ergebnisse")
          )
          .slice(-20)
          .map((m) => ({ role: m.role, text: m.content }));

        await appendLead({
          ...lead,
          sessionId,
          searchArgs: meta?.lastArgs || null,
          resultHotels: meta?.lastHotels || null,
          conversation,
        });
        const first = (lead.name || "").trim().split(/\s+/)[0];
        const text = `Danke${first ? " " + first : ""}! Ich habe deine Anfrage aufgenommen — ein Kollege prüft sie und meldet sich zeitnah bei dir. Ganz unverbindlich.`;
        let audio;
        try {
          audio = await speak(text);
        } catch (e) {
          console.error("TTS-Fehler (Lead):", e.message);
        }
        return ws.send(
          JSON.stringify({
            messages: [{ text, audio, facialExpression: "smile", animation: "Talking_1" }],
            uiAction: null,
          })
        );
      }

      if (!userText || typeof userText !== "string") {
        return ws.send(JSON.stringify({ error: "Ungültige Nachricht" }));
      }

      console.log("Received message:", userText);
      chatHistory.push({ role: "user", content: userText });

      let done = false;
      let retryCount = 0;
      let steps = 0;

      while (!done && retryCount < 2 && steps < 8) {
        steps++;
        const time = Date.now();

        let raw;
        try {
          raw = await llmComplete({ system: sysMessage, messages: chatHistory });
        } catch (e) {
          console.error("LLM API Error:", e);
          return ws.send(JSON.stringify({ error: "LLM API-Fehler" }));
        }

        let result;
        try {
          result = JSON.parse(raw);
        } catch (err) {
          if (retryCount === 0) {
            retryCount++;
            continue;
          }
          console.error("AI JSON Parsing Error:", err);
          return ws.send(JSON.stringify({ error: "AI JSON Parsing Error: " + err.message }));
        }

        // messages sind optional: stille Zwischenschritte (nur Execute) sind erlaubt.
        const msgs = Array.isArray(result.messages) ? result.messages : [];

        for (let i = 0; i < msgs.length; i++) {
          const msg = msgs[i];
          try {
            msg.audio = await speak(msg.text);
          } catch (e) {
            console.error("TTS-Fehler:", e.message);
          }
        }

        if (msgs.length) {
          chatHistory.push(
            ...msgs.map((m) => ({ role: "assistant", content: m.text }))
          );
        }

        if (result.Execute?.function === "DbQuery") {
          const dbResult = await runDbQuery(result.Execute.args);
          chatHistory.push({
            role: "user",
            content:
              `DbQuery-Ergebnisse (${dbResult.length} Angebote):\n` +
              JSON.stringify(dbResult),
          });
          if (sessionId) {
            sessionMeta.set(sessionId, {
              lastArgs: result.Execute.args || null,
              lastHotels: dbResult.slice(0, 5).map((h) => ({
                id: h.id,
                name: h.name,
                location: h.location,
                pricePerPerson: h.pricePerPerson,
                currency: h.currency,
              })),
            });
          }
        }

        console.log(`Response generated in ${Date.now() - time}ms`);

        // Nur an den Client senden, wenn es etwas zu zeigen gibt
        // (stille Execute-Zwischenschritte nicht senden).
        if (msgs.length || result.UIAction) {
          ws.send(JSON.stringify({
            messages: msgs,
            uiAction: result.UIAction || null,
          }));
        }

        retryCount = 0;
        done = result.Done === true;
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      ws.send(JSON.stringify({ error: err.message || "Unbekannter Fehler" }));
    }
  });

  ws.on("close", () => {
    console.log("WebSocket client disconnected");
  });
});
