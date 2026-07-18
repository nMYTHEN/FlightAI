/* HotelDetail.jsx */
import { useI18n } from "../i18n";

const CAT = {
  hotel: ["Hotel", "Hotel"],
  location: ["Lage", "Location"],
  service: ["Service", "Service"],
  food: ["Essen", "Food"],
  room: ["Zimmer", "Room"],
  leisure: ["Freizeit", "Leisure"],
  sport: ["Sport", "Sports"],
  wellness: ["Wellness", "Wellness"],
  pool: ["Pool", "Pool"],
};

export const HotelDetail = ({ hotel, onBack, onBook }) => {
  const { t, lang } = useI18n();
  const catLabel = (k) => (CAT[k] ? CAT[k][lang === "en" ? 1 : 0] : k);
  const stars = hotel.stars ? "★".repeat(Math.max(0, Math.min(5, hotel.stars))) : null;
  const cats = Array.isArray(hotel.ratingCategories) ? hotel.ratingCategories : [];

  return (
    <div className="fixed inset-0 z-20 flex items-stretch md:items-center justify-center md:justify-end md:pr-[4%] backdrop-blur-sm overflow-auto">
      <div className="bg-white w-full md:w-11/12 md:max-w-md md:rounded-2xl shadow-2xl overflow-hidden my-auto max-h-full flex flex-col">
        {/* Hero */}
        <div className="relative shrink-0">
          <img src={hotel.image} alt={hotel.name} className="w-full h-52 object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <button
            onClick={onBack}
            className="absolute top-3 left-3 bg-white/90 hover:bg-white text-brand-800 rounded-full w-9 h-9 flex items-center justify-center shadow"
            aria-label="back"
          >
            ←
          </button>
          <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
            {stars && <div className="text-amber-300 text-sm leading-none">{stars}</div>}
            <h2 className="text-xl font-bold leading-tight">{hotel.name}</h2>
            <p className="text-sm text-white/90">{hotel.location}</p>
          </div>
        </div>

        {/* Body (scrollable) */}
        <div className="p-4 overflow-y-auto flex flex-col gap-3">
          {/* Trust row */}
          <div className="flex flex-wrap items-center gap-2">
            {hotel.rating != null && (
              <span className="inline-flex items-center gap-1 bg-brand-50 text-brand-800 font-semibold rounded-full px-3 py-1 text-sm">
                ★ {hotel.rating}
              </span>
            )}
            {hotel.recommendationPct != null && (
              <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 font-semibold rounded-full px-3 py-1 text-sm">
                {hotel.recommendationPct}% {t("detail.recommend")}
              </span>
            )}
            {hotel.reviewCount != null && (
              <span className="text-xs text-gray-500">
                {hotel.reviewCount} {t("detail.reviews")}
              </span>
            )}
          </div>

          {/* Chips */}
          <div className="flex flex-wrap gap-2 text-xs">
            {hotel.operator && (
              <span className="bg-gray-100 text-gray-700 rounded-md px-2 py-1">
                {t("detail.operator")}: {hotel.operator}
              </span>
            )}
            {hotel.board && (
              <span className="bg-gray-100 text-gray-700 rounded-md px-2 py-1">{hotel.board}</span>
            )}
            {hotel.duration && (
              <span className="bg-gray-100 text-gray-700 rounded-md px-2 py-1">
                {hotel.duration} {t("hotel.days")}
              </span>
            )}
          </div>

          {/* Rating categories */}
          {cats.length > 0 && (
            <div className="mt-1">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                {t("detail.ratingsTitle")}
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {cats.map((c) => (
                  <div key={c.key} className="grid grid-cols-[5.5rem_1fr_2rem] items-center gap-2">
                    <span className="text-xs text-gray-600">{catLabel(c.key)}</span>
                    <span className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <span
                        className="block h-full bg-brand-500 rounded-full"
                        style={{ width: `${Math.min(100, (Number(c.score) / 6) * 100)}%` }}
                      />
                    </span>
                    <span className="text-xs text-gray-500 tabular-nums text-right">
                      {Number(c.score).toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {hotel.description && (
            <p className="text-sm text-gray-700 leading-relaxed">{hotel.description}</p>
          )}
          {hotel.tags?.length > 0 && (
            <div className="text-sm text-gray-700">{hotel.tags.join(" · ")}</div>
          )}
        </div>

        {/* Footer CTA (sticky) */}
        <div className="shrink-0 border-t border-gray-100 p-4 flex items-center justify-between gap-3">
          <div className="leading-tight">
            <div className="text-lg font-bold text-brand-800">
              {hotel.price} € <span className="text-xs font-normal text-gray-500">{t("detail.perPerson")}</span>
            </div>
            {hotel.totalPrice && (
              <div className="text-xs text-gray-500">
                {hotel.totalPrice} € {t("detail.total")}
              </div>
            )}
          </div>
          <button
            onClick={() => onBook(hotel.id)}
            className="bg-brand-600 text-white px-5 py-3 rounded-xl shadow hover:bg-brand-700 font-semibold"
          >
            {t("hotel.request")}
          </button>
        </div>
      </div>
    </div>
  );
};
