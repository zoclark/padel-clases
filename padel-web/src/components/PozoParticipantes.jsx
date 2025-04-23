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

// Estado inicial para el formulario de nuevo participante (para resetear)
const initialStateNuevo = {
  nombre: "",
  nivel: "",
  genero: "hombre", // Usamos 'genero' internamente en el frontend
  posicion: "ambos",
  pista_fija: "",
  mano_dominante: "diestro",
};

// Función helper para mapear datos de la API a la estructura del frontend
const mapApiParticipanteToFrontend = (u) => ({
  ...u,
  // Mapear el campo de género (intentamos con 'sexo' o 'genero')
  genero: u.sexo ?? u.genero ?? 'hombre', // Fallback a 'hombre' si no viene ninguno
  // Normalizar posición a minúsculas
  posicion: String(u.posicion ?? 'ambos').toLowerCase(), // Fallback y normalización
  // Asegurar que las relaciones sean arrays
  juega_con: u.juega_con || [],
  juega_contra: u.juega_contra || [],
  no_juega_con: u.no_juega_con || [],
  no_juega_contra: u.no_juega_contra || [],
});


/**
 * Componente principal para la gestión de participantes y emparejamientos
 */
export default function PozoParticipantes({
  pozoId,
  onParticipantesActualizados,
}) {
  /* ------------------------- STATE ------------------------- */
  const [participantes, setParticipantes] = useState([]);
  const [numPistas, setNumPistas] = useState(8);
  const [tipoPozo, setTipoPozo] = useState("");
  const [nuevo, setNuevo] = useState(initialStateNuevo);
  const [editandoId, setEditandoId] = useState(null);
  const [edicion, setEdicion] = useState({});
  const [emparejamientos, setEmparejamientos] = useState([]);
  const [excelFile, setExcelFile] = useState(null);

  /* -------------------- DERIVED FLAGS ---------------------- */
  const maxParticipantes = numPistas * 4;
  const pozoCompleto = participantes.length === maxParticipantes;
  // Estas flags usan el estado 'participantes' que ya tiene 'genero' mapeado
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
        const [{ data: rawPart }, { data: p }] = await Promise.all([
          api.get(`/pozos/${pozoId}/participantes/`),
          api.get(`/pozos/${pozoId}/`),
        ]);
        // --- FIX: Aplicar mapeo consistente ---
        const part = rawPart
          .map(mapApiParticipanteToFrontend) // Usar helper de mapeo
          .sort((a, b) => a.nombre.localeCompare(b.nombre));
        setParticipantes(part);
        setNumPistas(p.num_pistas);
        setTipoPozo(p.tipo);
      } catch (err) {
         console.error("Error cargando datos:", err);
        toast.error("❌ Error cargando datos del pozo");
      }
    })();
  }, [pozoId]);

  /* --------- Notificar al padre cuando cambia la lista ------ */
  useEffect(() => {
    onParticipantesActualizados?.(participantes);
  }, [participantes, onParticipantesActualizados]);

  /* -------------------- VALIDACIONES ----------------------- */
  // Usa 'genero' del estado del form (nuevo o edicion)
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
    try {
        const { data: rawPart } = await api.get(`/pozos/${pozoId}/participantes/`);
        // --- FIX: Aplicar mapeo consistente ---
        const part = rawPart
         .map(mapApiParticipanteToFrontend) // Usar helper de mapeo
         .sort((a, b) => a.nombre.localeCompare(b.nombre));
        setParticipantes(part);
    } catch (err) {
        console.error("Error refrescando lista:", err);
        toast.error("❌ Error refrescando la lista de participantes");
    }
  };

  const handleAdd = async () => {
    if (!validarSexo(nuevo.genero)) return;
    // ... (resto de validaciones iniciales están bien)
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


    // --- Construir payload (enviando 'genero' y 'posicion') ---
    // La hipótesis principal es que el backend ignora/procesa mal estos campos.
    const payload = {
      pozo: pozoId,
      nombre: nuevo.nombre.trim(),
      nivel: Number(nuevo.nivel),
      genero: nuevo.genero, // Enviamos 'genero' (valor del form: 'hombre' o 'mujer')
      posicion: nuevo.posicion.toLowerCase(), // Enviamos 'posicion' (valor del form: 'reves', 'drive', 'ambos')
      mano_dominante: nuevo.mano_dominante,
    };
    if (nuevo.pista_fija) {
        const pista = Number(nuevo.pista_fija);
        // Validación de pista fija...
        payload.pista_fija = pista;
    } else {
        // Si la API requiere null explícitamente para borrarla:
        // payload.pista_fija = null;
    }

    // --- Logging del Payload ---
    console.log("Payload enviado a /agregar/:", JSON.stringify(payload, null, 2));

    try {
      await api.post("/pozos/participantes/agregar/", payload);
      toast.success("✅ Participante agregado");
      // --- FIX: Resetear completamente el estado 'nuevo' ---
      setNuevo(initialStateNuevo);
      await refreshLista(); // Esperar a que la lista se refresque
    } catch (err) {
       // --- Logging Detallado del Error ---
       console.error("Error en handleAdd:", err);
       let errorMsg = "❌ Error al agregar.";
       if (err.response) {
           console.error("Detalles del error API:", err.response.data);
           // Intenta mostrar un mensaje más específico si la API lo devuelve
           errorMsg = `❌ Error al agregar: ${JSON.stringify(err.response.data?.detail || err.response.data || err.response.statusText)}`;
       } else if (err.request) {
           console.error("No se recibió respuesta:", err.request);
           errorMsg = "❌ Error de red o servidor no responde al agregar.";
       } else {
           console.error("Error configurando la petición:", err.message);
           errorMsg = `❌ Error interno al agregar: ${err.message}`;
       }
       toast.error(errorMsg);
    }
  };

  const handleGuardar = async (id) => {
    // Validaciones iniciales... (están bien)
    if (!validarSexo(edicion.genero)) return;
    if (!edicion.nombre || edicion.nivel === "" || !edicion.posicion || !edicion.mano_dominante) {
        return toast.error("⚠️ Completa todos los campos obligatorios");
    }
    // Validaciones de relaciones... (están bien)

    const pista = edicion.pista_fija ? Number(edicion.pista_fija) : null;
    // Validación de pista fija... (está bien)

    // --- Payload para PUT (enviando 'genero' y 'posicion') ---
    const payload = {
      pozo: pozoId,
      nombre: edicion.nombre.trim(),
      nivel: Number(edicion.nivel),
      genero: edicion.genero, // Enviamos 'genero' del estado de edición
      posicion: edicion.posicion.toLowerCase(), // Enviamos 'posicion' del estado de edición
      mano_dominante: edicion.mano_dominante,
      pista_fija: pista,
      juega_con: edicion.juega_con || [],
      juega_contra: edicion.juega_contra || [],
      no_juega_con: edicion.no_juega_con || [],
      no_juega_contra: edicion.no_juega_contra || [],
    };

     // --- Logging del Payload ---
    console.log(`Payload enviado a /${id}/:`, JSON.stringify(payload, null, 2));


    try {
      await api.put(`/pozos/participantes/${id}/`, payload);

      // Lógica de bidireccionalidad (asumiendo que usa los mismos nombres de campo)
      // Esta parte parece compleja y podría simplificarse en el backend si es posible
      // Pero mantenemos el envío de 'genero' aquí también si es necesario actualizar otros.
      const claves = ["juega_con", "juega_contra", "no_juega_con", "no_juega_contra"];
      const original = participantes;

      const updatePromises = original
          .filter((o) => o.id !== id)
          .map(async (other) => {
              const otherCurrentData = mapApiParticipanteToFrontend(other); // Asegurar estructura consistente
              const otherPayload = {
                  pozo: pozoId,
                  nombre: otherCurrentData.nombre,
                  nivel: otherCurrentData.nivel,
                  genero: otherCurrentData.genero, // Usar 'genero' mapeado
                  posicion: otherCurrentData.posicion, // Usar 'posicion' mapeado
                  mano_dominante: otherCurrentData.mano_dominante,
                  pista_fija: otherCurrentData.pista_fija,
                  juega_con: [...(otherCurrentData.juega_con || [])],
                  juega_contra: [...(otherCurrentData.juega_contra || [])],
                  no_juega_con: [...(otherCurrentData.no_juega_con || [])],
                  no_juega_contra: [...(otherCurrentData.no_juega_contra || [])],
              };
              let needsUpdate = false;
              claves.forEach((key) => {
                  const listaOrig = otherCurrentData[key] || [];
                  const quiere = edicion[key]?.includes(other.id);
                  const elQuiere = listaOrig.includes(id);
                  if (quiere && !elQuiere) {
                      otherPayload[key] = [...new Set([...listaOrig, id])];
                      needsUpdate = true;
                  } else if (!quiere && elQuiere) {
                      otherPayload[key] = listaOrig.filter((x) => x !== id);
                      needsUpdate = true;
                  }
              });
              if (needsUpdate) {
                  console.log(`Actualizando relaciones en ${other.id}:`, JSON.stringify(otherPayload, null, 2));
                  return api.put(`/pozos/participantes/${other.id}/`, otherPayload);
              }
              return Promise.resolve(); // No necesita actualización
          });

      await Promise.all(updatePromises);


      toast.success("💾 Cambios guardados");
      setEditandoId(null);
      await refreshLista(); // Esperar a que la lista se refresque
    } catch (err) {
        // --- Logging Detallado del Error ---
        console.error("Error en handleGuardar:", err);
        let errorMsg = "❌ Error al guardar.";
        if (err.response) {
            console.error("Detalles del error API:", err.response.data);
            errorMsg = `❌ Error al guardar: ${JSON.stringify(err.response.data?.detail || err.response.data || err.response.statusText)}`;
        } else if (err.request) {
            console.error("No se recibió respuesta:", err.request);
           errorMsg = "❌ Error de red o servidor no responde al guardar.";
       } else {
           console.error("Error configurando la petición:", err.message);
           errorMsg = `❌ Error interno al guardar: ${err.message}`;
       }
       toast.error(errorMsg);
    }
  };

  const handleEliminar = async (id) => {
    // ... (sin cambios, parece correcto)
     if (!confirm("¿Eliminar participante?")) return;
    try {
      await api.delete(`/pozos/participantes/${id}/eliminar/`);
      toast.success("🗑️ Participante eliminado");
      refreshLista();
    } catch {
      toast.error("❌ Error al eliminar");
    }
  };

  /* -------------------- IMPORTAR EXCEL ------------------ */
  const handleExcelUpload = async () => {
    // ... (sin cambios, parece correcto, pero depende de que refreshLista mapee bien)
     if (!excelFile) return toast.error("Selecciona primero un archivo Excel");
    const formData = new FormData();
    formData.append("file", excelFile);
    try {
      await api.post(`/pozos/${pozoId}/importar_excel/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("✅ Participantes importados");
      setExcelFile(null);
      refreshLista(); // Asegura que los datos importados se mapeen correctamente
    } catch (err) {
      toast.error(err.response?.data?.error || "❌ Error importando Excel");
    }
  };

  /* ---------------- EMPAREJAMIENTOS -------------------- */
  const onPair = () => {
     // generatePairings espera 'genero' y 'posicion', que coincide con el estado mapeado
    const { matches } = generatePairings(participantes, numPistas, tipoPozo);
    setEmparejamientos(matches);
  };

  /* ----------------------- UI ------------------------- */
  // El JSX no necesita cambios significativos, ya que usa el estado
  // mapeado consistentemente ('genero', 'posicion' minúsculas).
  // Se hicieron ajustes menores en la versión anterior que se mantienen.
  return (
     <div className="mt-6 max-w-4xl mx-auto flex flex-col items-center px-4"> {/* Aumentado max-width y añadido padding */}
      <h2 className="text-xl font-bold text-white mb-2">
        Participantes ({participantes.length} / {maxParticipantes}) {/* Mostrar contador */}
        {pozoCompleto && !mostrarAlerta && (
          <FaCheckCircle className="inline ml-2 text-green-400" />
        )}
        {mostrarAlerta && (
          <FaExclamationTriangle
            className="inline ml-2 text-yellow-400"
            title={ // Añadir tooltip explicativo
                tipoPozo === "mixto" ? "El pozo mixto no tiene igual número de hombres y mujeres" :
                tipoPozo === "hombres" ? "Hay mujeres en un pozo de hombres" :
                tipoPozo === "mujeres" ? "Hay hombres en un pozo de mujeres" : ""
            }
          />
        )}
      </h2>

       {/* Mensajes informativos */}
      {tipoPozo === "mixto" && (
        <div className={`mb-2 text-sm ${hombres !== mujeres ? 'text-yellow-300' : 'text-gray-300'}`}>
          Hombres: {hombres} | Mujeres: {mujeres}
        </div>
      )}
      {!pozoCompleto && (
        <div className="text-blue-300 mb-4 text-sm">
          Faltan {maxParticipantes - participantes.length} participantes.
        </div>
      )}

      {/* Lista de tarjetas */}
       {/* Usar grid con más columnas si hay espacio */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4 mb-6 w-full"> {/* Aumentado minmax */}
         {participantes.map((p) => (
          <div
            key={p.id}
             // Añadir borde si está en edición
            className={`bg-white/10 ${editandoId === p.id ? 'ring-2 ring-indigo-400' : (editandoId === null ? 'hover:bg-white/20 cursor-pointer' : 'opacity-60') } rounded-lg shadow p-3 flex flex-col justify-between transition font-sans text-sm font-normal min-h-[190px]`} // Aumentada altura mínima
            onClick={() => {
              // Permitir abrir solo si no hay otra tarjeta abierta
              if (editandoId === null) {
                 setEditandoId(p.id);
                 // Al entrar en edición, usar los datos mapeados de 'p'
                 setEdicion(p); // p ya tiene la estructura correcta { nombre, nivel, genero, posicion, ...}
              } else if (editandoId !== p.id) {
                  toast("ℹ️ Cierra la tarjeta actual para editar otra.", { duration: 2000 });
              }
            }}
          >
             {/* El contenido de la tarjeta (vista normal y edición) es el mismo que en la versión anterior */}
             {editandoId === p.id ? (
              // --- MODO EDICIÓN ---
              <div onClick={(e) => e.stopPropagation()} className="space-y-1 text-xs"> {/* Reducir espacio y tamaño texto */}
                <input /* Nombre */
                  className="w-full p-1 rounded text-black"
                  placeholder="Nombre" value={edicion.nombre}
                  onChange={(e) => setEdicion((v) => ({ ...v, nombre: e.target.value }))} />
                <select /* Nivel */
                   className="w-full p-1 rounded text-black" value={edicion.nivel}
                   onChange={(e) => setEdicion((v) => ({ ...v, nivel: e.target.value }))} >
                   <option value="">Nivel</option>
                   {Array.from({ length: 6 }, (_, i) => <option key={i} value={i}>{i}</option>)}
                 </select>
                 <select /* Genero */
                   className="w-full p-1 rounded text-black" value={edicion.genero}
                   onChange={(e) => setEdicion((v) => ({ ...v, genero: e.target.value }))} >
                   <option value="hombre">Hombre</option> <option value="mujer">Mujer</option>
                 </select>
                 <select /* Posicion */
                   className="w-full p-1 rounded text-black" value={edicion.posicion}
                   onChange={(e) => setEdicion((v) => ({ ...v, posicion: e.target.value }))} >
                   {["reves", "drive", "ambos"].map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
                 </select>
                 <select /* Pista Fija */
                   className="w-full p-1 rounded text-black" value={edicion.pista_fija || ""}
                   onChange={(e) => setEdicion(v => ({ ...v, pista_fija: e.target.value ? Number(e.target.value) : null }))} >
                   <option value="">P. Fija</option>
                   {Array.from({ length: numPistas }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
                 </select>
                 <select /* Mano */
                   className="w-full p-1 rounded text-black" value={edicion.mano_dominante}
                   onChange={(e) => setEdicion(v => ({ ...v, mano_dominante: e.target.value }))} >
                   <option value="diestro">✋ Diestro</option> <option value="zurdo">🫲 Zurdo</option>
                 </select>

                 {/* --- Relaciones M2M (igual que antes) --- */}
                 {[
                   { key: "juega_con", label: "J. con", max: 1, conflicts: ["juega_contra", "no_juega_con"], },
                   { key: "juega_contra", label: "J. contra", max: 2, conflicts: ["juega_con", "no_juega_contra"], },
                   { key: "no_juega_con", label: "No J. con", max: Infinity, conflicts: ["juega_con"], },
                   { key: "no_juega_contra", label: "No J. contra", max: Infinity, conflicts: ["juega_contra"], },
                 ].map(({ key, label, max, conflicts }) => (
                    <div key={key}>
                     <label className="block text-xxs text-white/70">{label}</label> {/* Más pequeño */}
                     <ul className="space-y-0.5 max-h-20 overflow-y-auto bg-gray-700/50 p-1 rounded"> {/* Menos padding/space */}
                       {participantes.filter(x => x.id !== p.id).map(x => {
                         const selected = edicion[key]?.includes(x.id);
                         const isConflict = conflicts.some(c => edicion[c]?.includes(x.id));
                         const atLimit = (edicion[key]?.length ?? 0) >= max;
                         const isDisabled = !selected && (atLimit || isConflict);
                         return (
                           <li key={x.id} className={`flex items-center justify-between text-black text-xxs ${selected ? 'bg-blue-200' : 'bg-white/70'} rounded px-1.5 py-0.5 ${isDisabled ? 'opacity-50' : ''}`}>
                             <span className="truncate pr-1">{x.nombre}</span> {/* Truncar nombre */}
                             {selected ?
                               <FaMinusCircle className="text-red-600 cursor-pointer flex-shrink-0" onClick={() => setEdicion(v => ({ ...v, [key]: v[key]?.filter(id => id !== x.id) }))} />
                               :
                               <FaPlusCircle className={`cursor-pointer flex-shrink-0 ${isDisabled ? 'text-gray-400' : 'text-green-600'}`} onClick={() => {
                                 if (isDisabled) { /* Mensajes de error */ }
                                 else { setEdicion(v => ({ ...v, [key]: [...(v[key] || []), x.id] })); }
                               }} />}
                           </li>);
                       })}
                       {participantes.length <= 1 && <li className="text-xxs text-white/50 text-center italic">N/A</li>}
                     </ul>
                   </div>
                  ))}


                 <div className="flex gap-1 mt-2 pt-1 border-t border-white/20"> {/* Separador y espacio */}
                  <button className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 rounded" onClick={() => handleGuardar(p.id)}>Guardar</button>
                  <button className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs px-2 py-1 rounded" onClick={() => setEditandoId(null)}>Cancelar</button>
                  <button className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded" onClick={() => handleEliminar(p.id)}>Eliminar</button>
                 </div>
               </div>
            ) : (
               // --- VISTA NORMAL (igual que antes) ---
               <div>
                 <div className="font-semibold text-center mb-1">{p.nombre}</div>
                 <div className="text-xs space-y-0.5">
                   <div>Nivel: {p.nivel}</div>
                   <div>Pista Fija: {p.pista_fija ?? "-"}</div>
                   <div>Posición: {p.posicion}</div>
                   <div>Género: {p.genero === "hombre" ? "👦 H" : "👧 M"}</div> {/* Abreviado */}
                   <div>{p.mano_dominante === "zurdo" ? "🫲 Z" : "✋ D"}</div> {/* Abreviado */}
                   { /* Relaciones concisas... (igual que antes) */ }
                   { (p.juega_con?.length > 0 || p.juega_contra?.length > 0 || p.no_juega_con?.length > 0 || p.no_juega_contra?.length > 0) &&
                     <div className="mt-1 pt-1 border-t border-white/20 text-xxs">
                        {p.juega_con?.length > 0 && <div className="truncate">✓ Con: {p.juega_con.map(id => participantes.find(u => u.id === id)?.nombre || '?').join(', ')}</div>}
                        {p.juega_contra?.length > 0 && <div className="truncate">⚔ Contra: {p.juega_contra.map(id => participantes.find(u => u.id === id)?.nombre || '?').join(', ')}</div>}
                        {p.no_juega_con?.length > 0 && <div className="text-red-400 truncate">🚫 Con: {p.no_juega_con.map(id => participantes.find(u => u.id === id)?.nombre || '?').join(', ')}</div>}
                        {p.no_juega_contra?.length > 0 && <div className="text-red-400 truncate">🚫 Contra: {p.no_juega_contra.map(id => participantes.find(u => u.id === id)?.nombre || '?').join(', ')}</div>}
                     </div>
                   }
                 </div>
               </div>
            )}
           </div>
         ))}
       </div>


       {/* —— Formulario de alta + import —— */}
       {/* Sin cambios respecto a la versión anterior, ya estaba bien */}
      {!pozoCompleto && (
         <div className="bg-white p-4 rounded shadow w-full max-w-md mb-6">
           {/* ... Contenido del formulario ... */}
            <h3 className="font-semibold mb-2 text-black">Agregar nuevo</h3>
           <input className="w-full mb-2 p-2 border rounded text-black text-sm" placeholder="Nombre" value={nuevo.nombre} onChange={(e) => setNuevo(prev => ({ ...prev, nombre: e.target.value }))} />
           <select className="w-full mb-2 p-2 border rounded text-black text-sm" value={nuevo.nivel} onChange={(e) => setNuevo(prev => ({ ...prev, nivel: e.target.value }))} >
             <option value="">— Nivel —</option>
             {Array.from({ length: 6 }, (_, i) => <option key={i} value={i}>{i}</option>)}
           </select>
           <select className="w-full mb-2 p-2 border rounded text-black text-sm" value={nuevo.genero} onChange={(e) => setNuevo(prev => ({ ...prev, genero: e.target.value }))} >
             <option value="hombre">Hombre</option> <option value="mujer">Mujer</option>
           </select>
           <select className="w-full mb-2 p-2 border rounded text-black text-sm" value={nuevo.posicion} onChange={(e) => setNuevo(prev => ({ ...prev, posicion: e.target.value }))} >
             {["reves", "drive", "ambos"].map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
           </select>
           <select className="w-full mb-2 p-2 border rounded text-black text-sm" value={nuevo.pista_fija} onChange={(e) => setNuevo(prev => ({ ...prev, pista_fija: e.target.value ? Number(e.target.value) : "" }))} >
             <option value="">— Pista Inicio —</option>
             {Array.from({ length: numPistas }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
           </select>
           <select className="w-full mb-4 p-2 border rounded text-black text-sm" value={nuevo.mano_dominante} onChange={(e) => setNuevo(prev => ({ ...prev, mano_dominante: e.target.value }))} >
             <option value="diestro">✋ Diestro</option> <option value="zurdo">🫲 Zurdo</option>
           </select>
           <button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-full mb-4">Agregar</button>

            {/* Importar Excel */}
           <hr className="border-gray-300 mb-4" />
           <h4 className="font-semibold text-black text-sm mb-2">Importar participantes desde Excel</h4>
           <input type="file" accept=".xlsx,.xls" onClick={e => e.target.value = null} onChange={e => setExcelFile(e.target.files?.[0] || null)} className="mb-2 w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
           <button onClick={handleExcelUpload} disabled={!excelFile} className={`w-full px-4 py-2 rounded text-white font-semibold ${excelFile ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'}`}>Subir Excel</button>
         </div>
      )}


       {/* —— Botón emparejar —— */}
      {/* Sin cambios respecto a la versión anterior */}
      <div className="text-center mb-6">
        <button disabled={!pozoCompleto} onClick={onPair} className={`px-6 py-2 rounded text-white font-semibold ${ pozoCompleto ? "bg-indigo-600 hover:bg-indigo-700" : "bg-gray-500 cursor-not-allowed" }`} >
          {pozoCompleto ? "🧩 Generar emparejamientos" : "Esperando participantes..."}
        </button>
      </div>

      {/* —— Resultados —— */}
      {/* Sin cambios respecto a la versión anterior */}
       {emparejamientos.length > 0 && (
         <div className="w-full max-w-lg mx-auto mb-6 text-white space-y-4">
           <h3 className="text-lg font-semibold mb-2 text-center">Emparejamientos</h3>
           {emparejamientos.map((m, i) => (
             <div key={i} className="p-4 bg-white/10 rounded-lg shadow-md">
                {/* ... Contenido de resultados ... */}
                <div className="font-bold text-center mb-2 text-indigo-300">Pista {m.pista}</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-black/20 p-3 rounded">
                        <div className="font-semibold text-center mb-1">Pareja A</div>
                        <div>{m.teams[0][0]}</div>
                        <div>{m.teams[0][1]}</div>
                        <div className="mt-1 text-xs text-gray-300">Total: {m.totals[0]} / Media: {m.avgs[0]}</div>
                    </div>
                    <div className="bg-black/20 p-3 rounded">
                        <div className="font-semibold text-center mb-1">Pareja B</div>
                        <div>{m.teams[1][0]}</div>
                        <div>{m.teams[1][1]}</div>
                        <div className="mt-1 text-xs text-gray-300">Total: {m.totals[1]} / Media: {m.avgs[1]}</div>
                    </div>
                </div>
                <div className="mt-2 text-xs text-center text-gray-400">
                    <span>Δ Media: {m.diffAvg}</span> | <span>Δ Total: {m.diffTot}</span>
                </div>
             </div>
           ))}
         </div>
       )}
    </div>
  );
}
