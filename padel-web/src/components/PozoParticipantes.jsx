// src/components/PozoParticipantes.jsx
import { useEffect, useState } from "react";
import api from "@/api/axiosConfig";
import { toast } from "react-hot-toast";
import {
  FaExclamationTriangle,
  FaCheckCircle,
  FaPlusCircle,
  FaMinusCircle,
} from "react-icons/fa";
import { generatePairings } from "@/helpers/pairings";

/**
 * Componente principal para la gestión de participantes y emparejamientos
 *   – Sólo hace una petición de carga cuando cambia `pozoId`.
 *   – Notifica los cambios de lista al padre mediante un callback MEMOIZADO.
 *   – Después de altas/bajas/ediciones vuelve a sincronizar la lista.
 *   – 🆕  Permite importar participantes desde un Excel.
 */
export default function PozoParticipantes({
  pozoId,
  onParticipantesActualizados,
}) {
  /* ------------------------- STATE ------------------------- */
  const [participantes, setParticipantes] = useState([]);
  const [numPistas, setNumPistas] = useState(8);
  const [tipoPozo, setTipoPozo] = useState("");
  const [nuevo, setNuevo] = useState({
    nombre: "",
    nivel: "",
    genero: "hombre",
    posicion: "ambos",
    pista_fija: "",
    mano_dominante: "diestro",
  });
  const [editandoId, setEditandoId] = useState(null);
  const [edicion, setEdicion] = useState({});
  const [emparejamientos, setEmparejamientos] = useState([]);
  const [excelFile, setExcelFile] = useState(null);

  /* -------------------- DERIVED FLAGS ---------------------- */
  const maxParticipantes = numPistas * 4;
  const pozoCompleto = participantes.length === maxParticipantes;
  const hombres = participantes.filter((p) => p.genero === "hombre").length;
  const mujeres = participantes.length - hombres;
  const mostrarAlerta =
    (tipoPozo === "mixto" && hombres !== mujeres) ||
    (tipoPozo === "hombres" && mujeres > 0) ||
    (tipoPozo === "mujeres" && hombres > 0);

  /* --------------------- DATA FETCHING --------------------- */
  useEffect(() => {
    if (!pozoId) return;
    (async () => {
      try {
        const [{ data: part }, { data: p }] = await Promise.all([
          api.get(`/pozos/${pozoId}/participantes/`),
          api.get(`/pozos/${pozoId}/`),
        ]);
        setParticipantes(
          part.sort((a, b) => a.nombre.localeCompare(b.nombre))
        );
        setNumPistas(p.num_pistas);
        setTipoPozo(p.tipo);
      } catch {
        toast.error("❌ Error cargando datos del pozo");
      }
    })();
  }, [pozoId]);

  /* --------- Notificar al padre cuando cambia la lista ------ */
  useEffect(() => {
    onParticipantesActualizados?.(participantes);
  }, [participantes, onParticipantesActualizados]);

  /* -------------------- VALIDACIONES ----------------------- */
  const validarSexo = (g) => {
    if (tipoPozo === "hombres" && g !== "hombre") {
      toast.error("🚫 No puedes añadir mujeres a un pozo solo de hombres");
      return false;
    }
    if (tipoPozo === "mujeres" && g !== "mujer") {
      toast.error("🚫 No puedes añadir hombres a un pozo solo de mujeres");
      return false;
    }
    return true;
  };

  /* -------------------- CRUD HANDLERS ---------------------- */
  const refreshLista = async () => {
    const { data } = await api.get(`/pozos/${pozoId}/participantes/`);
    setParticipantes(data.sort((a, b) => a.nombre.localeCompare(b.nombre)));
  };

  const handleAdd = async () => {
    if (!validarSexo(nuevo.genero)) return;
    if (
      !nuevo.nombre ||
      nuevo.nivel === "" ||
      !nuevo.posicion ||
      !nuevo.mano_dominante
    ) {
      return toast.error("⚠️ Completa todos los campos obligatorios");
    }
    if (
      participantes.some(
        (p) =>
          p.nombre.toLowerCase().trim() === nuevo.nombre.toLowerCase().trim()
      )
    ) {
      return toast.error("🚫 Ya existe un participante con ese nombre");
    }
    if (participantes.length >= maxParticipantes) {
      return toast.error(`🚫 Límite alcanzado (${maxParticipantes})`);
    }

    const payload = {
      pozo: pozoId,
      nombre: nuevo.nombre.trim(),
      nivel: Number(nuevo.nivel),
      genero: nuevo.genero,
      posicion: nuevo.posicion,
      mano_dominante: nuevo.mano_dominante,
    };
    if (nuevo.pista_fija) {
      const pista = Number(nuevo.pista_fija);
      const enP = participantes.filter((p) => p.pista_fija === pista);
      if (enP.length >= 4)
        return toast.error(`🚫 Ya hay 4 iniciando en pista ${pista}`);
      payload.pista_fija = pista;
    }

    try {
      await api.post("/pozos/participantes/agregar/", payload);
      toast.success("✅ Participante agregado");
      setNuevo((prev) => ({ ...prev, nombre: "", nivel: "", pista_fija: "" }));
      refreshLista();
    } catch {
      toast.error("❌ Error al agregar");
    }
  };

  const handleGuardar = async (id) => {
    if (!validarSexo(edicion.genero)) return;
    if (
      !edicion.nombre ||
      edicion.nivel === "" ||
      !edicion.posicion ||
      !edicion.mano_dominante
    ) {
      return toast.error("⚠️ Completa todos los campos obligatorios");
    }
    if ((edicion.juega_con || []).length > 1)
      return toast.error("Solo puedes seleccionar 1 'Juega con'");
    if ((edicion.juega_contra || []).length > 2)
      return toast.error("Máximo 2 'Juega contra'");

    // validaciones de conflictos locales
    const setCon = new Set(edicion.juega_con || []);
    const setContra = new Set(edicion.juega_contra || []);
    const setNo = new Set(edicion.no_juega_con || []);
    const setNoContra = new Set(edicion.no_juega_contra || []);
    for (let otherId of setCon) {
      if (setContra.has(otherId) || setNo.has(otherId))
        return toast.error(
          "Conflicto en relaciones para el mismo participante"
        );
    }
    for (let otherId of setContra) {
      if (setNoContra.has(otherId))
        return toast.error(
          "Conflicto en relaciones para el mismo participante"
        );
    }

    const pista = edicion.pista_fija ? Number(edicion.pista_fija) : null;
    if (pista) {
      const enP = participantes.filter(
        (p) => p.id !== id && p.pista_fija === pista
      );
      if (enP.length >= 4)
        return toast.error(`🚫 Ya hay 4 iniciando en pista ${pista}`);
    }

    // 1) Actualizar este participante
    const payload = {
      pozo: pozoId,
      nombre: edicion.nombre.trim(),
      nivel: Number(edicion.nivel),
      genero: edicion.genero,
      posicion: edicion.posicion,
      mano_dominante: edicion.mano_dominante,
      pista_fija: pista,
      juega_con: edicion.juega_con || [],
      juega_contra: edicion.juega_contra || [],
      no_juega_con: edicion.no_juega_con || [],
      no_juega_contra: edicion.no_juega_contra || [],
    };

    try {
      // <-- ruta CORRECTA sin pozoId anidado -->
      await api.put(`/pozos/participantes/${id}/`, payload);

      // 2) Bidireccionalidad: actualizo cada relación en los demás
      const claves = [
        "juega_con",
        "juega_contra",
        "no_juega_con",
        "no_juega_contra",
      ];
      const original = participantes; // estado antes de editar

      await Promise.all(
        original
          .filter((o) => o.id !== id)
          .map(async (other) => {
            // clono el payload completo de 'other'
            const otherPayload = {
              pozo: pozoId,
              nombre: other.nombre,
              nivel: other.nivel,
              genero: other.genero,
              posicion: other.posicion,
              mano_dominante: other.mano_dominante,
              pista_fija: other.pista_fija,
              juega_con: [...(other.juega_con || [])],
              juega_contra: [...(other.juega_contra || [])],
              no_juega_con: [...(other.no_juega_con || [])],
              no_juega_contra: [...(other.no_juega_contra || [])],
            };
            // para cada clave, añado o quito el id de 'id'
            claves.forEach((key) => {
              const listaOrig = other[key] || [];
              const quiere = edicion[key]?.includes(other.id);
              if (quiere && !listaOrig.includes(id)) {
                otherPayload[key] = [...new Set([...listaOrig, id])];
              } else if (!quiere && listaOrig.includes(id)) {
                otherPayload[key] = listaOrig.filter((x) => x !== id);
              }
            });
            // <-- ruta CORRECTA -->
            await api.put(
              `/pozos/participantes/${other.id}/`,
              otherPayload
            );
          })
      );

      toast.success("💾 Cambios guardados");
      setEditandoId(null);
      refreshLista();
    } catch {
      toast.error("❌ Error al guardar");
    }
  };

  const handleEliminar = async (id) => {
    if (!confirm("¿Eliminar participante?")) return;
    try {
      // <-- ruta CORRECTA -->
      await api.delete(`/pozos/participantes/${id}/eliminar/`);
      toast.success("🗑️ Participante eliminado");
      refreshLista();
    } catch {
      toast.error("❌ Error al eliminar");
    }
  };

  /* -------------------- IMPORTAR EXCEL ------------------ */
  const handleExcelUpload = async () => {
    if (!excelFile) return toast.error("Selecciona primero un archivo Excel");
    const formData = new FormData();
    formData.append("file", excelFile);
    try {
      await api.post(
        `/pozos/${pozoId}/importar_excel/`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      toast.success("✅ Participantes importados");
      setExcelFile(null);
      refreshLista();
    } catch (err) {
      toast.error(err.response?.data?.error || "❌ Error importando Excel");
    }
  };

  /* ---------------- EMPAREJAMIENTOS -------------------- */
  const onPair = () => {
    const { matches } = generatePairings(
      participantes,
      numPistas,
      tipoPozo
    );
    setEmparejamientos(matches);
  };

  /* ----------------------- UI ------------------------- */
  return (
    <div className="mt-6 max-w-3xl mx-auto flex flex-col items-center">
      <h2 className="text-xl font-bold text-white mb-2">
        Participantes
        {pozoCompleto && (
          <FaCheckCircle className="inline ml-2 text-green-400" />
        )}
        {mostrarAlerta && pozoCompleto && (
          <FaExclamationTriangle className="inline ml-2 text-yellow-400" />
        )}
      </h2>

      {tipoPozo === "mixto" && (
        <div className="text-yellow-300 mb-2">
          Hombres: {hombres} — Mujeres: {mujeres}
        </div>
      )}
      {!pozoCompleto && (
        <div className="text-blue-300 mb-4">
          Faltan {maxParticipantes - participantes.length} participantes
          para completar el pozo.
        </div>
      )}

      {/* Lista de tarjetas */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-4 mb-6 w-full">
        {participantes.map((p) => (
          <div
            key={p.id}
            className="bg-white/10 hover:bg-white/20 rounded-lg shadow p-3 min-h-[180px] flex flex-col justify-between transition cursor-pointer font-sans text-sm font-normal"
            onClick={() => {
              if (editandoId !== p.id) {
                setEditandoId(p.id);
                setEdicion({
                  ...p,
                  juega_con: [...(p.juega_con || [])],
                  juega_contra: [...(p.juega_contra || [])],
                  no_juega_con: [...(p.no_juega_con || [])],
                  no_juega_contra: [...(p.no_juega_contra || [])],
                });
              }
            }}
          >
            {editandoId === p.id ? (
              <div onClick={(e) => e.stopPropagation()} className="space-y-1">
                {/* —— MODO EDICIÓN —— */}
                <input
                  className="w-full p-1 rounded text-black text-xs"
                  placeholder="Nombre"
                  value={edicion.nombre}
                  onChange={(e) =>
                    setEdicion((v) => ({ ...v, nombre: e.target.value }))
                  }
                />
                <select
                  className="w-full p-1 rounded text-black text-xs"
                  value={edicion.nivel}
                  onChange={(e) =>
                    setEdicion((v) => ({ ...v, nivel: e.target.value }))
                  }
                >
                  <option value="">— Nivel —</option>
                  {Array.from({ length: 6 }, (_, i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
                <select
                  className="w-full p-1 rounded text-black text-xs"
                  value={edicion.genero}
                  onChange={(e) =>
                    setEdicion((v) => ({ ...v, genero: e.target.value }))
                  }
                >
                  <option value="hombre">Hombre</option>
                  <option value="mujer">Mujer</option>
                </select>
                <select
                  className="w-full p-1 rounded text-black text-xs"
                  value={edicion.posicion}
                  onChange={(e) =>
                    setEdicion((v) => ({ ...v, posicion: e.target.value }))
                  }
                >
                  {["reves", "drive", "ambos"].map((o) => (
                    <option key={o} value={o}>
                      {o.charAt(0).toUpperCase() + o.slice(1)}
                    </option>
                  ))}
                </select>
                <select
                  className="w-full p-1 rounded text-black text-xs"
                  value={edicion.pista_fija || ""}
                  onChange={(e) =>
                    setEdicion((v) => ({
                      ...v,
                      pista_fija: e.target.value
                        ? Number(e.target.value)
                        : null,
                    }))
                  }
                >
                  <option value="">— Pista —</option>
                  {Array.from({ length: numPistas }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
                <select
                  className="w-full p-1 rounded text-black text-xs"
                  value={edicion.mano_dominante}
                  onChange={(e) =>
                    setEdicion((v) => ({
                      ...v,
                      mano_dominante: e.target.value,
                    }))
                  }
                >
                  <option value="diestro">✋ Diestro</option>
                  <option value="zurdo">🫲 Zurdo</option>
                </select>

                {/* —— Relaciones M2M —— */}
                {[  
                  { key: "juega_con",       label: "Juega con",       max: 1,  conflicts: ["juega_contra","no_juega_con"] },
                  { key: "juega_contra",    label: "Juega contra",    max: 2,  conflicts: ["juega_con","no_juega_contra"] },
                  { key: "no_juega_con",    label: "No juega con",    max: Infinity, conflicts: ["juega_con"] },
                  { key: "no_juega_contra", label: "No juega contra", max: Infinity, conflicts: ["juega_contra"] },
                ].map(({ key, label, max, conflicts }) => (
                  <div key={key}>
                    <label className="block text-xs text-white/80">{label}</label>
                    <ul className="space-y-1 max-h-32 overflow-auto">
                      {participantes
                        .filter(x => x.id !== p.id)
                        .map(x => {
                          const selected = (edicion[key] || []).includes(x.id);
                          return (
                            <li key={x.id} className="flex items-center justify-between text-black text-xs bg-white/80 rounded px-2 py-1">
                              <span>{x.nombre}</span>
                              {selected ? (
                                <FaMinusCircle
                                  className="text-red-600 cursor-pointer"
                                  onClick={() => {
                                    setEdicion(v => ({
                                      ...v,
                                      [key]: v[key].filter(id => id !== x.id)
                                    }));
                                  }}
                                />
                              ) : (
                                <FaPlusCircle
                                  className="text-green-600 cursor-pointer"
                                  onClick={() => {
                                    const curr = v => v[key] || [];
                                    if (curr(edicion).length >= max) {
                                      return toast.error(`Máximo ${max} en "${label}"`);
                                    }
                                    for (let c of conflicts) {
                                      if ((edicion[c] || []).includes(x.id)) {
                                        return toast.error(`No puedes mezclar "${label}" con "${c.replace(/_/g," ")}`);
                                      }
                                    }
                                    setEdicion(v => ({
                                      ...v,
                                      [key]: [...curr(v), x.id]
                                    }));
                                  }}
                                />
                              )}
                            </li>
                          );
                        })
                      }
                      {!(edicion[key] || []).length && (
                        <li className="text-xxs text-white/50">–</li>
                      )}
                    </ul>
                  </div>
                ))}

                <div className="flex gap-1 mt-2">
                  <button
                    className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 rounded flex-1"
                    onClick={() => handleGuardar(p.id)}
                  >
                    Guardar
                  </button>
                  <button
                    className="bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded flex-1"
                    onClick={() => handleEliminar(p.id)}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {/* —— VISTA NORMAL —— */}
                <div className="font-semibold text-center">{p.nombre}</div>
                <div className="mt-1 text-sm font-normal space-y-0.5">
                  <div>Nivel: {p.nivel}</div>
                  <div>Pista: {p.pista_fija ?? "-"}</div>
                  <div>Posición: {p.posicion}</div>
                  <div>Género: {p.genero === "hombre" ? "👦 Hombre" : "👧 Mujer"}</div>
                  <div>{p.mano_dominante === "zurdo" ? "🫲 Zurdo" : "✋ Diestro"}</div>
                </div>
                <div className="mt-1 text-sm font-normal space-y-0.5">
                  <div>
                    <strong>Juega con:</strong>{" "}
                    {p.juega_con.length
                      ? p.juega_con
                          .map(id => participantes.find(u => u.id === id)?.nombre || id)
                          .join(", ")
                      : "–"}
                  </div>
                  <div>
                    <strong>Juega contra:</strong>{" "}
                    {p.juega_contra.length
                      ? p.juega_contra
                          .map(id => participantes.find(u => u.id === id)?.nombre || id)
                          .join(", ")
                      : "–"}
                  </div>
                  <div>
                    <strong>No juega con:</strong>{" "}
                    {p.no_juega_con.length
                      ? p.no_juega_con
                          .map(id => participantes.find(u => u.id === id)?.nombre || id)
                          .join(", ")
                      : "–"}
                  </div>
                  <div>
                    <strong>No juega contra:</strong>{" "}
                    {p.no_juega_contra.length
                      ? p.no_juega_contra
                          .map(id => participantes.find(u => u.id === id)?.nombre || id)
                          .join(", ")
                      : "–"}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* —— Formulario de alta + import —— */}
      {!pozoCompleto && (
        <div className="bg-white p-4 rounded shadow w-full max-w-md mb-6">
          <h3 className="font-semibold mb-2 text-black">Agregar nuevo</h3>
          <input
            className="w-full mb-2 p-2 border rounded text-black text-sm"
            placeholder="Nombre"
            value={nuevo.nombre}
            onChange={(e) =>
              setNuevo((prev) => ({ ...prev, nombre: e.target.value }))
            }
          />
          <select
            className="w-full mb-2 p-2 border rounded text-black text-sm"
            value={nuevo.nivel}
            onChange={(e) =>
              setNuevo((prev) => ({ ...prev, nivel: e.target.value }))
            }
          >
            <option value="">— Nivel —</option>
            {Array.from({ length: 6 }, (_, i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
          <select
            className="w-full mb-2 p-2 border rounded text-black text-sm"
            value={nuevo.genero}
            onChange={(e) =>
              setNuevo((prev) => ({ ...prev, genero: e.target.value }))
            }
          >
            <option value="hombre">Hombre</option>
            <option value="mujer">Mujer</option>
          </select>
          <select
            className="w-full mb-2 p-2 border rounded text-black text-sm"
            value={nuevo.posicion}
            onChange={(e) =>
              setNuevo((prev) => ({ ...prev, posicion: e.target.value }))
            }
          >
            {["reves", "drive", "ambos"].map((o) => (
              <option key={o} value={o}>
                {o.charAt(0).toUpperCase() + o.slice(1)}
              </option>
            ))}
          </select>
          <select
            className="w-full mb-2 p-2 border rounded text-black text-sm"
            value={nuevo.pista_fija}
            onChange={(e) =>
              setNuevo((prev) => ({
                ...prev,
                pista_fija: e.target.value ? Number(e.target.value) : "",
              }))
            }
          >
            <option value="">— Pista Inicio —</option>
            {Array.from({ length: numPistas }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
          <select
            className="w-full mb-4 p-2 border rounded text-black text-sm"
            value={nuevo.mano_dominante}
            onChange={(e) =>
              setNuevo((prev) => ({ ...prev, mano_dominante: e.target.value }))
            }
          >
            <option value="diestro">✋ Diestro</option>
            <option value="zurdo">🫲 Zurdo</option>
          </select>
          <button
            onClick={handleAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-full mb-4"
          >
            Agregar
          </button>
          <hr className="border-gray-300 mb-4" />
          <h4 className="font-semibold text-black text-sm mb-2">
            Importar participantes desde Excel
          </h4>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
            className="mb-2 w-full text-sm file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer"
          />
          <button
            onClick={handleExcelUpload}
            disabled={!excelFile}
            className={`w-full px-4 py-2 rounded text-white font-semibold ${
              excelFile
                ? "bg-green-600 hover:bg-green-700"
                : "bg-gray-500 cursor-not-allowed"
            }`}
          >
            Subir Excel
          </button>
        </div>
      )}

      {/* —— Botón emparejar —— */}
      <div className="text-center mb-6">
        <button
          disabled={!pozoCompleto}
          onClick={onPair}
          className={`px-6 py-2 rounded text-white font-semibold ${
            pozoCompleto
              ? "bg-green-600 hover:bg-green-700"
              : "bg-gray-500 cursor-not-allowed"
          }`}
        >
          {pozoCompleto ? "🧩 Generar emparejamientos" : "Esperando participantes..."}
        </button>
      </div>

      {/* —— Resultados —— */}
      {emparejamientos.length > 0 && (
        <div className="max-w-lg mx-auto mb-6 text-white space-y-4">
          <h3 className="font-semibold mb-2">Emparejamientos 2v2</h3>
          {emparejamientos.map((m, i) => (
            <div key={i} className="p-4 bg-white/10 rounded-lg">
              <div className="font-bold mb-1">Pista {m.pista}</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/20 p-2 rounded">
                  <div className="font-semibold">Pareja A</div>
                  <div>{m.teams[0][0]}</div>
                  <div>{m.teams[0][1]}</div>
                  <div className="mt-1 text-sm">
                    Total: {m.totals[0]}, Media: {m.avgs[0]}
                  </div>
                </div>
                <div className="bg-white/20 p-2 rounded">
                  <div className="font-semibold">Pareja B</div>
                  <div>{m.teams[1][0]}</div>
                  <div>{m.teams[1][1]}</div>
                  <div className="mt-1 text-sm">
                    Total: {m.totals[1]}, Media: {m.avgs[1]}
                  </div>
                </div>
              </div>
              <div className="mt-2 text-sm">
                <span>Diferencia media: {m.diffAvg}</span> •{" "}
                <span>Diferencia total: {m.diffTot}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
