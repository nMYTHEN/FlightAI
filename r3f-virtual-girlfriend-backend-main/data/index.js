/**
 * Steckbare Datenschicht. Wählt den Provider über die Env `DATA_PROVIDER`.
 * Alle Provider liefern dieselbe kompakte Angebots-Struktur (siehe normalize.js),
 * sodass ein Wechsel (mock -> bistro/duffel/traffics) ein Ein-Zeilen-Change ist.
 *
 * Verfügbar:
 *   - "mock"  (Standard): public/mock.json, kostenlos, echte Pauschalreise-Struktur.
 *
 * Geplant (Adapter mit gleicher `search(args)`-Signatur ergänzen):
 *   - "bistro":   Traveltainment/Amadeus Bistro Portal — echter Pauschalreise-Kanal (Produktion).
 *   - "traffics": connector.traffics.de (falls über Martireisen vorhanden).
 *   - "duffel":   duffel.com — Flüge + Stays, Test-Modus gratis (ACHTUNG: keine Pauschalreisen).
 */
import * as mockProvider from "./mockProvider.js";
import * as apiProvider from "./apiProvider.js";
import * as duffelProvider from "./duffelProvider.js";
import * as martireisenProvider from "./martireisenProvider.js";

const providers = {
  mock: mockProvider,
  martireisen: martireisenProvider, // Martireisens eigene /api/packages/search — ECHTE Pauschalreisen
  api: apiProvider, // generischer HTTP-Provider (API_URL/API_KEY)
  duffel: duffelProvider, // Duffel Stays (DUFFEL_TOKEN) — Bausteine, keine Pauschalreisen
};

const selected = process.env.DATA_PROVIDER || "mock";
const provider = providers[selected] || mockProvider;

if (!providers[selected]) {
  console.warn(`[data] Unbekannter DATA_PROVIDER "${selected}" — nutze "mock".`);
}

/**
 * Sucht Reiseangebote.
 * @param {object} args - { to, from, startDate, endDate, duration, adults, children, maxPricePerPerson, limit }
 * @returns {Promise<Array>} kompakte, normalisierte Angebote
 */
export function searchOffers(args = {}) {
  return provider.search(args);
}

export const activeProvider = selected;
