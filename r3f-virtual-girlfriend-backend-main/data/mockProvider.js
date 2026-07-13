/**
 * Mock-Datenprovider: nutzt die eingecheckte traffics-Antwort (public/mock.json).
 * Kostenlos, ohne Signup, mit echter Pauschalreise-Struktur — ideal, um den Flow
 * jetzt zu bauen. Filtert/normalisiert, sodass "Suche" sich real anfühlt.
 */
import { readFileSync } from "fs";
import { normalizeHotel } from "./normalize.js";

// JSON via fs laden (statt Import-Attribut) -> läuft auf jeder Node-Version.
const mockdata = JSON.parse(
  readFileSync(new URL("../public/mock.json", import.meta.url), "utf-8")
);

const DEFAULT_LIMIT = 12;

export async function search(args = {}) {
  const hotels = mockdata?.data?.response?.hotelList || [];
  let offers = hotels.map((h) => normalizeHotel(h, args)).filter((o) => o.id && o.name);

  // Ziel-Filter (case-insensitive über Ort/Region/Land). Fällt auf alle zurück,
  // damit die Demo nie leer ist (mock.json ist eine fixe Antalya-Suche).
  if (args.to) {
    const needle = String(args.to).toLowerCase();
    const filtered = offers.filter((o) =>
      [o.location, o.region].filter(Boolean).join(" ").toLowerCase().includes(needle)
    );
    if (filtered.length) offers = filtered;
  }

  // Optionale Preisgrenze pro Person.
  if (args.maxPricePerPerson) {
    offers = offers.filter(
      (o) => o.pricePerPerson != null && o.pricePerPerson <= Number(args.maxPricePerPerson)
    );
  }

  offers.sort((a, b) => (a.pricePerPerson ?? Infinity) - (b.pricePerPerson ?? Infinity));

  return offers.slice(0, args.limit || DEFAULT_LIMIT);
}
