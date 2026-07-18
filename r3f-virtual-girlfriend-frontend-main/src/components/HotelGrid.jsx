/* HotelGrid.jsx */
import { useI18n } from "../i18n";

export const HotelGrid = ({ title, hotels, onSelect }) => {
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center md:justify-end md:pr-[4%] backdrop-blur-sm overflow-auto">
      <div className="bg-white/90 rounded-2xl p-6 w-11/12 max-w-4xl md:max-w-2xl">
        <h2 className="font-bold text-xl mb-4 text-center">{title || t("hotel.reco")}</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {hotels?.map((hotel) => (
            <button
              key={hotel.id}
              onClick={() => onSelect(hotel.id)}
              className="bg-white rounded-xl shadow-md overflow-hidden hover:scale-[1.02] transition pointer-events-auto text-left"
            >
              <div className="relative">
                <img
                  src={hotel.image}
                  alt={hotel.name}
                  className="w-full h-32 object-cover"
                />
                {hotel.recommendationPct != null && (
                  <span className="absolute top-2 left-2 bg-green-600 text-white text-[11px] font-semibold rounded-full px-2 py-0.5 shadow">
                    {hotel.recommendationPct}% ✓
                  </span>
                )}
              </div>
              <div className="p-3">
                <h3 className="font-semibold text-base">{hotel.name}</h3>
                <p className="text-sm text-gray-600">{hotel.location}</p>
                <p className="text-sm font-bold mt-1">
                  {hotel.price} € / {hotel.duration} {t("hotel.days")}
                </p>
                <div className="text-xs mt-1 text-yellow-600">
                  ★ {hotel.rating} • {hotel.tags?.join(", ")}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
