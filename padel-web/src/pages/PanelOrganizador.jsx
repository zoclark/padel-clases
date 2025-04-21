// src/components/PanelOrganizador.jsx
import {
    useEffect,
    useState,
    useContext,
    useRef,          // 🔹
    useCallback,     // 🔹
  } from "react";
  import api from "@/api/axiosConfig";
  import PozoParticipantes from "@/components/PozoParticipantes";
  import { AuthContext } from "@/contexts/AuthContext";
  import { motion, AnimatePresence } from "framer-motion";
  import { toast } from "react-hot-toast";
  import { ChevronDown, ChevronUp, Edit2, Check, X } from "lucide-react";
  import { FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";
  
  export default function PanelOrganizador() {
    /* ------------------------- STATE ------------------------- */
    const [pozos, setPozos]                     = useState([]);
    const [tab, setTab]                         = useState("crear"); // "crear" | "listar"
    const [listarMode, setListarMode]           = useState("upcoming"); // "upcoming" | "past"
    const [pozoSeleccionado, setPozoSeleccionado] = useState(null);
  
    const [nuevoPozo, setNuevoPozo] = useState({
      titulo: "",
      fecha: "",
      hora_inicio: "",
      hora_fin: "",
      tipo: "mixto",
      num_pistas: 8,
    });
  
    // inline‑editing
    const [editingId, setEditingId]   = useState(null);
    const [editingData, setEditingData] = useState({});
  
    const { user } = useContext(AuthContext);
  
    /* ------------------- DATA FETCHING ----------------------- */
    const fetchPozos = useCallback(async () => {
      try {
        const res = await api.get("/pozos/");
        setPozos(res.data);
      } catch (err) {
        console.error(err);
      }
    }, []);
  
    useEffect(() => {
      fetchPozos();
    }, [fetchPozos]);
  
    /* ------------ CALLBACK MEMOIZADO POR ID 🔹 --------------- */
    /**
     * Queremos entregar a cada <PozoParticipantes> un callback *estable*
     * que sólo actualice SU pozo.  Para no violar la regla de Hooks
     * usamos un ref‑diccionario que guarda una única función por id.
     */
    const callbacksRef = useRef({});
  
    const getCallbackForId = useCallback((id) => {
      if (!callbacksRef.current[id]) {
        callbacksRef.current[id] = (listaActualizada) => {
          setPozos((prev) =>
            prev.map((p) =>
              p.id === id ? { ...p, participantes: listaActualizada } : p
            )
          );
        };
      }
      return callbacksRef.current[id];
    }, []);
  
    /* ----------------------- CREATE -------------------------- */
    const handleCrearPozo = async () => {
      const { titulo, fecha, hora_inicio, hora_fin, num_pistas } = nuevoPozo;
      if (!titulo || !fecha || !hora_inicio || !hora_fin || !num_pistas) {
        toast.error("Completa todos los campos.");
        return;
      }
      if (hora_fin <= hora_inicio) {
        toast.error("La hora de fin debe ser posterior a la de inicio.");
        return;
      }
      try {
        await api.post("/pozos/crear/", {
          ...nuevoPozo,
          num_pistas: Number(num_pistas),
        });
        toast.success("✅ Pozo creado con éxito.");
        setNuevoPozo({
          titulo: "",
          fecha: "",
          hora_inicio: "",
          hora_fin: "",
          tipo: "mixto",
          num_pistas: 8,
        });
        fetchPozos();
      } catch {
        toast.error("❌ Error al crear pozo.");
      }
    };
  
    /* --------------------- INLINE EDIT ----------------------- */
    const startEditing = (pozo) => {
      setEditingId(pozo.id);
      setEditingData({
        titulo: pozo.titulo,
        fecha: pozo.fecha,
        hora_inicio: pozo.hora_inicio,
        hora_fin: pozo.hora_fin,
        tipo: pozo.tipo,
        num_pistas: pozo.num_pistas,
      });
    };
    const cancelEditing = () => {
      setEditingId(null);
      setEditingData({});
    };
    const saveEditing = async (id) => {
      const { titulo, fecha, hora_inicio, hora_fin, num_pistas } = editingData;
      if (!titulo || !fecha || !hora_inicio || !hora_fin || !num_pistas) {
        toast.error("Completa todos los campos.");
        return;
      }
      if (hora_fin <= hora_inicio) {
        toast.error("La hora de fin debe ser posterior a la de inicio.");
        return;
      }
      try {
        await api.patch(`/pozos/${id}/`, {
          ...editingData,
          num_pistas: Number(num_pistas),
        });
        toast.success("💾 Pozo actualizado.");
        setEditingId(null);
        fetchPozos();
      } catch {
        toast.error("❌ Error al actualizar.");
      }
    };
  
    /* ------------- CLASIFICACIÓN PRÓX / PASADOS -------------- */
    const hoy = new Date().toISOString().slice(0, 10);
    const próximos = pozos
      .filter((p) => p.fecha >= hoy)
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
    const pasados = pozos
      .filter((p) => p.fecha < hoy)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  
    /* ------------------------- UI ---------------------------- */
    return (
      <div className="text-white space-y-6">
        <h2 className="text-lg font-bold text-blue-300">Panel del Organizador</h2>
  
        {/* pestañas */}
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => setTab("crear")}
            className={`px-4 py-2 rounded-xl text-sm font-medium ${
              tab === "crear"
                ? "bg-blue-600 text-white shadow"
                : "bg-white/10 hover:bg-white/20"
            }`}
          >
            Crear Pozo
          </button>
          <button
            onClick={() => setTab("listar")}
            className={`px-4 py-2 rounded-xl text-sm font-medium ${
              tab === "listar"
                ? "bg-blue-600 text-white shadow"
                : "bg-white/10 hover:bg-white/20"
            }`}
          >
            Ver Pozos
          </button>
        </div>
  
        {/* ---------- CREAR POZO ---------- */}
        {tab === "crear" && (
          <div className="bg-white/90 backdrop-blur-md text-black p-6 rounded-2xl shadow-xl max-w-md mx-auto space-y-4">
            <h3 className="text-xl font-semibold">Nuevo Pozo</h3>
            <input
              type="text"
              placeholder="Título"
              className="w-full p-2 rounded-lg border text-black"
              value={nuevoPozo.titulo}
              onChange={(e) =>
                setNuevoPozo({ ...nuevoPozo, titulo: e.target.value })
              }
            />
            <input
              type="date"
              className="w-full p-2 rounded-lg border text-black"
              value={nuevoPozo.fecha}
              onChange={(e) =>
                setNuevoPozo({ ...nuevoPozo, fecha: e.target.value })
              }
            />
            <div className="flex gap-2">
              <input
                type="time"
                className="flex-1 p-2 rounded-lg border text-black"
                value={nuevoPozo.hora_inicio}
                onChange={(e) =>
                  setNuevoPozo({ ...nuevoPozo, hora_inicio: e.target.value })
                }
              />
              <input
                type="time"
                className="flex-1 p-2 rounded-lg border text-black"
                value={nuevoPozo.hora_fin}
                onChange={(e) =>
                  setNuevoPozo({ ...nuevoPozo, hora_fin: e.target.value })
                }
              />
            </div>
            <select
              className="w-full p-2 rounded-lg border text-black"
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
              min={1}
              className="w-full p-2 rounded-lg border text-black"
              placeholder="Número de pistas"
              value={nuevoPozo.num_pistas}
              onChange={(e) =>
                setNuevoPozo({ ...nuevoPozo, num_pistas: e.target.value })
              }
            />
            <button
              onClick={handleCrearPozo}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg"
            >
              Crear pozo
            </button>
          </div>
        )}
  
        {/* ---------- LISTAR POZOS ---------- */}
        {tab === "listar" && (
          <div className="space-y-6">
            {/* selector Próximos / Pasados */}
            <div className="flex gap-4">
              <button
                onClick={() => setListarMode("upcoming")}
                className={`px-3 py-1 rounded text-sm ${
                  listarMode === "upcoming"
                    ? "bg-blue-500 text-white"
                    : "bg-white/10 hover:bg-white/20"
                }`}
              >
                Próximos
              </button>
              <button
                onClick={() => setListarMode("past")}
                className={`px-3 py-1 rounded text-sm ${
                  listarMode === "past"
                    ? "bg-blue-500 text-white"
                    : "bg-white/10 hover:bg-white/20"
                }`}
              >
                Pasados
              </button>
            </div>
  
            {/* tarjetas de pozos */}
            <div className="flex flex-col gap-4">
              {(listarMode === "upcoming" ? próximos : pasados).map((p) => {
                const cap        = p.num_pistas * 4;
                const inscritos  = p.participantes?.length || 0;
                const full       = inscritos === cap;
                const isSel      = pozoSeleccionado === p.id;
  
                return (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className={`border-2 rounded-xl p-4 shadow transition ${
                      isSel
                        ? "border-blue-400 bg-white/20"
                        : "border-white/10 bg-white/5 hover:border-blue-300"
                    }`}
                  >
                    {/* encabezado tarjeta */}
                    <div className="flex justify-between items-start">
                      <div className="space-y-1 text-sm flex-1">
                        {editingId === p.id ? (
                          /* ----- EDITAR POZO ----- */
                          <>
                            <input
                              className="w-full p-1 rounded border text-black"
                              value={editingData.titulo}
                              onChange={(e) =>
                                setEditingData({
                                  ...editingData,
                                  titulo: e.target.value,
                                })
                              }
                            />
                            <input
                              type="date"
                              className="w-full p-1 rounded border text-black"
                              value={editingData.fecha}
                              onChange={(e) =>
                                setEditingData({
                                  ...editingData,
                                  fecha: e.target.value,
                                })
                              }
                            />
                            <div className="flex gap-1">
                              <input
                                type="time"
                                className="flex-1 p-1 rounded border text-black"
                                value={editingData.hora_inicio}
                                onChange={(e) =>
                                  setEditingData({
                                    ...editingData,
                                    hora_inicio: e.target.value,
                                  })
                                }
                              />
                              <input
                                type="time"
                                className="flex-1 p-1 rounded border text-black"
                                value={editingData.hora_fin}
                                onChange={(e) =>
                                  setEditingData({
                                    ...editingData,
                                    hora_fin: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <select
                              className="w-full p-1 rounded border text-black"
                              value={editingData.tipo}
                              onChange={(e) =>
                                setEditingData({
                                  ...editingData,
                                  tipo: e.target.value,
                                })
                              }
                            >
                              <option value="mixto">Mixto</option>
                              <option value="parejas">Por parejas</option>
                              <option value="hombres">Solo hombres</option>
                              <option value="mujeres">Solo mujeres</option>
                            </select>
                            <input
                              type="number"
                              min={1}
                              className="w-full p-1 rounded border text-black"
                              value={editingData.num_pistas}
                              onChange={(e) =>
                                setEditingData({
                                  ...editingData,
                                  num_pistas: e.target.value,
                                })
                              }
                            />
                          </>
                        ) : (
                          /* ----- VISTA POZO ----- */
                          <>
                            <p className="font-bold text-base text-blue-200">
                              {p.titulo}
                            </p>
                            <p>📅 {p.fecha}</p>
                            <p>
                              🕒 {p.hora_inicio} — {p.hora_fin}
                            </p>
                            <p>
                              🎾 {p.tipo} | 🛏️ {p.num_pistas} pistas
                            </p>
                            <p className="flex items-center gap-1">
                              👥 {inscritos}/{cap}{" "}
                              {full ? (
                                <FaCheckCircle className="text-green-400" />
                              ) : (
                                <FaExclamationTriangle className="text-yellow-400" />
                              )}
                            </p>
                          </>
                        )}
                      </div>
  
                      {/* botones acciones tarjeta */}
                      <div className="flex flex-col items-end gap-2 ml-2">
                        {editingId === p.id ? (
                          <>
                            <button
                              onClick={() => saveEditing(p.id)}
                              className="p-1"
                            >
                              <Check size={18} />
                            </button>
                            <button onClick={cancelEditing} className="p-1">
                              <X size={18} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEditing(p)}
                              className="p-1"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() =>
                                setPozoSeleccionado(
                                  isSel ? null : p.id           // toggle
                                )
                              }
                              className="p-1 text-blue-300"
                            >
                              {isSel ? (
                                <ChevronUp size={18} />
                              ) : (
                                <ChevronDown size={18} />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
  
                    {/* ---------- PARTICIPANTES ---------- */}
                    <AnimatePresence>
                      {isSel && editingId !== p.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="mt-2"
                        >
                          <PozoParticipantes
                            pozoId={p.id}
                            onParticipantesActualizados={getCallbackForId(p.id)} // 🔹 estable
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }
  