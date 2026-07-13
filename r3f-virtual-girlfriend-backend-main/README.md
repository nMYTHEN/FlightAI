# NuriReisen — Backend

KI-Reiseberater „Lara". Node.js + Express + WebSocket, OpenAI (Chat via
umschaltbarer LLM-Schicht, TTS) — antwortet dem Frontend mit dem Kontrakt
`{ messages, uiAction }`.

## Setup

`.env` anlegen (siehe `.env.example`):

```
LLM_PROVIDER=openai            # oder "anthropic"
LLM_MAX_TOKENS=4096
OPENAI_API_KEY=sk-...
OPENAI_MODEL=o4-mini
# ANTHROPIC_API_KEY / ANTHROPIC_MODEL bei LLM_PROVIDER=anthropic (+ npm i @anthropic-ai/sdk)
DATA_PROVIDER=mock             # Datenquelle (aktuell public/mock.json)
```

Start:

```
npm install
npm run dev        # nodemon, Port 25576
```

## Struktur

- `index.js` — Express + WebSocket-Server, Agent-Loop (LLM → JSON → TTS → Client),
  Session-Store pro `sessionId`.
- `llm/` — steckbare LLM-Schicht (`openai.js`, `anthropic.js`), Auswahl via `LLM_PROVIDER`.
- `data/` — steckbare Datenschicht (`mockProvider.js` + `normalize.js`), Auswahl via `DATA_PROVIDER`.
- `prompts/systemPrompt.js` — System-Prompt (Antwort-Kontrakt, UI-Aktionen, Buchungs-Handoff).

## Antwort-Kontrakt (KI → Server → Client)

Die KI liefert JSON mit `messages[]` (Text + `facialExpression` + `animation`),
optional `UIAction` (`iconGrid` | `hotelGrid` | `hotelDetail`), `Execute` (`DbQuery`),
`Done` und `Language`. Der Server vertont die Texte (OpenAI TTS) und schickt
`{ messages, uiAction }` an den Client.
