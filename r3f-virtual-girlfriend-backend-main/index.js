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
  const rows = leads
    .map(
      (l) => `<tr><td>${esc(l.receivedAt)}</td><td>${esc(l.name)}</td><td>${esc(l.email)}</td><td>${esc(l.phone)}</td><td>${esc(l.hotel)}</td><td>${esc(l.note)}</td></tr>`
    )
    .join("");
  res.send(`<!doctype html><html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>NuriReisen — Leads</title>
<style>body{font-family:system-ui,sans-serif;margin:24px;color:#16232b;background:#fff}
h1{font-size:20px}.count{color:#4a5a60;font-weight:400}
table{border-collapse:collapse;width:100%;font-size:14px}
th,td{border-bottom:1px solid #e2e6e7;text-align:left;padding:8px 10px;vertical-align:top}
th{background:#f4f5f6;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#4a5a60}
tr:hover td{background:#fafbfb}</style></head>
<body><h1>NuriReisen — Kontaktanfragen <span class="count">(${leads.length})</span></h1>
<table><thead><tr><th>Eingegangen</th><th>Name</th><th>E-Mail</th><th>Telefon</th><th>Hotel</th><th>Nachricht</th></tr></thead>
<tbody>${rows || '<tr><td colspan="6">Noch keine Anfragen.</td></tr>'}</tbody></table></body></html>`);
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
        await appendLead({ ...lead, sessionId });
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
