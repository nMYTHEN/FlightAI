/* HotelDetail.tsx */
export const HotelDetail = ({ hotel, onBack, onBook }) => (
  <div className="fixed inset-0 z-20 flex items-center justify-center backdrop-blur-sm overflow-auto">
    <div className="bg-white/90 rounded-2xl p-6 w-11/12 max-w-2xl">
      <button
        onClick={onBack}
        className="text-sm text-blue-600 mb-2 hover:underline"
      >
        ← Zurück
      </button>

      <img
        src={hotel.image}
        alt={hotel.name}
        className="w-full h-64 object-cover rounded-xl mb-4"
      />

      <h2 className="text-2xl font-bold">{hotel.name}</h2>
      <p className="text-gray-600">{hotel.location}</p>

      <div className="my-3">
        <div className="text-yellow-600">★ {hotel.rating}</div>
        <div className="text-sm text-gray-700 mt-1">{hotel.description}</div>
        <div className="mt-2 text-sm text-gray-800">
          Ausstattung: {hotel.tags?.join(", ")}
        </div>
      </div>

      <div className="flex justify-between items-center mt-4">
        <span className="font-bold text-lg">
          {hotel.price} € / {hotel.duration} Tage
        </span>
        <button
          onClick={() => onBook(hotel.id)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700"
        >
          Jetzt buchen
        </button>
      </div>
    </div>
  </div>
);
