/**
 * Wandelt einen rohen traffics-Hotel (mock.json / connector.traffics.de) in ein
 * kompaktes, LLM-freundliches Angebot um.
 *
 * Warum: Die rohe Antwort ist ~210 KB. Die komplett in den LLM-Kontext zu schieben
 * ist teuer und sprengt bei echten Suchen das Kontextfenster. Hier bleibt pro Hotel
 * nur, was die UI (hotelGrid/hotelDetail) und das Gespräch wirklich brauchen.
 */

/** Wählt das Angebot, das am besten zur gewünschten Dauer passt (sonst das erste/günstigste). */
function pickOffer(hotel, args = {}) {
  const offers = hotel.offerList?.length ? hotel.offerList : hotel.multiRoomOfferList || [];
  if (!offers.length) return null;
  if (args.duration) {
    const match = offers.find((o) => String(o.travelDate?.duration) === String(args.duration));
    if (match) return match;
  }
  return offers[0];
}

function boardName(offer) {
  const b = offer?.boardType;
  if (!b) return null;
  return typeof b === "string" ? b : b.name || b.code || null;
}

/** Hotelbild in hoher Auflösung (traffics liefert size=150). */
function bigImage(url) {
  return url ? url.replace(/&size=\d+/, "&size=10000") : null;
}

export function normalizeHotel(hotel, args = {}) {
  const offer = pickOffer(hotel, args);
  const ppp = offer?.personPrice || hotel.bestPricePerPerson || {};
  const total = offer?.totalPrice || hotel.totalPrice || {};
  const review = hotel.overall_rate ?? hotel.rating?.overall ?? null;

  return {
    id: hotel.code,
    name: hotel.name,
    stars: hotel.category ? parseInt(hotel.category, 10) : null,
    location: [hotel.location?.name, hotel.country?.name].filter(Boolean).join(", "),
    region: hotel.location?.region?.name || null,
    operator: hotel.tourOperator?.name || null,
    pricePerPerson: ppp.value ? Number(ppp.value) : null,
    totalPrice: total.value ? Number(total.value) : null,
    currency: ppp.currency || total.currency || "EUR",
    duration: offer?.travelDate?.duration ? Number(offer.travelDate.duration) : null,
    fromDate: offer?.travelDate?.fromDate || null,
    toDate: offer?.travelDate?.toDate || null,
    board: boardName(offer),
    // Gäste-Bewertung (holidaycheck-Skala ~0–6, roh x10 → /10)
    rating: review != null ? Number((review / 10).toFixed(1)) : null,
    image: bigImage(hotel.mediaData?.pictureUrl),
  };
}
