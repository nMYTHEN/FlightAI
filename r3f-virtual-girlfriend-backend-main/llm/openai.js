/**
 * OpenAI-Chat-Adapter. Liefert die rohe JSON-Antwort (String) im vereinbarten
 * Format { messages, UIAction, Execute, Done, Language }.
 *
 * TTS läuft separat (bleibt OpenAI) — dieser Adapter macht nur die Chat-Completion.
 */
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "-" });

const MODEL = process.env.OPENAI_MODEL || "o4-mini";

export async function complete({ system, messages, maxTokens }) {
  const completion = await openai.chat.completions.create({
    model: MODEL,
    max_completion_tokens: maxTokens,
    response_format: { type: "json_object" },
    messages: [system, ...messages],
  });
  return completion.choices[0].message.content;
}

export const label = `openai:${MODEL}`;
