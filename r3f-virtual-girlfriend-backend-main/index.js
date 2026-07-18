import cors from "cors";
import "dotenv/config";
import voice from "elevenlabs-node";
import express from "express";
import { promises as fs } from "fs";
import { WebSocketServer } from "ws";
import { searchOffers, activeProvider } from "./data/index.js";
import { complete as llmComplete, activeLlm } from "./llm/index.js";
import { speak, ttsLabel } from "./tts.js";
import { appendLead } from "./leads.js";
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
