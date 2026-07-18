/**
 * Duffel Stays Adapter (Hotels/Unterkünfte). VORBEREITET.
 *
 * Aktivieren, sobald der Duffel-Test-Token da ist:
 *   .env: DATA_PROVIDER=duffel  +  DUFFEL_TOKEN=duffel_test_xxx
 *   data/index.js: `duffel: duffelProvider` einkommentieren.
 *
 * ACHTUNG: Duffel = Flüge + EINZEL-Hotels (Bausteine), KEINE Pauschalreisen.
 * Gut als echter Live-Test; für Paket-Verkauf später ein Operator-Connector.
 *
 * Duffel Stays sucht per Geo-Koordinaten. Unten eine kleine Ziel→Koordinaten-Map
 * (Demo) — später durch echtes Geocoding ersetzen.
 * Liefert die normalisierte Angebots-Struktur (wie mock/normalize).
 */
const TOKEN = process.env.DUFFEL_TOKEN || "";
const VERSION = process.env.DUFFEL_VERSION || "v2";

// Minimale Ziel → Koordinaten (Demo). TODO: echtes Geocoding (z. B. Nominatim).
const PLACES = {
  antalya: { latitude: 36.8969, longitude: 30.7133 },
  lara: { latitude: 36.8581, longitude: 30.8039 },
  mallorca: { latitude: 39.6953, longitude: 3.0176 },
  "gran canaria": { latitude: 27.9202, longitude: -15.5474 },
  teneriffa: { latitude: 28.2916, longitude: -16.6291 },
  hurghada: { latitude: 27.2579, longitude: 33.8116 },
  dubai: { latitude: 25.2048, longitude: 55.2708 },
  wien: { latitude: 48.2082, longitude: 16.3738 },
};

function coordsFor(to) {
  if (!to) return null;
  const key = String(to).toLowerCase();
  for (const k in PLACES) if (key.includes(k)) return PLACES[k];
  return null;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function normalizeDuffel(result, nights) {
  const a = result.accommodation || {};
  const total = Number(result.cheapest_rate_total_amount || 0) || null;
  return {
    id: a.id || result.id,
    name: a.name,
    stars: a.rating ? Number(a.rating) : null,
    location: [a.location?.address?.city_name, a.location?.address?.country_code]
      .filter(Boolean)
      .join(", "),
    region: null,
    operator: "Duffel",
    pricePerPerson: null,
    totalPrice: total,
    currency: result.cheapest_rate_currency || "EUR",
    duration: nights || null,
    fromDate: result.check_in_date || null,
    toDate: result.check_out_date || null,
    board: null,
    // Duffel review_score ist 0–10 → auf 0–5 normalisiert.
    rating: a.review_score != null ? Number((a.review_score / 2).toFixed(1)) : null,
    image: a.photos?.[0]?.url || null,
  };
}

export async function search(args = {}) {
  if (!TOKEN) {
    console.warn("[data:duffel] DUFFEL_TOKEN nicht gesetzt — leere Ergebnisse.");
    return [];
  }
  const coords = coordsFor(args.to);
  if (!coords) {
    console.warn(`[data:duffel] Keine Koordinaten für Ziel "${args.to}" (Geocoding fehlt).`);
    return [];
  }

  const nights = Number(args.duration) || 7;
  const checkIn = args.startDate || addDays(new Date(), 30);
  const checkOut = args.endDate || addDays(checkIn, nights);

  const guests = [];
  for (let i = 0; i < (Number(args.adults) || 2); i++) guests.push({ type: "adult" });
  for (let i = 0; i < (Number(args.children) || 0); i++) guests.push({ type: "child", age: 8 });

  const body = {
    data: {
      rooms: 1,
      guests,
      location: { radius: 20, geographic_coordinates: coords },
      check_in_date: checkIn,
      check_out_date: checkOut,
    },
  };

  let json;
  try {
    const res = await fetch("https://api.duffel.com/stays/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Duffel-Version": VERSION,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    json = await res.json();
  } catch (e) {
    console.error("[data:duffel] Fehler:", e.message);
    return [];
  }

  const results = json?.data?.results || [];
  const offers = results.map((r) => normalizeDuffel(r, nights)).filter((o) => o.id && o.name);
  return offers.slice(0, args.limit || 12);
}

export const label = `duffel${TOKEN ? "" : ":unconfigured"}`;
