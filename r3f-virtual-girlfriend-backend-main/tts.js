/**
 * TTS-Helper (OpenAI). Modell/Stimme/Tempo per Env konfigurierbar.
 *   TTS_MODEL  (default tts-1; "tts-1-hd" = höhere Qualität, etwas teurer/langsamer)
 *   TTS_VOICE  (default nova; weiblich, gut für DE)
 *   TTS_SPEED  (default 1.0)
 * Liefert base64-WAV.
 */
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "-" });

const MODEL = process.env.TTS_MODEL || "tts-1-hd";
const VOICE = process.env.TTS_VOICE || "nova";
const SPEED = Number(process.env.TTS_SPEED || 1);

export async function speak(text) {
  const res = await openai.audio.speech.create({
    model: MODEL,
    voice: VOICE,
    input: text,
    response_format: "wav",
    speed: SPEED,
  });
  return Buffer.from(await res.arrayBuffer()).toString("base64");
}

export const ttsLabel = `${MODEL}/${VOICE}`;
