import { useEffect, useState, useContext } from "react";
import api from "@/api/axiosConfig";
import Header from "@/components/Header";
import PozoParticipantes from "@/components/PozoParticipantes";
import { AuthContext } from "@/contexts/AuthContext";

export default function PanelOrganizador() {
  const [pozos, setPozos] = useState([]);
  const [pozoSeleccionado, setPozoSeleccionado] = useState(null);
  const [tab, setTab] = useState("crear");
  const [nuevoPozo, setNuevoPozo] = useState({
    fecha: "",
    hora_inicio: "",
    hora_fin: "",
    tipo: "mixto",
    num_pistas: 8,
  });

  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (user) {
      console.log("🧠 Usuario actual:", user);
    }
  }, [user]);

  useEffect(() => {
    api.get("/pozos/").then((res) => setPozos(res.data));
  }, []);

  const handleCrearPozo = async () => {
    try {
      await api.post("/pozos/crear/", nuevoPozo);
      const res = await api.get("/pozos/");
      setPozos(res.data);
      setNuevoPozo({
        fecha: "",
        hora_inicio: "",
        hora_fin: "",
        tipo: "mixto",
        num_pistas: 8,
      });
    } catch (err) {
      console.error("Error al crear pozo", err);
    }
  };

  return (
    <>
      <Header />
      {/* Añado pt-28 (equivale a ~7rem, o 112px) para dejar espacio debajo del header */}
      <div className="pt-28 p-6 text-white min-h-screen bg-gray-900">
        <h1 className="text-2xl font-bold mb-4">Panel del Organizador</h1>

        {/* Submenú */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setTab("crear")}
            className={`px-4 py-2 rounded ${
              tab === "crear" ? "bg-blue-600" : "bg-gray-700"
            }`}
          >
            Crear Pozo
          </button>
          <button
            onClick={() => setTab("listar")}
            className={`px-4 py-2 rounded ${
              tab === "listar" ? "bg-blue-600" : "bg-gray-700"
            }`}
          >
            Ver Pozos
          </button>
        </div>

        {tab === "crear" && (
          <div className="bg-white text-black p-4 rounded shadow max-w-xl">
            <h2 className="text-xl font-semibold mb-2">Nuevo Pozo</h2>
            <input
              type="date"
              className="w-full mb-2 p-2 border rounded"
              value={nuevoPozo.fecha}
              onChange={(e) =>
                setNuevoPozo({ ...nuevoPozo, fecha: e.target.value })
              }
            />
            <input
              type="time"
              className="w-full mb-2 p-2 border rounded"
              value={nuevoPozo.hora_inicio}
              onChange={(e) =>
                setNuevoPozo({ ...nuevoPozo, hora_inicio: e.target.value })
              }
            />
            <input
              type="time"
              className="w-full mb-2 p-2 border rounded"
              value={nuevoPozo.hora_fin}
              onChange={(e) =>
                setNuevoPozo({ ...nuevoPozo, hora_fin: e.target.value })
              }
            />
            <select
              className="w-full mb-2 p-2 border rounded"
              value={nuevoPozo.tipo}
              onChange={(e) =>
                setNuevoPozo({ ...nuevoPozo, tipo: e.target.value })
              }
            >
              <option value="mixto">Mixto</option>
              <option value="parejas">Por parejas</option>
              <option value="hombres">Solo hombres</option>
              <option value="mujeres">Solo mujeres</option>
            </select>
            <input
              type="number"
              className="w-full mb-2 p-2 border rounded"
              placeholder="Número de pistas"
              value={nuevoPozo.num_pistas}
              onChange={(e) =>
                setNuevoPozo({ ...nuevoPozo, num_pistas: e.target.value })
              }
            />
            <button
              onClick={handleCrearPozo}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
            >
              Crear pozo
            </button>
          </div>
        )}

        {tab === "listar" && (
          <div>
            <h2 className="text-xl font-semibold">Pozos existentes:</h2>
            <ul className="space-y-2 mt-4">
              {pozos.map((pozo) => (
                <li
                  key={pozo.id}
                  onClick={() => setPozoSeleccionado(pozo.id)}
                  className="cursor-pointer underline text-blue-300 hover:text-blue-100"
                >
                  {pozo.fecha} | {pozo.tipo} | Pistas: {pozo.num_pistas}
                </li>
              ))}
            </ul>

            {pozoSeleccionado && (
              <div className="mt-6">
                <PozoParticipantes pozoId={pozoSeleccionado} />
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
