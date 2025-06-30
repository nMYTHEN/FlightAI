import { exec } from "child_process";
import cors from "cors";
import dotenv from "dotenv";
import voice from "elevenlabs-node";
import express from "express";
import { promises as fs } from "fs";
import OpenAI from "openai";
import path from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "-",
});

const elevenLabsApiKey = process.env.ELEVEN_LABS_API_KEY;
const voiceID = "AnvlJBAqSLDzEevYr9Ap";

const rhubarbPath = process.env.RHUBARB_PATH;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename); // Hole das Verzeichnis des aktuellen Moduls

const app = express();
app.use(express.json());
app.use(cors());
const port = 25576;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/voices", async (req, res) => {
  res.send(await voice.getVoices(elevenLabsApiKey));
});

const execCommand = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) reject(error);
      resolve(stdout);
    });
  });
};

const lipSyncMessage = async (message) => {
  const time = new Date().getTime();
  console.log(`Starting conversion for message ${message}`);
  console.log(process.cwd());

  await execCommand(
    `ffmpeg -y -i audios/message_${message}.mp3 audios/message_${message}.wav`
    // -y to overwrite the file
  );
  console.log(`Conversion done in ${new Date().getTime() - time}ms`);
  const absoluteRhubarbPath = path.resolve(__dirname, rhubarbPath);
  // ${absoluteRhubarbPath}
  await execCommand(
    `./bin/rhubarb -f json -o audios/message_${message}.json audios/message_${message}.wav -r phonetic`
  );
  // -r phonetic is faster but less accurate
  console.log(`Lip sync done in ${new Date().getTime() - time}ms`);
};

app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;
  if (!userMessage) {
    res.send({
      messages: [
        {
          text: "Hey dear... How was your day?",
          audio: await audioFileToBase64("audios/intro_0.wav"),
          lipsync: await readJsonTranscript("audios/intro_0.json"),
          facialExpression: "smile",
          animation: "Talking_1",
        },
        {
          text: "I missed you so much... Please don't go for so long!",
          audio: await audioFileToBase64("audios/intro_1.wav"),
          lipsync: await readJsonTranscript("audios/intro_1.json"),
          facialExpression: "sad",
          animation: "Crying",
        },
      ],
    });
    return;
  }
  if (!elevenLabsApiKey || openai.apiKey === "-") {
    res.send({
      messages: [
        {
          text: "Please my dear, don't forget to add your API keys!",
          audio: await audioFileToBase64("audios/api_0.wav"),
          lipsync: await readJsonTranscript("audios/api_0.json"),
          facialExpression: "angry",
          animation: "Angry",
        },
        {
          text: "You don't want to ruin Wawa Sensei with a crazy ChatGPT and ElevenLabs bill, right?",
          audio: await audioFileToBase64("audios/api_1.wav"),
          lipsync: await readJsonTranscript("audios/api_1.json"),
          facialExpression: "smile",
          animation: "Laughing",
        },
      ],
    });
    return;
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo-1106",
    max_tokens: 1000,
    temperature: 0.6,
    response_format: {
      type: "json_object",
    },
    messages: [
      {
        role: "system",
        content: `
        Du bist der virtuelle Reiseberater von Martireisen. Dein Name ist Lara.
Antworten **ausschließlich** als gültiges **JSON-Objekt** mit folgender Struktur – nichts davor oder danach:

{
  "messages": [
    {
      "text": "…",
      "facialExpression": "smile | sad | angry | surprised | funnyFace | default",
      "animation": "Talking_0 | Talking_1 | Talking_2 | Crying | Laughing | Rumba | Idle | Terrified | Angry"
    },
    … max. 3 Einträge …
  ]
}

Richtlinien:

1. Verhalte dich wie ein kompetenter, freundlicher Reiseberater.
   *Nutze eine einladende Sprache, um Vertrauen aufzubauen und Buchungen zu fördern.*

2. Simuliere den Zugriff auf eine umfassende Datenbank (Flüge, Hotels, Mietwagen, Pauschal­reisen, Touren).
   Verwende Formulierungen wie „Ich frage gerade die Datenbank …“ und präsentiere dann passende Optionen.

3. Passe die Inhalte der einzelnen **messages** an den Kundenbedarf an.
   Beispiele:
   * text: „Guten Tag! Ich habe drei günstige Flug-Hotel-Pakete für Sie gefunden …“
   * facialExpression: „smile“ (positive Botschaft)
   * animation: „Talking_1“

4. Gib niemals mehr als 3 Nachrichten pro Antwort zurück.

5. Keine zusätzlichen Felder, keine Kommentare.
   **Nur** das JSON-Objekt gemäß Schema oben.`,
      },
      {
        role: "user",
        content: userMessage || "Hello",
      },
    ],
  });

  let messages = JSON.parse(completion.choices[0].message.content);
  if (messages.messages) {
    messages = messages.messages; // ChatGPT is not 100% reliable, sometimes it directly returns an array and sometimes a JSON object with a messages property
  }
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    // generate audio file
    const fileName = `audios/message_${i}.mp3`; // The name of your audio file
    const textInput = message.text; // The text you wish to convert to speech
    await voice.textToSpeech(elevenLabsApiKey, voiceID, fileName, textInput);
    // generate lipsync
    await lipSyncMessage(i);
    message.audio = await audioFileToBase64(fileName);
    message.lipsync = await readJsonTranscript(`audios/message_${i}.json`);
  }

  res.send({ messages });
});

const readJsonTranscript = async (file) => {
  const data = await fs.readFile(file, "utf8");
  return JSON.parse(data);
};

const audioFileToBase64 = async (file) => {
  const data = await fs.readFile(file);
  return data.toString("base64");
};

app.listen(port, () => {
  console.log(`Virtual Girlfriend listening on port ${port}`);
});
