/**
 * Generischer HTTP-Datenprovider — VORBEREITET für die echte Reise-API.
 *
 * Aktivieren, sobald Zugang/Creds da sind:
 *   1. In .env: DATA_PROVIDER=api, API_URL=..., API_KEY=... (+ ggf. API_AUTH_HEADER)
 *   2. In data/index.js die Zeile `api: apiProvider` einkommentieren.
 *   3. Unten die zwei mit "ANPASSEN" markierten Stellen an die reale API anpassen.
 *
 * Liefert dieselbe kompakte Angebots-Struktur wie der Mock (siehe normalize.js),
 * damit der Rest der App unverändert bleibt.
 */
import { normalizeHotel } from "./normalize.js";

const BASE = process.env.API_URL || "";
const KEY = process.env.API_KEY || "";
const AUTH_HEADER = process.env.API_AUTH_HEADER || "Authorization";

export async function search(args = {}) {
  if (!BASE) {
    console.warn("[data:api] API_URL nicht gesetzt — leere Ergebnisse.");
    return [];
  }

  // === ANPASSEN 1/2: Request an die echte API bauen ===
  const params = new URLSearchParams();
  if (args.to) params.set("region", args.to);
  if (args.from) params.set("departure", args.from);
  if (args.startDate) params.set("startDate", args.startDate);
  if (args.endDate) params.set("endDate", args.endDate);
  if (args.duration) params.set("duration", String(args.duration));
  if (args.adults) params.set("adults", String(args.adults));
  if (args.children) params.set("children", String(args.children));

  const headers = { Accept: "application/json" };
  if (KEY) headers[AUTH_HEADER] = KEY.startsWith("Bearer ") ? KEY : `Bearer ${KEY}`;

  let json;
  try {
    const res = await fetch(`${BASE}?${params.toString()}`, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    json = await res.json();
  } catch (e) {
    console.error("[data:api] Fehler:", e.message);
    return [];
  }

  // === ANPASSEN 2/2: Hotel-Liste aus der Antwort extrahieren ===
  // Default nimmt die traffics-artige Struktur an; bei anderer API hier den Pfad
  // setzen (und ggf. eine eigene Normalisierung statt normalizeHotel schreiben).
  const hotels =
    json?.data?.response?.hotelList || json?.hotelList || json?.hotels || json?.results || [];

  const offers = hotels.map((h) => normalizeHotel(h, args)).filter((o) => o.id && o.name);
  return offers.slice(0, args.limit || 12);
}

export const label = `api${BASE ? "" : ":unconfigured"}`;
