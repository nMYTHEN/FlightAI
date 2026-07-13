# FlightAI / Lara — Umsetzungsplan

**Stand:** 2026-07-13 · **Status:** Entwurf zur Freigabe · **Vorgehen:** Plan zuerst, dann Code

Ziel: Umbau vom „Virtual-Girlfriend"-Fork zu einem seriösen, mehrsprachigen, mobilen
Reisebuchungs-Assistenten. Strategische Leitplanke aus dem Marktbericht:
**Beraterin mit menschlicher Übergabe, kein autonomer Buchungsroboter.**

## Getroffene Entscheidungen

| Thema | Entscheidung |
|---|---|
| KI-Modell | **Provider-Abstraktion** — Claude (Sonnet 5 / Opus 4.8) **und** OpenAI umschaltbar |
| TTS/Stimme | **OpenAI tts-1 / nova bleibt** (vorerst) |
| Rebrand | **Vollständige** Umbenennung → neues Branding (nicht Martireisen); „Lara" bleibt Avatar-Name |
| Reihenfolge | Detailplan zuerst (dieses Dokument), dann Umsetzung |
| Kosten | **Muss billig bleiben** — günstige Default-Modelle, Token-Caps, TTS ggf. cachen/optional |
| Datenquelle | **Offen** (Traffics vs. Alternative) → Datenschicht pluggable halten |

## Geschäftsmodell (Leitplanke für alle Design-Entscheidungen)

**„Instant-KI-Angebot → menschliche Bestätigung → Kunde bucht."** Lara bucht **nie** selbst.
Sie sammelt Wünsche (Ziel, Datum, Personen, Filter), erstellt ein **ungefähres Angebot** und
**übergibt an einen Mitarbeiter**: *„Ich habe deine Wünsche weitergeleitet — ein Mitarbeiter
prüft das und meldet sich mit den besprochenen Alternativen."* Kein Kaufzwang, mit Nachbesprechung.
Das löst das Vertrauensproblem (nur 2 % lassen KI selbst buchen) statt dagegen anzurennen.

**Zwei Nutzungskontexte:**
1. **In-Filiale-Kiosk** — Touch-Tablets/Monitore/TVs; Kunde „bestellt" per Touch/Sprache,
   Mitarbeiter macht fertig. Handoff ist hier physisch & sofort (stärkster Vertrauensanker).
2. **Online** (Web/Mobile) — gleicher Flow, Handoff per Rückruf/E-Mail.

**Struktur:** Eigenständige Tochterfirma (von Martireisen) als **Tech-/Lead-Gen-Layer**;
Martireisen bleibt lizenzierter Reiseveranstalter/-verkäufer → keine eigene Veranstalter-Lizenz
nötig. (Rechts-/Steuerdetails mit Fachberatung klären — nicht Teil dieses Plans.)

## Prinzipien für den ganzen Umbau

1. **WebSocket-Kontrakt bleibt stabil:** Frontend sendet `{ message }`, Backend antwortet
   `{ messages, uiAction }` / `{ error }`. Das interne KI-Antwortobjekt
   (`messages`, `UIAction`, `Execute`, `Done`, `Language`) ist die Schnittstelle — bei
   Änderungen Frontend + System-Prompt synchron halten.
2. **Jede Phase ist eigenständig lauffähig & testbar** (kein „big bang").
3. **Feature-Branch pro Phase**, Rebase auf `main`, kleine Commits.
4. **DSGVO by design:** keine PII in Logs/URLs, Datenfluss zu LLM/TTS dokumentiert.

---

## Phase 0 — Guardrails & Aufräumen (Basis)  · Aufwand: S

Voraussetzung für alles Weitere.

- [ ] Feature-Branch-Strategie festlegen; `main` schützen.
- [ ] `.env.example` in beiden Projekten vollständig & korrekt (OpenAI, Anthropic, Ports, `VITE_API_URL`).
- [ ] **Toten Ballast entfernen:**
  - Backend `bin/` (Rhubarb-Binaries + Sphinx-Modelle) — ungenutzt seit wawa-lipsync.
  - Verwaiste `audios/*.wav|mp3|json`, `public/input.json`, `.DS_Store`.
  - Ungenutzte Deps prüfen: `ffmpeg`, `fs` (Security-Dummy), ggf. `elevenlabs-node` (da OpenAI-TTS bleibt → vorerst behalten, aber markieren).
- [ ] `.gitignore` härten (`.env`, `.DS_Store`, `node_modules`, Audio-Artefakte).
- [ ] README beider Projekte auf FlightAI umschreiben (Setup, Ports 25575/25576, Start).

**Ergebnis:** Sauberes, dokumentiertes Repo als Startbasis.

---

## Phase 1 — Vollständiges Rebranding & Rename  · Aufwand: M

Beseitigt die „Girlfriend"-Herkunft (Marken-/Wahrnehmungsrisiko lt. Bericht).

- [ ] Ordner umbenennen via `git mv` (Historie erhalten):
  - `r3f-virtual-girlfriend-backend-main` → `backend`
  - `r3f-virtual-girlfriend-frontend-main` → `frontend`
- [ ] Identifier/Metadaten:
  - `package.json` name/description/author (aktuell „Wawa SENSEI", „virtual girlfriend app").
  - Log-Strings (`index.js`: „Virtual Girlfriend listening on port…").
  - Auto-generierte Kommentare in `Avatar.jsx` (gltfjsx-Header) belassen ist ok, aber Modell-Dateinamen dokumentieren.
- [ ] **UI-Farbwelt** weg von Pink (`bg-pink-*` in `UI.jsx`) → Martireisen-Branding-Tokens
  (Tailwind-Theme erweitern: Primär/Akzent/Neutral). Zentrale Farbdefinition statt hartcodiert.
- [ ] Avatar-Auftritt seriös: Outfit/Haltung/Ausdruck prüfen; `facialExpressions.crazy` &
  überzogene Gesten aus dem Beratungskontext entfernen oder entschärfen.
- [ ] Favicon/Title/Meta auf FlightAI.

**Risiko:** Rename bricht Importpfade & Deploy (`pm2.command`, evtl. Reverse-Proxy auf
`flightai.nuriservices.at`). → Pfade zentral prüfen, Deploy-Skript anpassen, einmal
vollständig durchstarten.

---

## Phase 2 — LLM-Provider-Abstraktion (Claude + OpenAI)  · Aufwand: M–L

Kern der KI-Modernisierung. Umschaltbar per Env, gleicher Antwort-Kontrakt.

> **Status 2026-07-14: Grundgerüst umgesetzt.** `llm/` mit `openai.js` (json_object) +
> `anthropic.js` (lazy SDK, JSON-Prefill), Auswahl via `LLM_PROVIDER`, `LLM_MAX_TOKENS`
> statt 100000, Provider im Startlog, `.env.example` dokumentiert. Default bleibt `openai:o4-mini`
> (kein Verhaltensänderung/kein Deploy-Risiko). Offen: Claude echt testen, ggf. Tool-Use statt Prefill.

- [ ] Backend-Modul `llm/` mit einheitlichem Interface:
  ```
  createCompletion({ system, messages }) -> { messages, UIAction, Execute, Done, Language }
  ```
- [ ] Adapter `llm/openai.js` (bestehende Logik kapseln) und `llm/anthropic.js` (`@anthropic-ai/sdk`).
- [ ] **Structured Outputs statt JSON-im-JSON:**
  - Claude: **Tool-Use** mit definiertem Schema (robusteste Variante, spart Retry-Parsing).
  - OpenAI: `response_format` / structured outputs beibehalten.
  - Gemeinsames JSON-Schema als Single Source of Truth (`llm/schema.js`).
- [ ] Provider-Wahl über Env (`LLM_PROVIDER=anthropic|openai`), Modell-ID konfigurierbar.
- [ ] **Kosten-Default:** günstiges Modell als Standard (z. B. Haiku-Klasse / OpenAI-mini-Klasse) —
  Slot-Filling + Grid-Auswahl braucht kein Frontier-Modell. `max_completion_tokens` von 100 000
  auf realistischen Wert (z. B. ~1500) capen. Frontier-Modell nur, wenn Qualität es erzwingt.
- [ ] System-Prompt (`prompts/systemPrompt.js`) provider-neutral halten; ggf. leichte
  Varianten pro Adapter.
- [ ] Vergleichsmodus / Logging: Latenz & Tokenverbrauch pro Provider messbar machen.

**Hinweis:** Anthropic-Integration nach aktueller SDK/Modell-Referenz umsetzen
(`/claude-api`-Skill vor der Implementierung konsultieren — Modell-IDs, Tool-Use, Caching).

---

## Phase 3 — AI-Handling & Robustheit  · Aufwand: M

- [ ] **Session-Persistenz:** `chatHistory` überlebt Reconnect (Report-Schwäche).
  Ansatz: Session-ID vom Client, serverseitiger Store (in-memory Map → später Redis/DB).
- [ ] Loop/Retry härten: klarere Fehlerpfade, Timeouts, Backoff; kein stiller Abbruch.
- [ ] **TTS-Streaming pro Satz** → gefühlte Latenz runter (erste Nachricht spielt, während
  Rest generiert). Base64-WAV-Größe im Blick behalten.
- [ ] `max_completion_tokens: 100000` überprüfen/senken (aktuell auffällig hoch).
- [ ] `Execute: DbQuery` von Mock auf echte Anbindung vorbereiten (Interface, s. Phase 7).

---

## Phase 3b — Spracheingabe (STT)  · Aufwand: S–M

Input zweigeteilt: **Audio ODER Text** (tippen wie im Chat).

- [ ] Mikrofon-Aufnahme im Frontend (Web Audio / MediaRecorder), Push-to-talk-Button.
- [ ] STT über günstigen Dienst (z. B. Whisper-Klasse) → Text → gleicher `{ message }`-Flow.
- [ ] Kiosk-Realität beachten: Filiale ist ggf. laut → **Text/Touch bleibt primär, Sprache optional**.
- [ ] DSGVO: Einwilligung vor Audioaufnahme; Audio nicht dauerhaft speichern.

## Phase 4 — Internationalisierung (i18n)  · Aufwand: M

- [ ] `react-i18next` + Sprach-Detection (Browser, dann Override).
- [ ] Alle UI-Strings extrahieren (aktuell hartcodiert: „Senden", „Lara denkt…",
  „Schreib eine Nachricht…", „Jetzt buchen", „Zurück", Ladezustände).
- [ ] Start-Locales: **DE (AT-Ton)**, EN; Struktur für weitere.
- [ ] KI-`Language`-Feld an UI-Sprache koppeln: Antwortsprache = gewählte Sprache;
  System-Prompt entsprechend instruieren.
- [ ] Datums-/Zahlen-/Währungsformatierung lokalisieren (Preise, Reisedaten).

---

## Phase 5 — Mobile-First / Responsive  · Aufwand: M

**Priorität: Mobile-first.** Erst geht die Idee online live und muss sich beweisen — der
Filiale-Kiosk kommt *danach* (siehe „Später: Kiosk"). Nichts in der Filiale ändern, bevor
das Online-Konzept validiert ist.
Aktuelle Overlays/Grids sind desktop-maus-lastig (`UI.jsx`, `HotelGrid`, `HotelDetail`, `IconGrid`).

- [ ] Layout mobile-first neu: Eingabeleiste, Overlays, Grids auf schmalen Viewports.
- [ ] Touch-Targets ≥ 44px, `env(safe-area-inset-*)`, kein horizontales Scrollen.
- [ ] Overlays als Bottom-Sheet auf Mobile (statt zentriertes Modal), Scroll-Handling.
- [ ] R3F-Canvas: Performance/Auflösung auf Mobilgeräten (DPR-Cap), Zoom-Verhalten.
- [ ] Test-Matrix: iOS Safari, Android Chrome; Portrait/Landscape.

### Später: Kiosk (erst nach Online-Beweis)  · Aufwand: M
- [ ] Kiosk-Modus: Vollbild, Attract-/Idle-Screen, Session-Reset zwischen Kunden, Landscape.
- [ ] Große Touch-Targets für Filiale-Terminals; das Grid-Konzept passt bereits ideal.

---

## Phase 6 — Avatar & Kamera-„Animationen"  · Aufwand: M

- [ ] **Kamera-Offset bei Overlays:** Wenn `currentUi` gesetzt ist (iconGrid/hotelGrid/
  hotelDetail), Kamera/Avatar per Lerp zur Seite (Avatar links, Grid mittig); beim
  Schließen zurück zur Mitte. Umsetzung über Kamera-Target/Position-Lerp im
  R3F-`useFrame` (bzw. Experience-Komponente), gesteuert durch `currentUi`-State aus `useChat`.
- [ ] Sanftere Animations-Übergänge (`fadeIn/fadeOut`-Tuning), erweitertes Idle-/Gesten-Set.
- [ ] Lipsync-Feintuning (wawa-lipsync: Viseme-Glättung, Vowel/Consonant-Speeds).
- [ ] **Stilisierter Look** statt Fotorealismus (Uncanny-Valley-Empfehlung) — Material/
  Shading/Model-Entscheidung; ggf. alternatives GLB.
- [ ] `reduced-motion` respektieren (Kamerafahrten/Blink dämpfen).

---

## Phase 7 — Weitere Features (Strategie aus Bericht)  · Aufwand: L

- [ ] **Menschliche Übergabe:** „Mit echter Beraterin sprechen" (Kontaktformular/
  Rückruf/Chat-Handoff). Vertrauens-USP, kein Nachgedanke.
- [ ] **`BUCHEN` = unverbindliche Anfrage** (kein Auto-Book): erzeugt Lead + E-Mail an
  Reisebüro, klare Kommunikation an Kunden. (Prompt deutet das an — echt implementieren.)
- [x] **Pluggable Datenschicht gebaut** (`data/`, Provider per `DATA_PROVIDER`), Mock aktiv,
  DbQuery-Payload ~44× kleiner. Adapter-Slots für echte Quellen offen.
- [ ] **Echte Datenanbindung** — Realität (Stand 2026-07-13):
  - **Traffics: gibt es NICHT mehr.** `public/mock.json` = nur historische Sample-Daten.
  - **„Bistro" = altes Desktop-Programm, KEINE API** → kein Integrationsweg.
  - **Neue Quelle:** vorhanden, aber User hat keinen direkten Zugriff / kennt sie noch nicht.
    → BLOCKER: erst identifizieren + Zugang/Credentials/Doku beschaffen, dann Adapter bauen.
  - **Public-API-Fallback (Self-Serve):** Duffel (Test gratis) / RapidAPI-Hotels / TripAdvisor
    (5k Calls gratis) — alles **Bausteine, keine Pauschalreisen**, nur für Demo/Anreicherung.
  - **Amadeus Self-Service** — tot (Portal-Abschaltung 17.07.2026).
- [ ] **Soft-Buchung → Mitarbeiter-Bestätigung:** Angebot als „vorgemerkte" Buchung an den
  Mitarbeiter; er bestätigt final (ein Klick) in seinem System. FlightAI selbst wickelt **keine
  Zahlung** ab.
- [ ] **Inkasso-Metadaten mitführen:** pro Angebot/Veranstalter kennzeichnen, ob
  **Agenturinkasso** (Reisebüro zieht ein) oder **Veranstalterinkasso** (Veranstalter zieht
  direkt ein) gilt, plus Agentur-/Veranstalterdaten — damit der Mitarbeiter/das Backoffice die
  Zahlung korrekt routet. Zahlungsabwicklung bleibt im bestehenden System (kein PCI-Scope für uns).
- [ ] Mini-Analytics / A-B: Conversion & Warenkorbwert gegen klassische Suche messen
  (Bericht: Reise-Traffic ~2× Warenkorb — validieren).
- [ ] DSGVO: Einwilligung für Sprache/Chat-Verarbeitung, Datenschutzhinweis, Datenfluss-Doku.

---

## Priorisierung & empfohlene Reihenfolge

| # | Phase | Aufwand | Abhängig von | Priorität |
|---|---|---|---|---|
| 0 | Guardrails & Aufräumen | S | – | Muss zuerst |
| 1 | Rebranding & Rename | M | 0 | Hoch (Markenrisiko) |
| 2 | LLM-Provider-Abstraktion | M–L | 0 | Hoch |
| 3 | AI-Handling & Robustheit | M | 2 | Hoch |
| 4 | i18n | M | 1 | Mittel (DACH-Sprachqualität) |
| 5 | Mobile-First | M | 1 | Mittel |
| 6 | Avatar & Kamera | M | 1 | Mittel |
| 7 | Weitere Features | L | 2,3 | Nach Fundament |

**Empfohlene Wellen:**
1. **Fundament:** 0 → 1 → 2 → 3
2. **Kundenerlebnis:** 4 → 5 → 6 (parallelisierbar)
3. **Produktreife:** 7 (echte Daten, Handoff, Buchungsanfrage, Analytics)

## Offene Punkte / vor Start zu klären

- **Firmenname final:** „NuriReisen" (in AT scheinbar frei) — via Firmenbuch/WKO/Markenamt +
  Domain prüfen. „Lara" NUR als Avatar-Name, nicht als Firma (SEO-Kollision mit Badeort Lara/Antalya).
- Branding-Assets (Logo, Farb-Hex, Schrift) für neuen Namen; Avatar-Outfit rebranden (aktuell
  Ready-Player-Me-Platzhalter-Shirt).
- Datenquelle offen (Traffics vs. Alternative) — Anbindung erst nach Entscheidung (Phase 7).
- Anthropic-API-Key & günstige Default-Modell-Stufe pro Provider.
- Kiosk-Hardware in der Filiale (welche Geräte/Auflösung/Orientierung)?
- Zielsprachen über DE/EN hinaus?

## Deploy (bekannt)

- Live am eigenen Server unter `flightai.nuriservices.at`; Backend-WS via Reverse-Proxy `/apiv2/`.
- Release = **`build` + `pm2 restart`**. Beim Ordner-Rename (Phase 1) pm2-Prozessnamen/Pfade
  und Proxy-Config mitziehen und einmal vollständig neu deployen.
