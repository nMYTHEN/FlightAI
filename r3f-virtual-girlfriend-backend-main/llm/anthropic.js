/**
 * Anthropic-(Claude-)Chat-Adapter. Gleiches Kontrakt-Format wie der OpenAI-Adapter:
 * liefert die rohe JSON-Antwort als String.
 *
 * Das SDK wird LAZY geladen (dynamic import), damit der Default-Betrieb (OpenAI)
 * ohne installiertes @anthropic-ai/sdk läuft. Zum Aktivieren:
 *   npm i @anthropic-ai/sdk   und   LLM_PROVIDER=anthropic + ANTHROPIC_API_KEY setzen.
 */
const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

let client;
async function getClient() {
  if (!client) {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

/** Anthropic verlangt strikt alternierende Rollen — aufeinanderfolgende gleiche zusammenfassen. */
function coalesce(messages) {
  const out = [];
  for (const m of messages) {
    const last = out[out.length - 1];
    if (last && last.role === m.role) {
      last.content += "\n" + m.content;
    } else {
      out.push({ role: m.role, content: m.content });
    }
  }
  return out;
}

export async function complete({ system, messages, maxTokens }) {
  const anthropic = await getClient();
  const msgs = coalesce(messages);
  // Prefill "{" erzwingt reines JSON ohne Vor-/Nachtext.
  msgs.push({ role: "assistant", content: "{" });

  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens || 4096,
    system: system.content,
    messages: msgs,
  });

  const text = res.content.map((b) => b.text || "").join("");
  return "{" + text;
}

export const label = `anthropic:${MODEL}`;
