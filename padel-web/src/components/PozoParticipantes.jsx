// src/components/PozoParticipantes.jsx
import { useEffect, useState, useCallback } from "react";
import api from "@/api/axiosConfig";
import { toast } from "react-hot-toast";
import { FaExclamationTriangle, FaCheckCircle } from "react-icons/fa";
import { generatePairings } from "@/helpers/pairings";

/**
 * Componente principal para la gestión de participantes y emparejamientos
 *   – Sólo hace una petición de carga cuando cambia `pozoId`.
 *   – Notifica los cambios de lista al padre mediante un callback MEMOIZADO.
 *   – Después de altas/bajas/ediciones vuelve a sincronizar la lista.
 */
export default function PozoParticipantes({ pozoId, onParticipantesActualizados }) {
  /* ------------------------- STATE ------------------------- */
  const [participantes, setParticipantes]     = useState([]);
  const [numPistas,      setNumPistas]        = useState(8);
  const [tipoPozo,       setTipoPozo]         = useState("");
  const [nuevo, setNuevo] = useState({
    nombre: "", nivel: "", genero: "hombre",
    posicion: "Ambos", pista_fija: "", mano_dominante: "diestro",
  });
  const [editandoId, setEditandoId]           = useState(null);
  const [edicion,    setEdicion]              = useState({});
  const [emparejamientos, setEmparejamientos] = useState([]);
  const [debugInfo,       setDebugInfo]       = useState(null);

  /* -------------------- DERIVED FLAGS ---------------------- */
  const maxParticipantes = numPistas * 4;
  const pozoCompleto     = participantes.length === maxParticipantes;
  const hombres          = participantes.filter(p => p.genero === "hombre").length;
  const mujeres          = participantes.length - hombres;
  const mostrarAlerta =
    (tipoPozo === "mixto"   && hombres !== mujeres) ||
    (tipoPozo === "hombres" && mujeres > 0)         ||
    (tipoPozo === "mujeres" && hombres  > 0);

  /* --------------------- DATA FETCHING --------------------- */
  useEffect(() => {
    if (!pozoId) return;

    const fetchData = async () => {
      try {
        // Una sola petición al pozo + otra al detalle
        const [{ data: part }, { data: p }] = await Promise.all([
          api.get(`/pozos/${pozoId}/participantes/`),
          api.get(`/pozos/${pozoId}/`),
        ]);
        setParticipantes(part.sort((a, b) => a.nombre.localeCompare(b.nombre)));
        setNumPistas(p.num_pistas);
        setTipoPozo(p.tipo);
      } catch (e) {
        toast.error("❌ Error cargando datos del pozo");
      }
    };

    fetchData();
  }, [pozoId]); // ← SOLO cuando cambia el pozo

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
    if (!nuevo.nombre || nuevo.nivel === "" || !nuevo.posicion || !nuevo.mano_dominante) {
      return toast.error("⚠️ Completa todos los campos obligatorios");
    }
    if (participantes.some(p => p.nombre.toLowerCase().trim() === nuevo.nombre.toLowerCase().trim())) {
      return toast.error("🚫 Ya existe un participante con ese nombre");
    }
    if (participantes.length >= maxParticipantes) {
      return toast.error(`🚫 Límite alcanzado (${maxParticipantes} participantes)`);
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
      const enP   = participantes.filter(p => p.pista_fija === pista);
      if (enP.length >= 4) return toast.error(`🚫 Ya hay 4 iniciando en pista ${pista}`);
      if (tipoPozo === "mixto") {
        const cnt = enP.filter(p => p.genero === nuevo.genero).length;
        if (cnt >= 2) return toast.error(`🚫 Ya hay 2 ${nuevo.genero}s en pista ${pista}`);
      }
      payload.pista_fija = pista;
    }

    try {
      await api.post("/pozos/participantes/agregar/", payload);
      toast.success("✅ Participante agregado");
      setNuevo(prev => ({ ...prev, nombre: "", nivel: "", pista_fija: "" }));
      refreshLista();
    } catch {
      toast.error("❌ Error al agregar");
    }
  };

  const handleGuardar = async (id) => {
    if (!validarSexo(edicion.genero)) return;
    if (!edicion.nombre || edicion.nivel === "" || !edicion.posicion || !edicion.mano_dominante) {
      return toast.error("⚠️ Completa todos los campos obligatorios (menos pista)");
    }

    const payload = {
      pozo: pozoId,
      nombre: edicion.nombre.trim(),
      nivel: Number(edicion.nivel),
      genero: edicion.genero,
      posicion: edicion.posicion,
      mano_dominante: edicion.mano_dominante,
    };

    if (edicion.pista_fija) {
      const pista = Number(edicion.pista_fija);
      const enP   = participantes.filter(p => p.id !== id && p.pista_fija === pista);
      if (enP.length >= 4) return toast.error(`🚫 Ya hay 4 iniciando en pista ${pista}`);
      if (tipoPozo === "mixto") {
        const cnt = enP.filter(p => p.genero === edicion.genero).length;
        if (cnt >= 2) return toast.error(`🚫 Ya hay 2 ${edicion.genero}s en pista ${pista}`);
      }
      payload.pista_fija = pista;
    }

    try {
      await api.put(`/pozos/participantes/${id}/`, payload);
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
      await api.delete(`/pozos/participantes/${id}/eliminar/`);
      toast.success("🗑️ Participante eliminado");
      refreshLista();
    } catch {
      toast.error("❌ Error al eliminar");
    }
  };

  /* --------------- EMPAREJAMIENTOS ------------------------- */
  const onPair = () => {
    const { matches, debug } = generatePairings(participantes, numPistas, tipoPozo);
    setEmparejamientos(matches);
    setDebugInfo(debug);
  };


  /* -------------------- UI -------------------- */
  return (
    <div className="mt-6 max-w-3xl mx-auto flex flex-col items-center">
      <h2 className="text-xl font-bold text-white mb-4">
        Participantes
        {pozoCompleto && <FaCheckCircle className="inline ml-2 text-green-400" />} 
        {mostrarAlerta && pozoCompleto && (
          <FaExclamationTriangle className="inline ml-2 text-yellow-400" />
        )}
      </h2>

      {/* tarjetas */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-4 mb-6 w-full">
        {participantes.map(p => (
          <div
            key={p.id}
            className="bg-white/10 hover:bg-white/20 rounded-lg shadow p-3 min-h-[140px] flex flex-col justify-between transition cursor-pointer"
            onClick={() => {
              if (editandoId !== p.id) {
                setEditandoId(p.id);
                setEdicion(p);
              }
            }}
          >
            {editandoId === p.id ? (
              <div onClick={e => e.stopPropagation()} className="space-y-1">
                {/* nombre */}
                <input
                  value={edicion.nombre}
                  onChange={e => setEdicion(prev => ({ ...prev, nombre: e.target.value }))}
                  className="w-full p-1 rounded text-black text-xs"
                  placeholder="Nombre"
                />
                {/* nivel */}
                <select
                  value={edicion.nivel}
                  onChange={e => setEdicion(prev => ({ ...prev, nivel: e.target.value }))}
                  className="w-full p-1 rounded text-black text-xs"
                >
                  <option value="">— Nivel —</option>
                  {Array.from({ length: 6 }, (_, i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
                {/* genero */}
                <select
                  value={edicion.genero}
                  onChange={e => setEdicion(prev => ({ ...prev, genero: e.target.value }))}
                  className="w-full p-1 rounded text-black text-xs"
                >
                  <option value="hombre">Hombre</option>
                  <option value="mujer">Mujer</option>
                </select>
                {/* posición */}
                <select
                  value={edicion.posicion}
                  onChange={e => setEdicion(prev => ({ ...prev, posicion: e.target.value }))}
                  className="w-full p-1 rounded text-black text-xs"
                >
                  {["Reves", "Drive", "Ambos"].map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
                {/* pista fija */}
                <select
                  value={edicion.pista_fija || ""}
                  onChange={e => {
                    const val = e.target.value;
                    setEdicion(prev => ({ ...prev, pista_fija: val === "" ? null : Number(val) }));
                  }}
                  className="w-full p-1 rounded text-black text-xs"
                >
                  <option value="">— Pista —</option>
                  {Array.from({ length: numPistas }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
                {/* mano */}
                <select
                  value={edicion.mano_dominante}
                  onChange={e => setEdicion(prev => ({ ...prev, mano_dominante: e.target.value }))}
                  className="w-full p-1 rounded text-black text-xs"
                >
                  <option value="diestro">✋ Diestro</option>
                  <option value="zurdo">🫲 Zurdo</option>
                </select>
                {/* botones */}
                <div className="flex gap-1 mt-2">
                  <button
                    onClick={() => handleGuardar(p.id)}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 rounded flex-1"
                  >Guardar</button>
                  <button
                    onClick={() => handleEliminar(p.id)}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded flex-1"
                  >Eliminar</button>
                </div>
              </div>
            ) : (
              <div>
                <div className="font-semibold text-center">{p.nombre}</div>
                <div className="mt-1 text-[10px] space-y-0.5">
                  <div>Nivel: {p.nivel}</div>
                  <div>Pista: {p.pista_fija ?? "-"}</div>
                  <div>Posición: {p.posicion}</div>
                  <div>Género: {p.genero === "hombre" ? "👦 Hombre" : "👧 Mujer"}</div>
                  <div>{p.mano_dominante === "zurdo" ? "🫲 Zurdo" : "✋ Diestro"}</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* formulario alta */}
      {!pozoCompleto && (
        <div className="bg-white p-4 rounded shadow w-full max-w-md mb-6">
          <h3 className="font-semibold mb-2 text-black">Agregar nuevo</h3>
          <input
            className="w-full mb-2 p-2 border rounded text-black text-sm"
            placeholder="Nombre"
            value={nuevo.nombre}
            onChange={e => setNuevo(prev => ({ ...prev, nombre: e.target.value }))}
          />
          <select
            className="w-full mb-2 p-2 border rounded text-black text-sm"
            value={nuevo.nivel}
            onChange={e => setNuevo(prev => ({ ...prev, nivel: e.target.value }))}
          >
            <option value="">— Nivel —</option>
            {Array.from({ length: 6 }, (_, i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
          <select
            className="w-full mb-2 p-2 border rounded text-black text-sm"
            value={nuevo.genero}
            onChange={e => setNuevo(prev => ({ ...prev, genero: e.target.value }))}
          >
            <option value="hombre">Hombre</option>
            <option value="mujer">Mujer</option>
          </select>
          <select
            className="w-full mb-2 p-2 border rounded text-black text-sm"
            value={nuevo.posicion}
            onChange={e => setNuevo(prev => ({ ...prev, posicion: e.target.value }))}
          >
            {['Reves', 'Drive', 'Ambos'].map(o => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
          <select
            className="w-full mb-2 p-2 border rounded text-black text-sm"
            value={nuevo.pista_fija}
            onChange={e => {
              const val = e.target.value;
              setNuevo(prev => ({ ...prev, pista_fija: val === '' ? null : Number(val) }));
            }}
          >
            <option value="">— Pista Inicio —</option>
            {Array.from({ length: numPistas}, (_, i) => (
              <option key={i + 1} value={i + 1}>{i + 1}</option>
            ))}
          </select>
          <select
            className="w-full mb-4 p-2 border rounded text-black text-sm"
            value={nuevo.mano_dominante}
            onChange={e => setNuevo(prev => ({ ...prev, mano_dominante: e.target.value }))}
          >
            <option value="diestro">✋ Diestro</option>
            <option value="zurdo">🫲 Zurdo</option>
          </select>
          <button
            onClick={handleAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-full"
          >
            Agregar
          </button>
        </div>
      )}

      {/* botón emparejar */}
      <div className="text-center mb-6">
        <button
          disabled={!pozoCompleto}
          onClick={onPair}
          className={`px-6 py-2 rounded text-white font-semibold ${
            pozoCompleto ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-500 cursor-not-allowed'
          }`}
        >
          {pozoCompleto ? '🧩 Generar emparejamientos' : 'Esperando participantes...'}
        </button>
      </div>

      {/* resultados */}
      {emparejamientos.length > 0 && (
        <div className="max-w-lg mx-auto mb-6 text-white">
          <h3 className="font-semibold mb-2">Emparejamientos 2v2</h3>
          <ul className="space-y-4">
            {emparejamientos.map((m, i) => (
              <li key={i}>
                <strong>Pista {m.pista}</strong><br />
                Pareja A: {m.teams[0][0].nombre} ({m.teams[0][0].nivel}) +{' '}
                {m.teams[0][1].nombre} ({m.teams[0][1].nivel}) → total {m.totals[0]}, media {m.avgs[0]}<br />
                Pareja B: {m.teams[1][0].nombre} ({m.teams[1][0].nivel}) +{' '}
                {m.teams[1][1].nombre} ({m.teams[1][1].nivel}) → total {m.totals[1]}, media {m.avgs[1]}<br />
                Diferencia media: {m.diffAvg}, diferencia total: {m.diffTot}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* debug */}
      {debugInfo && (
        <div className="max-w-lg mx-auto bg-white/10 p-4 rounded text-xs text-white">
          <h4 className="font-semibold mb-2">¿Por qué se eligió cada emparejamiento?</h4>
          {debugInfo.map(d => (
            <div key={d.pista} className="mb-3">
              <strong>Pista {d.pista}:</strong>{' '}
              {d.selected
                ? `Se evaluaron ${d.trialsCount} opciones y se seleccionó "${d.selected.pairing}" (métrica ${d.selected.metric}, ${d.selected.reason}).`
                : 'No había grupo válido de 4 jugadores.'}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
