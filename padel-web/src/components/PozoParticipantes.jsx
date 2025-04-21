import { useEffect, useState } from "react";
import api from "@/api/axiosConfig";

export default function PozoParticipantes({ pozoId }) {
  const [participantes, setParticipantes] = useState([]);
  const [nuevo, setNuevo] = useState({
    nombre: "",
    nivel: "",
    genero: "hombre",
    pista_fija: "",
    pozo: pozoId,
  });

  useEffect(() => {
    if (pozoId) {
      api.get(`/participantes/${pozoId}/`).then((res) => setParticipantes(res.data));
    }
  }, [pozoId]);

  const handleAdd = async () => {
    try {
      await api.post("/participantes/agregar/", nuevo);
      const res = await api.get(`/participantes/${pozoId}/`);
      setParticipantes(res.data);
      setNuevo({ nombre: "", nivel: "", genero: "hombre", pista_fija: "", pozo: pozoId });
    } catch (err) {
      console.error("Error al agregar participante", err);
    }
  };

  return (
    <div className="mt-6">
      <h2 className="text-xl font-bold text-white mb-2">Participantes</h2>
      <ul className="mb-4">
        {participantes.map((p) => (
          <li key={p.id} className="text-white">
            {p.nombre} (nivel {p.nivel}) - {p.genero}
            {p.pista_fija && <span> | Pista fija: {p.pista_fija}</span>}
          </li>
        ))}
      </ul>

      <div className="bg-white p-4 rounded shadow w-full max-w-md">
        <h3 className="font-semibold mb-2">Agregar nuevo</h3>
        <input
          className="w-full mb-2 p-2 border rounded"
          placeholder="Nombre"
          value={nuevo.nombre}
          onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
        />
        <input
          type="number"
          className="w-full mb-2 p-2 border rounded"
          placeholder="Nivel (0-5)"
          value={nuevo.nivel}
          onChange={(e) => setNuevo({ ...nuevo, nivel: e.target.value })}
        />
        <select
          className="w-full mb-2 p-2 border rounded"
          value={nuevo.genero}
          onChange={(e) => setNuevo({ ...nuevo, genero: e.target.value })}
        >
          <option value="hombre">Hombre</option>
          <option value="mujer">Mujer</option>
        </select>
        <input
          type="number"
          className="w-full mb-2 p-2 border rounded"
          placeholder="Pista fija (opcional)"
          value={nuevo.pista_fija}
          onChange={(e) => setNuevo({ ...nuevo, pista_fija: e.target.value })}
        />
        <button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
          Agregar
        </button>
      </div>
    </div>
  );
}
