/**
 * Martireisen-Provider — nutzt Martireisens EIGENE Website-API:
 *   POST https://www.martireisen.at/api/packages/search
 * Diese kapselt intern den echten traffics-Connector und liefert ECHTE
 * Pauschalreisen. Vom Lara-Server erreichbar, keine Credentials nötig.
 * (Mit Martireisens Zustimmung nutzen — es ist ihre Infrastruktur.)
 *
 * Aktivieren: DATA_PROVIDER=martireisen
 * Override: MARTI_API_BASE (default https://www.martireisen.at)
 */
import https from "https";

const BASE = process.env.MARTI_API_BASE || "https://www.martireisen.at";

// POST via node https (funktioniert auf jeder Node-Version, kein globales fetch nötig).
function postJson(url, bodyObj) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(bodyObj);
    const u = new URL(url);
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Content-Length": Buffer.byteLength(data),
        },
        timeout: 15000,
      },
      (res) => {
        let chunks = "";
        res.on("data", (c) => (chunks += c));
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(chunks));
            } catch (e) {
              reject(new Error("JSON parse: " + e.message));
            }
          } else reject(new Error("HTTP " + res.statusCode));
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.write(data);
    req.end();
  });
}

// Ziel-Name → Region-Code (cityCode). Erweiterbar (Martireisen = Türkei-Fokus).
// TODO: dynamisch über die Regionen-/Autocomplete-API auflösen.
const REGIONS = {
  "türkische riviera": "reg:149",
  antalya: "reg:149",
  lara: "reg:149",
  side: "reg:149",
  alanya: "reg:149",
  belek: "reg:149",
  kemer: "reg:149",
  istanbul: "reg:147",
};
const DEFAULT_REGION = "reg:149"; // Türkische Riviera (beliebt) als Fallback

// Abflug-Stadt → IATA-Code.
const AIRPORTS = {
  wien: "VIE", graz: "GRZ", innsbruck: "INN", klagenfurt: "KLU",
  linz: "LNZ", salzburg: "SZG", berlin: "BER", münchen: "MUC", muenchen: "MUC",
};

const BOARD = {
  AI: "All Inclusive", UAI: "Ultra All Inclusive", VP: "Vollpension", FB: "Vollpension",
  HP: "Halbpension", HB: "Halbpension", BB: "Frühstück", ÜF: "Frühstück",
  OV: "Ohne Verpflegung", RO: "Ohne Verpflegung", SC: "Ohne Verpflegung",
};

function regionFor(to) {
  if (!to) return DEFAULT_REGION;
  const k = String(to).toLowerCase();
  for (const name in REGIONS) if (k.includes(name)) return REGIONS[name];
  return DEFAULT_REGION;
}
function airportFor(from) {
  if (!from) return "VIE";
  const k = String(from).toLowerCase();
  for (const name in AIRPORTS) if (k.includes(name)) return AIRPORTS[name];
  return /^[A-Z]{3}$/.test(from) ? from : "VIE";
}
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function normalize(pkg, args, currency) {
  const h = pkg?.hotel?.hotel || {};
  const room = pkg?.room || pkg?.hotel?.rooms?.[0] || {};
  const total = room?.price?.amount != null ? Number(room.price.amount) : null;
  const adults = Number(args.adults) || 2;
  const score = h?.rating?.score;
  return {
    id: pkg.packageId || h.hotelId,
    name: h.name,
    stars: h.stars ?? null,
    location: [h.city, h.country].filter(Boolean).join(", "),
    region: null,
    operator: h.operator || null,
    pricePerPerson: total ? Math.round(total / adults) : null,
    totalPrice: total,
    currency: room?.price?.currency || currency || "EUR",
    duration: Number(args.duration) || null,
    fromDate: args.startDate || null,
    toDate: args.endDate || null,
    board: BOARD[room?.board] || room?.board || null,
    rating: score != null ? Math.min(5, Number(Number(score).toFixed(1))) : null,
    image: h?.images?.[0]?.url || null,
  };
}

export async function search(args = {}) {
  const nights = Number(args.duration) || 7;
  const today = new Date().toISOString().slice(0, 10);
  // Vergangenheits-/Fehldaten abfangen -> sonst liefert die echte API 0 Treffer.
  let checkIn = args.startDate || addDays(new Date(), 30);
  if (checkIn < today) checkIn = addDays(new Date(), 30);
  let checkOut = args.endDate || addDays(checkIn, nights);
  if (checkOut <= checkIn) checkOut = addDays(checkIn, nights);

  const body = {
    cityCode: args.cityCode || regionFor(args.to),
    origin: airportFor(args.from),
    checkIn,
    checkOut,
    duration: nights,
    adults: Number(args.adults) || 2,
    children: Number(args.children) || 0,
  };

  let json;
  try {
    json = await postJson(`${BASE}/api/packages/search`, body);
  } catch (e) {
    console.error("[data:martireisen] Fehler:", e.message);
    return [];
  }

  const packages = json?.packages || [];
  let offers = packages
    .map((p) => normalize(p, args, json.currency))
    .filter((o) => o.id && o.name);

  // Sekundäre Filter (die API liefert bereits Region/Datum gefiltert).
  if (args.board) {
    const b = String(args.board).toLowerCase();
    const f = offers.filter((o) => (o.board || "").toLowerCase().includes(b));
    if (f.length) offers = f;
  }
  // Weiche Filter: fallen auf alle zurück, wenn sie 0 ergeben (nie leer wegen Über-Filterung).
  if (args.minStars) {
    const f = offers.filter((o) => (o.stars ?? 0) >= Number(args.minStars));
    if (f.length) offers = f;
  }
  if (args.maxPricePerPerson) {
    const f = offers.filter(
      (o) => o.pricePerPerson != null && o.pricePerPerson <= Number(args.maxPricePerPerson)
    );
    if (f.length) offers = f;
  }

  const sortBy = args.sortBy || "price";
  offers.sort((a, b) => {
    if (sortBy === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
    if (sortBy === "stars") return (b.stars ?? 0) - (a.stars ?? 0);
    return (a.pricePerPerson ?? Infinity) - (b.pricePerPerson ?? Infinity);
  });

  return offers.slice(0, args.limit || 12);
}

export const label = "martireisen";
