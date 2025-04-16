export default function SubmenuPanel({ subView, setSubView }) {
    const panelLinks = [
      { key: "atributos", label: "Atributos" },
      { key: "historial", label: "Historial" },
      { key: "reservas", label: "Reservas" },
      { key: "recursos", label: "Recursos" },
    ];
  
    return (
      <div className="flex justify-center mt-6 z-40 relative">
        <div className="flex gap-4 px-6 py-3 bg-slate-800/70 rounded-2xl shadow-xl ring-1 ring-white/10">
          {panelLinks.map((pl) => (
            <button
              key={pl.key}
              onClick={() => setSubView(pl.key)}
              className={`relative px-5 py-2 rounded-lg text-base font-medium transition-all duration-300
                ${
                  subView === pl.key
                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-white/50"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
            >
              {pl.label}
              {/* Eliminamos el punto circular */}
            </button>
          ))}
        </div>
      </div>
    );
  }
  