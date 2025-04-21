// src/components/PozosJugables.jsx
import { useEffect, useState, useContext } from "react";
import api from "@/api/axiosConfig";
import { AuthContext } from "@/contexts/AuthContext";
import { toast } from "react-hot-toast";
import { FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";
import { motion } from "framer-motion";

export default function PozosJugables() {
  const [pozos, setPozos] = useState([]);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    const fetchPozos = async () => {
      try {
        const res = await api.get("/pozos/");
        const hoy = new Date().toISOString().slice(0, 10);
        const futuros = res.data.filter((p) => p.fecha >= hoy);
        setPozos(futuros.sort((a, b) => a.fecha.localeCompare(b.fecha)));
      } catch {
        toast.error("Error al cargar pozos.");
      }
    };
    fetchPozos();
  }, []);

  const handleApuntarse = async (pozo) => {
    if (!user || !user.genero) {
      return toast.error("Tu perfil está incompleto. Falta el género.");
    }

    const payload = {
      pozo: pozo.id,
      nombre: user.username,
      nivel: user.nivel ?? 0,
      genero: user.genero,
      posicion: "Ambos",
      mano_dominante: user.mano_dominante || "diestro",
    };

    const cap = pozo.num_pistas * 4;
    const yaEsta = pozo.participantes?.some((p) => p.nombre === user.username);

    if (pozo.participantes?.length >= cap) return toast.error("Cupo completo.");
    if (yaEsta) return toast("Ya estás inscrito.");

    if (
      (pozo.tipo === "hombres" && user.genero !== "hombre") ||
      (pozo.tipo === "mujeres" && user.genero !== "mujer")
    ) {
      return toast.error("No puedes apuntarte a este pozo.");
    }

    try {
      await api.post("/pozos/participantes/agregar/", payload);
      toast.success("Inscripción realizada ✅");
      refreshPozo(pozo.id);
    } catch {
      toast.error("Error al inscribirse.");
    }
  };

  const handleQuitar = async (pozo) => {
    try {
      const participante = pozo.participantes.find((p) => p.nombre === user.username);
      if (!participante) return;

      await api.delete(`/pozos/participantes/${participante.id}/eliminar/`);
      toast.success("Te has dado de baja ❌");
      refreshPozo(pozo.id);
    } catch {
      toast.error("Error al quitar inscripción.");
    }
  };

  const refreshPozo = async (pozoId) => {
    try {
      const res = await api.get(`/pozos/${pozoId}/participantes/`);
      setPozos((prev) =>
        prev.map((p) => (p.id === pozoId ? { ...p, participantes: res.data } : p))
      );
    } catch {
      toast.error("Error actualizando participantes.");
    }
  };

  return (
    <div className="text-white space-y-6">
      <h2 className="text-lg font-bold text-blue-300">Pozos Disponibles</h2>
      <div className="flex flex-col gap-4">
        {pozos.map((p) => {
          const cap = p.num_pistas * 4;
          const inscritos = p.participantes?.length || 0;
          const full = inscritos >= cap;
          const inscrito = p.participantes?.some((x) => x.nombre === user.username);

          return (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className={`border-2 rounded-xl p-4 shadow transition ${
                inscrito
                  ? "border-green-400 bg-white/20"
                  : "border-white/10 bg-white/5 hover:border-blue-300"
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1 text-sm flex-1">
                  <p className="font-bold text-base text-blue-200">{p.titulo}</p>
                  <p>📅 {p.fecha}</p>
                  <p>🕒 {p.hora_inicio} — {p.hora_fin}</p>
                  <p>🎾 {p.tipo} | 🛏️ {p.num_pistas} pistas</p>
                  <p className="flex items-center gap-1">
                    👥 {inscritos}/{cap}{" "}
                    {full ? <FaCheckCircle className="text-green-400" /> : <FaExclamationTriangle className="text-yellow-400" />}
                  </p>
                </div>
                <div className="flex flex-col gap-2 ml-4">
                  {inscrito ? (
                    <button
                      onClick={() => handleQuitar(p)}
                      className="px-4 py-1 rounded text-xs font-semibold bg-red-600 hover:bg-red-700"
                    >
                      Quitar inscripción
                    </button>
                  ) : (
                    <button
                      onClick={() => handleApuntarse(p)}
                      className={`px-4 py-1 rounded text-xs font-semibold ${
                        full ? "bg-gray-500 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
                      }`}
                      disabled={full}
                    >
                      Apuntarme
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
