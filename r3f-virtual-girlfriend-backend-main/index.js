import cors from "cors";
import "dotenv/config";
import voice from "elevenlabs-node";
import express from "express";
import { promises as fs } from "fs";
import OpenAI from "openai";
import { WebSocketServer } from "ws";
import { searchOffers, activeProvider } from "./data/index.js";
import { complete as llmComplete, activeLlm } from "./llm/index.js";
import { sysMessage } from "./prompts/systemPrompt.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "-",
});

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
  console.log(`  LLM: ${activeLlm} | Data: ${activeProvider}`);
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
      const { message: userText, sessionId: sid } = JSON.parse(data);

      // Session-Persistenz: bei bekannter sessionId den Verlauf wiederherstellen,
      // damit Reconnect/Reload das Gespräch nicht verliert.
      if (sid && sid !== sessionId) {
        sessionId = sid;
        if (!sessions.has(sid)) sessions.set(sid, []);
        chatHistory = sessions.get(sid);
      }

      if (!userText || typeof userText !== "string") {
        return ws.send(JSON.stringify({ error: "Ungültige Nachricht" }));
      }

      console.log("Received message:", userText);
      chatHistory.push({ role: "user", content: userText });

      let done = false;
      let retryCount = 0;

      while (!done && retryCount < 2) {
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

        if (!result.messages || !Array.isArray(result.messages)) {
          return ws.send(JSON.stringify({ error: "AI hat keine messages zurückgegeben" }));
        }

        for (let i = 0; i < result.messages.length; i++) {
          const msg = result.messages[i];
          const response = await openai.audio.speech.create({
            model: "tts-1",
            voice: "nova",
            input: msg.text,
            response_format: "wav",
          });
          const buffer = Buffer.from(await response.arrayBuffer());
          msg.audio = buffer.toString("base64");
        }

        chatHistory.push(
          ...result.messages.map((m) => ({ role: "assistant", content: m.text }))
        );

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

        ws.send(JSON.stringify({
          messages: result.messages,
          uiAction: result.UIAction || null,
        }));

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
