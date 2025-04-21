import { useState, useContext } from "react";
import { AuthContext } from "@/contexts/AuthContext";

export default function SubmenuPanel({ subView, setSubView }) {
  const { user } = useContext(AuthContext);

  const panelLinks = [
    { key: "atributos", label: "Atributos" },
    { key: "historial", label: "Historial" },
    { key: "reservas", label: "Reservas" },
    { key: "recursos", label: "Recursos" },
    { key: "jugables", label: "Pozos" }, // 🔹 <- Añadir este
    ...(user?.rol === "organizador"
      ? [{ key: "organizar", label: "Organizar Pozos" }]
      : []),
  ];

  const [open, setOpen] = useState(false);

  return (
    <div className="flex justify-center mt-6 z-40 relative">
      {/* Menú colapsable en móvil */}
      <div className="w-full max-w-xs md:hidden px-4">
        <button
          onClick={() => setOpen(!open)}
          className="w-full px-4 py-2 bg-slate-800/70 rounded-xl text-white font-semibold text-sm shadow ring-1 ring-white/10"
        >
          Opciones
        </button>
        {open && (
          <div className="mt-2 flex flex-col gap-2 bg-slate-800/70 rounded-xl shadow ring-1 ring-white/10 p-3">
            {panelLinks.map((pl) => (
              <button
                key={pl.key}
                onClick={() => {
                  setSubView(pl.key);
                  setOpen(false);
                }}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  subView === pl.key
                    ? "bg-white text-slate-900 ring-1 ring-white/30"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                {pl.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Menú horizontal en desktop */}
      <div className="hidden md:flex gap-4 px-6 py-3 bg-slate-800/70 rounded-2xl shadow-xl ring-1 ring-white/10">
        {panelLinks.map((pl) => (
          <button
            key={pl.key}
            onClick={() => setSubView(pl.key)}
            className={`relative px-5 py-2 rounded-lg text-base font-medium transition-all duration-300 ${
              subView === pl.key
                ? "bg-white text-slate-900 shadow-sm ring-1 ring-white/50"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            {pl.label}
          </button>
        ))}
      </div>
    </div>
  );
}
