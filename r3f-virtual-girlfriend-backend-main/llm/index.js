/**
 * Steckbare LLM-Schicht. Provider per Env `LLM_PROVIDER` (default "openai").
 * Beide Adapter liefern die rohe JSON-Antwort im Kontrakt-Format
 * { messages, UIAction, Execute, Done, Language }.
 *
 *   LLM_PROVIDER=openai     (default)  · Modell via OPENAI_MODEL
 *   LLM_PROVIDER=anthropic             · Modell via ANTHROPIC_MODEL (+ @anthropic-ai/sdk)
 *   LLM_MAX_TOKENS=4096                · Obergrenze pro Antwort
 */
import * as openai from "./openai.js";
import * as anthropic from "./anthropic.js";

const providers = { openai, anthropic };

const selected = process.env.LLM_PROVIDER || "openai";
const provider = providers[selected] || openai;

if (!providers[selected]) {
  console.warn(`[llm] Unbekannter LLM_PROVIDER "${selected}" — nutze "openai".`);
}

const MAX_TOKENS = Number(process.env.LLM_MAX_TOKENS || 4096);

/**
 * Erzeugt eine Chat-Completion.
 * @param {object} p
 * @param {{role:"system",content:string}} p.system - System-Prompt
 * @param {Array<{role:string,content:string}>} p.messages - Gesprächsverlauf
 * @returns {Promise<string>} rohe JSON-Antwort (String)
 */
export function complete({ system, messages }) {
  return provider.complete({ system, messages, maxTokens: MAX_TOKENS });
}

export const activeLlm = provider.label;
