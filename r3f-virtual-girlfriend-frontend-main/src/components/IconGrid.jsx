/* IconGrid.tsx */
export const IconGrid = ({ title, options, onSelect }) => (
  <div className="fixed inset-0 z-20 flex items-center justify-center md:justify-end md:pr-[6%] backdrop-blur-sm">
    <div className="bg-white/80 rounded-2xl p-6 w-11/12 max-w-lg">
      <h2 className="font-bold text-xl mb-4 text-center">{title}</h2>
      <div className="grid grid-cols-3 gap-4">
        {options?.map((o) => (
          <button
            key={o.id}
            className="aspect-square flex flex-col items-center justify-center rounded-xl shadow-md hover:scale-105 transition pointer-events-auto"
            onClick={() => onSelect(o?.id)}
          >
            {o.image ? (
              <img src={o.image} alt="" className="w-14 h-14 object-cover rounded-lg" />
            ) : (
              <span className="text-4xl">{o?.emoji}</span>
            )}
            <span className="mt-1 text-sm">{o?.label}</span>
          </button>
        ))}
      </div>
    </div>
  </div>
);
