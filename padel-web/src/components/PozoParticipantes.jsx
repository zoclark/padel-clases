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
import { useAuth } from "@/contexts/AuthContext"; // al principio
import * as XLSX from "xlsx"; // <-- NUEVO: para Excel

// --- Validaciones helpers (CENTRALIZADAS) ---

function validarNoJuegaConPistaFija(participantes, idA, idB) {
  const A = participantes.find(p => p.id === idA);
  const B = participantes.find(p => p.id === idB);
  if (!A || !B) return false;
  if (A.pista_fija && B.pista_fija && A.pista_fija === B.pista_fija) {
    toast.error(`No puedes poner a ${A.nombre} y ${B.nombre} como 'no juega con/contra' y además en la misma pista fija (${A.pista_fija}).`);
    return true;
  }
  return false;
}

function validarJuegaCon(participante, seleccionado, participantes, edicion) {
  if ((edicion.juega_con?.length ?? 0) >= 1) {
    toast.error("Sólo puedes elegir un compañero en 'juega_con'.");
    return false;
  }
  const seleccionadoObj = participantes.find(p => p.id === seleccionado);
  if (
    edicion.no_juega_con?.includes(seleccionado) ||
    edicion.no_juega_contra?.includes(seleccionado) ||
    seleccionadoObj?.no_juega_con?.includes(participante.id) ||
    seleccionadoObj?.no_juega_contra?.includes(participante.id)
  ) {
    toast.error("No puedes elegir como compañero a alguien con el que tienes conflicto (no juega con/contra).");
    return false;
  }
  // ⚠️ Validación añadida:
  if (
    (edicion.pista_fija && seleccionadoObj?.pista_fija) &&
    (edicion.pista_fija !== seleccionadoObj.pista_fija)
  ) {
    toast.error(`Para ser compañeros, deben tener la misma pista fija (${edicion.pista_fija} vs ${seleccionadoObj.pista_fija}) o ninguna.`);
    return false;
  }
  return true;
}
function validarJuegaContra(participante, seleccionado, participantes, edicion) {
  if ((edicion.juega_contra?.length ?? 0) >= 2) {
    toast.error("Sólo puedes elegir dos rivales en 'juega_contra'.");
    return false;
  }
  const seleccionadoObj = participantes.find(p => p.id === seleccionado);
  if (
    edicion.no_juega_con?.includes(seleccionado) ||
    edicion.no_juega_contra?.includes(seleccionado) ||
    seleccionadoObj?.no_juega_con?.includes(participante.id) ||
    seleccionadoObj?.no_juega_contra?.includes(participante.id)
  ) {
    toast.error("No puedes elegir como rival a alguien con el que tienes conflicto (no juega con/contra).");
    return false;
  }
  return true;
}
function validarNoJuegaCon(participante, seleccionado, participantes, edicion) {
  const seleccionadoObj = participantes.find(p => p.id === seleccionado);
  // Evita seleccionar si ya es compañero
  if (edicion.juega_con?.includes(seleccionado) || seleccionadoObj?.juega_con?.includes(participante.id)) {
    toast.error("No puedes poner 'no juega con' a alguien que es tu compañero.");
    return false;
  }
  // Valida pista fija conflictiva
  if (participante.pista_fija && seleccionadoObj?.pista_fija && participante.pista_fija === seleccionadoObj.pista_fija) {
    toast.error(`No puedes poner 'no juega con' a ${seleccionadoObj.nombre} si ambos tenéis la misma pista fija.`);
    return false;
  }
  return true;
}
function validarNoJuegaContra(participante, seleccionado, participantes, edicion) {
  const seleccionadoObj = participantes.find(p => p.id === seleccionado);
  // Evita seleccionar si ya es rival
  if (edicion.juega_contra?.includes(seleccionado) || seleccionadoObj?.juega_contra?.includes(participante.id)) {
    toast.error("No puedes poner 'no juega contra' a alguien que es tu rival obligatorio.");
    return false;
  }
  // Valida pista fija conflictiva
  if (participante.pista_fija && seleccionadoObj?.pista_fija && participante.pista_fija === seleccionadoObj.pista_fija) {
    toast.error(`No puedes poner 'no juega contra' a ${seleccionadoObj.nombre} si ambos tenéis la misma pista fija.`);
    return false;
  }
  return true;
}

// Hook para validar toda la edición/guardado/importación
function validarParticipanteCompleto(participante, participantes, tipoPozo) {
  if ((participante.juega_con?.length ?? 0) > 1) {
    toast.error(`${participante.nombre} tiene más de un compañero en 'juega_con'.`);
    return false;
  }
  if ((participante.juega_contra?.length ?? 0) > 2) {
    toast.error(`${participante.nombre} tiene más de dos rivales en 'juega_contra'.`);
    return false;
  }
  // Validar conflictos de relaciones cruzadas
  for (let id of participante.juega_con || []) {
    if ((participante.no_juega_con?.includes(id)) || (participante.no_juega_contra?.includes(id))) {
      toast.error(`${participante.nombre}: conflicto entre 'juega_con' y 'no juega con/contra' con ${participantes.find(p => p.id === id)?.nombre}`);
      return false;
    }
    const o = participantes.find(p => p.id === id);
    if ((o?.no_juega_con?.includes(participante.id)) || (o?.no_juega_contra?.includes(participante.id))) {
      toast.error(`${participante.nombre}: conflicto entre 'juega_con' y 'no juega con/contra' con ${o?.nombre}`);
      return false;
    }
    // ⚠️ Validación añadida
    if (
        (participante.pista_fija && o?.pista_fija) &&
        participante.pista_fija !== o.pista_fija
      ) {
        toast.error(`${participante.nombre} y ${o?.nombre} son compañeros pero tienen pistas fijas distintas.`);
        return false;
      }
  }
  for (let id of participante.juega_contra || []) {
    if ((participante.no_juega_con?.includes(id)) || (participante.no_juega_contra?.includes(id))) {
      toast.error(`${participante.nombre}: conflicto entre 'juega_contra' y 'no juega con/contra' con ${participantes.find(p => p.id === id)?.nombre}`);
      return false;
    }
    const o = participantes.find(p => p.id === id);
    if ((o?.no_juega_con?.includes(participante.id)) || (o?.no_juega_contra?.includes(participante.id))) {
      toast.error(`${participante.nombre}: conflicto entre 'juega_contra' y 'no juega con/contra' con ${o?.nombre}`);
      return false;
    }
  }
  for (let id of [...(participante.no_juega_con ?? []), ...(participante.no_juega_contra ?? [])]) {
    if (validarNoJuegaConPistaFija(participantes, participante.id, id)) {
      return false;
    }
  }
  // Género según tipo de pozo
  if ((tipoPozo === "hombres" && participante.genero !== "hombre") ||
      (tipoPozo === "mujeres" && participante.genero !== "mujer")) {
    toast.error(`${participante.nombre} tiene un género no permitido para este pozo.`);
    return false;
  }
  return true;
}

// Estado inicial para el formulario de nuevo participante (para resetear)
const initialStateNuevo = {
  nombre: "",
  nivel: "",
  genero: "hombre",
  posicion: "ambos",
  pista_fija: "",
  mano_dominante: "diestro",
};

// Función helper para mapear datos de la API a la estructura del frontend
const mapApiParticipanteToFrontend = (u) => ({
  ...u,
  genero: u.sexo ?? u.genero ?? 'hombre',
  posicion: String(u.posicion ?? 'ambos').toLowerCase(),
  juega_con: u.juega_con || [],
  juega_contra: u.juega_contra || [],
  no_juega_con: u.no_juega_con || [],
  no_juega_contra: u.no_juega_contra || [],
});

export default function PozoParticipantes({
  pozoId,
  onParticipantesActualizados,
}) {
  const { user } = useAuth(); // ✅ ESTO FALTABA
  const [participantes, setParticipantes] = useState([]);
  const [numPistas, setNumPistas] = useState(8);
  const [tipoPozo, setTipoPozo] = useState("");
  const [nuevo, setNuevo] = useState(initialStateNuevo);
  const [editandoId, setEditandoId] = useState(null);
  const [edicion, setEdicion] = useState({});
  const [emparejamientos, setEmparejamientos] = useState([]);
  const [excelFile, setExcelFile] = useState(null);
  const [excelPreview, setExcelPreview] = useState([]);
  const [excelWarnings, setExcelWarnings] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  const maxParticipantes = numPistas * 4;
  const pozoCompleto = participantes.length === maxParticipantes;
  const hombres = participantes.filter((p) => p.genero === "hombre").length;
  const mujeres = participantes.length - hombres;
  const mostrarAlerta =
    (tipoPozo === "mixto" && hombres !== mujeres) ||
    (tipoPozo === "hombres" && mujeres > 0) ||
    (tipoPozo === "mujeres" && hombres > 0);


// --- Helpers Excel ---
function normalizaGenero(val) {
  if (!val) return "hombre";
  const v = String(val).trim().toLowerCase();
  if (["masculino", "h", "m", "hombre"].includes(v)) return "hombre";
  if (["femenino", "mujer"].includes(v)) return "mujer";
  return v; // fallback
}

// 🔴 CAMBIO: Helpers Excel (Punto 3)
function normalizaGenero(val) {
    if (!val) return "hombre";
    const v = String(val).trim().toLowerCase();
    if (["masculino", "h", "m", "hombre"].includes(v)) return "hombre";
    if (["femenino", "mujer"].includes(v)) return "mujer";
    return v;
  }



// --- Leer y validar Excel ---
const handleExcelChange = async (e) => {
  const file = e.target.files?.[0];
  setExcelFile(file || null);
  if (!file) {
    setExcelPreview([]);
    setExcelWarnings([]);
    return;
  }
  try {
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    let rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

    // Normalización de filas
    rows = rows.map((row) => {
      let nombre = (row.nombre || row.Nombre || row.NOMBRE || "").trim();
      let nivel = parseFloat(row.nivel || row.Nivel || row.NIVEL || "0");
      let genero = normalizaGenero(row.genero || row.sexo || row.genero_sexo || row.GENERO || row.SEXO);
      let posicion = String(row.posicion || row.Posicion || row.POSICION || "ambos").toLowerCase();
      let pista_fija = row.pista_fija || row.Pista_fija || row.PISTA_FIJA || "";
      let mano_dominante = row.mano_dominante || row.Mano_dominante || row.MANO_DOMINANTE || "diestro";
      let juega_con = Array.isArray(row.juega_con) ? row.juega_con : [];
      let juega_contra = Array.isArray(row.juega_contra) ? row.juega_contra : [];
      let no_juega_con = Array.isArray(row.no_juega_con) ? row.no_juega_con : [];
      let no_juega_contra = Array.isArray(row.no_juega_contra) ? row.no_juega_contra : [];

      if (typeof juega_con === "string" && juega_con) juega_con = juega_con.split(",").map(x => x.trim());
      if (typeof juega_contra === "string" && juega_contra) juega_contra = juega_contra.split(",").map(x => x.trim());
      if (typeof no_juega_con === "string" && no_juega_con) no_juega_con = no_juega_con.split(",").map(x => x.trim());
      if (typeof no_juega_contra === "string" && no_juega_contra) no_juega_contra = no_juega_contra.split(",").map(x => x.trim());

      if (!Array.isArray(juega_con)) juega_con = [];
      if (!Array.isArray(juega_contra)) juega_contra = [];
      if (!Array.isArray(no_juega_con)) no_juega_con = [];
      if (!Array.isArray(no_juega_contra)) no_juega_contra = [];

      return {
        nombre,
        nivel: isNaN(nivel) ? "" : nivel,
        genero,
        posicion: posicion || "ambos",
        pista_fija: pista_fija ? Number(pista_fija) : "",
        mano_dominante: (mano_dominante || "diestro").toLowerCase(),
        juega_con,
        juega_contra,
        no_juega_con,
        no_juega_contra,
        excelRaw: row
      };
    });

    // Validación de filas
    let warnings = [];
    let nombresEnExcel = new Set();
    let erroresDupe = new Set();

    rows.forEach((row, i) => {
      let warns = [];
      if (!row.nombre) warns.push("Nombre vacío");
      if (row.nivel === "" || isNaN(row.nivel) || row.nivel < 0 || row.nivel > 5) warns.push("Nivel inválido");
      if (!["hombre", "mujer"].includes(row.genero)) warns.push("Género no reconocido, usando por defecto");
      if (nombresEnExcel.has(row.nombre.toLowerCase())) {
        warns.push("Nombre duplicado en Excel");
        erroresDupe.add(row.nombre.toLowerCase());
      }
      nombresEnExcel.add(row.nombre.toLowerCase());
      if (participantes.some(p => p.nombre.toLowerCase() === row.nombre.toLowerCase())) {
        warns.push("Ya existe en inscritos");
      }
      if (!row.mano_dominante) warns.push("Mano dominante por defecto");
      if (!row.posicion) warns.push("Posición por defecto");
      if ((row.juega_con || []).length > 1) warns.push("Más de un compañero (juega_con)");
      if ((row.juega_contra || []).length > 2) warns.push("Más de dos rivales (juega_contra)");
      warnings.push(warns);
    });

    const disponibles = maxParticipantes - participantes.length;
    if (rows.length > disponibles) {
      toast.error(`Solo puedes importar ${disponibles} participantes más (capacidad máxima ${maxParticipantes})`);
      rows = rows.slice(0, disponibles);
      warnings = warnings.slice(0, disponibles);
    }

    setExcelPreview(rows);
    setExcelWarnings(warnings);

  } catch (err) {
    setExcelPreview([]);
    setExcelWarnings([]);
    toast.error("Error leyendo Excel");
    console.error(err);
  }
};

// --- Subida real del Excel (tras preview) ---
const handleExcelImportConfirm = async () => {
  // Solo usuarios válidos
  const rowsValidas = excelPreview.filter((row, i) =>
    !excelWarnings[i]?.some(warn =>
      ["Nombre vacío", "Nivel inválido", "Nombre duplicado en Excel", "Ya existe en inscritos"].includes(warn)
    )
  );
  if (!rowsValidas.length) {
    toast.error("No hay filas válidas para importar");
    return;
  }
  try {
    const formData = new FormData();
    formData.append("file", excelFile);
    await api.post(`/pozos/${pozoId}/importar_excel/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    toast.success("✅ Participantes importados");
    setExcelPreview([]);
    setExcelFile(null);
    refreshLista();
  } catch (err) {
    toast.error(err.response?.data?.error || "❌ Error importando Excel");
  }
};

  useEffect(() => {
    if (!pozoId) return;
    (async () => {
      try {
        const [{ data: rawPart }, { data: p }] = await Promise.all([
          api.get(`/pozos/${pozoId}/participantes/`),
          api.get(`/pozos/${pozoId}/`),
        ]);
        const part = rawPart
          .map(mapApiParticipanteToFrontend)
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

  useEffect(() => {
    onParticipantesActualizados?.(participantes);
  }, [participantes, onParticipantesActualizados]);

  // Validación sexo (tipo de pozo)
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

  const refreshLista = async () => {
    try {
      const { data: rawPart } = await api.get(`/pozos/${pozoId}/participantes/`);
      const part = rawPart
        .map(mapApiParticipanteToFrontend)
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
      setParticipantes(part);
    } catch (err) {
      console.error("Error refrescando lista:", err);
      toast.error("❌ Error refrescando la lista de participantes");
    }
  };




  // --- MODIFICADO: Sincroniza pista_fija en compañeros juega_con
  // --- MODIFICADO: Sincroniza pista_fija en compañeros juega_con (en ambos sentidos)
const autoSyncPistaFija = async (edicion, participantes) => {
    if ((edicion.juega_con?.length ?? 0) === 1) {
      const companeroId = edicion.juega_con[0];
      const companero = participantes.find((p) => p.id === companeroId);
  
      // 1) Si edicion (A) tiene pista_fija y compañero (B) no, o es distinta => actualiza B
      if (edicion.pista_fija && companero && companero.pista_fija !== Number(edicion.pista_fija)) {
        const payload = {
          pozo: edicion.pozo,
          nombre: companero.nombre,
          nivel: companero.nivel,
          genero: companero.genero,
          posicion: companero.posicion,
          mano_dominante: companero.mano_dominante,
          pista_fija: Number(edicion.pista_fija), // sincroniza
          juega_con: [...(companero.juega_con || []), edicion.id].filter((v, i, a) => a.indexOf(v) === i),
          juega_contra: companero.juega_contra || [],
          no_juega_con: companero.no_juega_con || [],
          no_juega_contra: companero.no_juega_contra || [],
        };
        try {
          await api.put(`/pozos/participantes/${companero.id}/`, payload);
        } catch (err) {
          toast.error(`No se pudo sincronizar la pista fija en ${companero.nombre}`);
        }
      }
      // 2) Si compañero (B) tiene pista_fija y edicion (A) no, o es distinta => actualiza A
      else if (companero && companero.pista_fija && edicion.pista_fija !== Number(companero.pista_fija)) {
        const payload = {
          pozo: edicion.pozo,
          nombre: edicion.nombre,
          nivel: edicion.nivel,
          genero: edicion.genero,
          posicion: edicion.posicion,
          mano_dominante: edicion.mano_dominante,
          pista_fija: Number(companero.pista_fija), // sincroniza desde el compañero
          juega_con: edicion.juega_con || [],
          juega_contra: edicion.juega_contra || [],
          no_juega_con: edicion.no_juega_con || [],
          no_juega_contra: edicion.no_juega_contra || [],
        };
        try {
          await api.put(`/pozos/participantes/${edicion.id}/`, payload);
        } catch (err) {
          toast.error(`No se pudo sincronizar la pista fija en ${edicion.nombre}`);
        }
      }
    }
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
    // Validaciones de relaciones...
    if (!validarParticipanteCompleto(nuevo, participantes, tipoPozo)) {
      return;
    }

    const payload = {
      pozo: pozoId,
      nombre: nuevo.nombre.trim(),
      nivel: Number(nuevo.nivel),
      genero: nuevo.genero,
      posicion: nuevo.posicion.toLowerCase(),
      mano_dominante: nuevo.mano_dominante,
    };
    if (nuevo.pista_fija) {
      const pista = Number(nuevo.pista_fija);
      payload.pista_fija = pista;
    }
    console.log("Payload enviado a /agregar/:", JSON.stringify(payload, null, 2));

    try {
      await api.post("/pozos/participantes/agregar/", payload);
      toast.success("✅ Participante agregado");
      setNuevo(initialStateNuevo);
      await refreshLista();
    } catch (err) {
      console.error("Error en handleAdd:", err);
      let errorMsg = "❌ Error al agregar.";
      if (err.response) {
        errorMsg = `❌ Error al agregar: ${JSON.stringify(err.response.data?.detail || err.response.data || err.response.statusText)}`;
      } else if (err.request) {
        errorMsg = "❌ Error de red o servidor no responde al agregar.";
      } else {
        errorMsg = `❌ Error interno al agregar: ${err.message}`;
      }
      toast.error(errorMsg);
    }
  };

  const handleGuardar = async (id) => {
    if (!validarSexo(edicion.genero)) return;
    if (!edicion.nombre || edicion.nivel === "" || !edicion.posicion || !edicion.mano_dominante) {
      return toast.error("⚠️ Completa todos los campos obligatorios");
    }
    if (!validarParticipanteCompleto(edicion, participantes, tipoPozo)) {
      return;
    }
    const pista = edicion.pista_fija ? Number(edicion.pista_fija) : null;
    const payload = {
      pozo: pozoId,
      nombre: edicion.nombre.trim(),
      nivel: Number(edicion.nivel),
      genero: edicion.genero,
      posicion: edicion.posicion.toLowerCase(),
      mano_dominante: edicion.mano_dominante,
      pista_fija: pista,
      juega_con: edicion.juega_con || [],
      juega_contra: edicion.juega_contra || [],
      no_juega_con: edicion.no_juega_con || [],
      no_juega_contra: edicion.no_juega_contra || [],
    };
    console.log(`Payload enviado a /${id}/:`, JSON.stringify(payload, null, 2));
  
    try {
      await api.put(`/pozos/participantes/${id}/`, payload);
  
      // --- Sincroniza relaciones cruzadas (como ya haces)
      const claves = ["juega_con", "juega_contra", "no_juega_con", "no_juega_contra"];
      const original = participantes;
      const updatePromises = original
        .filter((o) => o.id !== id)
        .map(async (other) => {
          const otherCurrentData = mapApiParticipanteToFrontend(other);
          const otherPayload = {
            pozo: pozoId,
            nombre: otherCurrentData.nombre,
            nivel: otherCurrentData.nivel,
            genero: otherCurrentData.genero,
            posicion: otherCurrentData.posicion,
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
            return api.put(`/pozos/participantes/${other.id}/`, otherPayload);
          }
          return Promise.resolve();
        });
  
      await Promise.all(updatePromises);
  
      toast.success("💾 Cambios guardados");
      setEditandoId(null);
      await refreshLista();
  
     
       // --- Sincroniza pista fija en ambos sentidos ---
    await autoSyncPistaFija({ ...edicion, id, pozo: pozoId }, participantes);

    // --- Refresca para mostrar datos actualizados ---
    await refreshLista();
  
    } catch (err) {
      console.error("Error en handleGuardar:", err);
      let errorMsg = "❌ Error al guardar.";
      if (err.response) {
        errorMsg = `❌ Error al guardar: ${JSON.stringify(err.response.data?.detail || err.response.data || err.response.statusText)}`;
      } else if (err.request) {
        errorMsg = "❌ Error de red o servidor no responde al guardar.";
      } else {
        errorMsg = `❌ Error interno al guardar: ${err.message}`;
      }
      toast.error(errorMsg);
    }
  };
  

  // --- BLOQUEO ELIMINAR POR JUEGA_CON ---
  const handleEliminar = async (id) => {
    // ¿Alguien tiene a este id en su juega_con?
    const dependientes = participantes.filter(
      (p) => (p.juega_con || []).includes(id)
    );
    if (dependientes.length > 0) {
      toast.error(
        `Primero elimina la relación de 'juega_con' de: ${dependientes
          .map((p) => p.nombre)
          .join(", ")}`
      );
      return;
    }
    if (!confirm("¿Eliminar participante?")) return;
    try {
      await api.delete(`/pozos/participantes/${id}/eliminar/`);
      toast.success("🗑️ Participante eliminado");
      refreshLista();
    } catch {
      toast.error("❌ Error al eliminar");
    }
  };
  const handleExcelUpload = async () => {
    if (!excelFile) return toast.error("Selecciona primero un archivo Excel");
    const formData = new FormData();
    formData.append("file", excelFile);
    try {
      await api.post(`/pozos/${pozoId}/importar_excel/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("✅ Participantes importados");
      setExcelFile(null);
      refreshLista();
    } catch (err) {
      toast.error(err.response?.data?.error || "❌ Error importando Excel");
    }
  };

  const onPair = async () => {
        if (!pozoCompleto) return;
        try {
          // Llamamos al endpoint de DRF
          const { data } = await api.post(`/pozos/${pozoId}/pairings/`);
          // data.partidos viene del backend
          setEmparejamientos(data.partidos);
        } catch (err) {
          console.error("Error generando emparejamientos:", err);
          toast.error("❌ No se pudieron generar emparejamientos");
        }
      };
    

  return (
    <div className="mt-6 max-w-4xl mx-auto flex flex-col items-center px-4">
      <h2 className="text-xl font-bold text-white mb-2">
        Participantes ({participantes.length} / {maxParticipantes})
        {pozoCompleto && !mostrarAlerta && (
          <FaCheckCircle className="inline ml-2 text-green-400" />
        )}
        {mostrarAlerta && (
          <FaExclamationTriangle
            className="inline ml-2 text-yellow-400"
            title={
              tipoPozo === "mixto" ? "El pozo mixto no tiene igual número de hombres y mujeres" :
                tipoPozo === "hombres" ? "Hay mujeres en un pozo de hombres" :
                  tipoPozo === "mujeres" ? "Hay hombres en un pozo de mujeres" : ""
            }
          />
        )}
      </h2>

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


{/* 🔴 CAMBIO (5): Botón eliminar seleccionados, ANTES de las tarjetas */}
{selectedIds.length > 0 && (
        <button
          className="mb-4 px-3 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded"
          onClick={async () => {
            if (!confirm(`¿Eliminar ${selectedIds.length} participantes seleccionados?`)) return;
            try {
              await Promise.all(selectedIds.map(id => api.delete(`/pozos/participantes/${id}/eliminar/`)));
              toast.success(`Eliminados ${selectedIds.length} participantes`);
              setSelectedIds([]);
              refreshLista();
            } catch {
              toast.error("Error eliminando");
            }
          }}
        >Eliminar seleccionados</button>
      )}

{user?.rol === "organizador" &&
 !participantes.some(p => p.usuario === user.id) && (
  <button
    onClick={async () => {
      const payload = {
        pozo: pozoId,
        nombre: user.username,
        nivel: 3,
        genero: user.genero || "hombre",
        posicion: "ambos",
        mano_dominante: "diestro",
        usuario: user.id,
      };
      try {
        await api.post("/pozos/participantes/agregar/", payload);
        toast.success("✅ Te has inscrito como jugador");
        await refreshLista();
      } catch (err) {
        toast.error(err.response?.data?.error || "❌ Error al inscribirte");
      }
    }}
    className="mb-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded"
  >
    Inscribirme yo como jugador
  </button>
)}



      {/* Tarjetas participantes */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4 mb-6 w-full">
        {participantes.map((p) => (
          <div
            key={p.id}
            className={`bg-white/10 ${editandoId === p.id ? 'ring-2 ring-indigo-400' : (editandoId === null ? 'hover:bg-white/20 cursor-pointer' : 'opacity-60')} rounded-lg shadow p-3 flex flex-col justify-between transition font-sans text-sm font-normal min-h-[190px]`}
            onClick={() => {
              if (editandoId === null) {
                setEditandoId(p.id);
                setEdicion(p);
              } else if (editandoId !== p.id) {
                toast("ℹ️ Cierra la tarjeta actual para editar otra.", { duration: 2000 });
              }
            }}
          >{/* 🔴 CAMBIO (4): checkbox selección múltiple */}
          <input
            type="checkbox"
            checked={selectedIds.includes(p.id)}
            onChange={e => {
              if (e.target.checked) setSelectedIds(ids => [...ids, p.id]);
              else setSelectedIds(ids => ids.filter(id => id !== p.id));
            }}
            className="mr-1"
            onClick={e => e.stopPropagation()}
          />
            {editandoId === p.id ? (
              <div onClick={(e) => e.stopPropagation()} className="space-y-1 text-xs">
                <input
                  className="w-full p-1 rounded text-black"
                  placeholder="Nombre" value={edicion.nombre}
                  onChange={(e) => setEdicion((v) => ({ ...v, nombre: e.target.value }))} />
                <select
                  className="w-full p-1 rounded text-black" value={edicion.nivel}
                  onChange={(e) => setEdicion((v) => ({ ...v, nivel: e.target.value }))} >
                  <option value="">Nivel</option>
                  {Array.from({ length: 6 }, (_, i) => <option key={i} value={i}>{i}</option>)}
                </select>
                <select
                  className="w-full p-1 rounded text-black" value={edicion.genero}
                  onChange={(e) => setEdicion((v) => ({ ...v, genero: e.target.value }))} >
                  <option value="hombre">Hombre</option> <option value="mujer">Mujer</option>
                </select>
                <select
                  className="w-full p-1 rounded text-black" value={edicion.posicion}
                  onChange={(e) => setEdicion((v) => ({ ...v, posicion: e.target.value }))} >
                  {["reves", "drive", "ambos"].map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
                </select>
                <select
                  className="w-full p-1 rounded text-black" value={edicion.pista_fija || ""}
                  onChange={(e) => setEdicion(v => ({ ...v, pista_fija: e.target.value ? Number(e.target.value) : null }))} >
                  <option value="">P. Fija</option>
                  {Array.from({ length: numPistas }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
                </select>
                <select
                  className="w-full p-1 rounded text-black" value={edicion.mano_dominante}
                  onChange={(e) => setEdicion(v => ({ ...v, mano_dominante: e.target.value }))} >
                  <option value="diestro">✋ Diestro</option> <option value="zurdo">🫲 Zurdo</option>
                </select>

                {/* Relaciones M2M */}
                {[
                  { key: "juega_con", label: "J. con", max: 1, conflicts: ["juega_contra", "no_juega_con"], validar: validarJuegaCon },
                  { key: "juega_contra", label: "J. contra", max: 2, conflicts: ["juega_con", "no_juega_contra"], validar: validarJuegaContra },
                  { key: "no_juega_con", label: "No J. con", max: Infinity, conflicts: ["juega_con"], validar: validarNoJuegaCon },
                  { key: "no_juega_contra", label: "No J. contra", max: Infinity, conflicts: ["juega_contra"], validar: validarNoJuegaContra },
                ].map(({ key, label, max, conflicts, validar }) => (
                  <div key={key}>
                    <label className="block text-xxs text-white/70">{label}</label>
                    <ul className="space-y-0.5 max-h-20 overflow-y-auto bg-gray-700/50 p-1 rounded">
                      {participantes.filter(x => x.id !== p.id).map(x => {
                        const selected = edicion[key]?.includes(x.id);
                        const isConflict = conflicts.some(c => edicion[c]?.includes(x.id));
                        const atLimit = (edicion[key]?.length ?? 0) >= max;
                        const isDisabled = !selected && (atLimit || isConflict);
                        return (
                          <li key={x.id} className={`flex items-center justify-between text-black text-xxs ${selected ? 'bg-blue-200' : 'bg-white/70'} rounded px-1.5 py-0.5 ${isDisabled ? 'opacity-50' : ''}`}>
                            <span className="truncate pr-1">{x.nombre}</span>
                            {selected ?
                              <FaMinusCircle className="text-red-600 cursor-pointer flex-shrink-0" onClick={() => setEdicion(v => ({ ...v, [key]: v[key]?.filter(id => id !== x.id) }))} />
                              :
                              <FaPlusCircle className={`cursor-pointer flex-shrink-0 ${isDisabled ? 'text-gray-400' : 'text-green-600'}`}
                                onClick={() => {
                                  if (isDisabled) {
                                    if (atLimit) toast.error("Límite de selección alcanzado");
                                    if (isConflict) toast.error("Conflicto con otra relación (desmarca primero)");
                                  }
                                  else {
                                    // Validación personalizada por relación
                                    if (!validar(edicion, x.id, participantes, edicion)) return;
                                    setEdicion(v => ({ ...v, [key]: [...(v[key] || []), x.id] }));
                                  }
                                }} />}
                          </li>);
                      })}
                      {participantes.length <= 1 && <li className="text-xxs text-white/50 text-center italic">N/A</li>}
                    </ul>
                  </div>
                ))}

                <div className="flex gap-1 mt-2 pt-1 border-t border-white/20">
                  <button className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 rounded" onClick={() => handleGuardar(p.id)}>Guardar</button>
                  <button className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs px-2 py-1 rounded" onClick={() => setEditandoId(null)}>Cancelar</button>
                  <button className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded" onClick={() => handleEliminar(p.id)}>Eliminar</button>
                </div>
              </div>
            ) : (
              <div>
                <div className="font-semibold text-center mb-1">{p.nombre}</div>
                <div className="text-xs space-y-0.5">
                  <div>Nivel: {p.nivel}</div>
                  <div>Pista Fija: {p.pista_fija ?? "-"}</div>
                  <div>Posición: {p.posicion}</div>
                  <div>Género: {p.genero === "hombre" ? "👦 H" : "👧 M"}</div>
                  <div>{p.mano_dominante === "zurdo" ? "🫲 Z" : "✋ D"}</div>
                  {(p.juega_con?.length > 0 || p.juega_contra?.length > 0 || p.no_juega_con?.length > 0 || p.no_juega_contra?.length > 0) &&
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

      {/* Formulario alta + import */}
      {!pozoCompleto && (
        <div className="bg-white p-4 rounded shadow w-full max-w-md mb-6">
          <h3 className="font-semibold mb-2 text-black">Agregar nuevo</h3>
          
          {/* 🔴 CAMBIO (7): input nivel decimal */}
          <input type="number" step="0.01" className="w-full mb-2 p-2 border rounded text-black text-sm" placeholder="Nivel" value={nuevo.nivel} onChange={(e) => setNuevo(prev => ({ ...prev, nivel: e.target.value }))} />
          

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

        
        {/* 🔴 CAMBIO (6): bloque importación Excel con preview */}
        <hr className="border-gray-300 mb-4" />
          <h4 className="font-semibold text-black text-sm mb-2">Importar participantes desde Excel</h4>
          <input type="file" accept=".xlsx,.xls"
            onClick={e => e.target.value = null}
            onChange={handleExcelChange}
            className="mb-2 w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {excelPreview.length > 0 && (
  <div className="mb-3 border rounded bg-gray-100 p-2 overflow-x-auto max-h-80 overflow-y-auto">
    <div className="font-semibold mb-1 text-black">Previsualización:</div>
    <table className="text-xs text-black">
      <thead>
        <tr className="bg-blue-100">
          <th>#</th>
          <th>Nombre</th>
          <th>Nivel</th>
          <th>Género</th>
          <th>Posición</th>
          <th>Pista Fija</th>
          <th>Mano</th>
          <th>Advertencias</th>
        </tr>
      </thead>
      <tbody>
        {excelPreview.map((row, i) => (
          <tr key={i} className={excelWarnings[i]?.length ? 'bg-yellow-50' : 'bg-white'}>
            <td className="text-black">{i + 1}</td>
            <td className="text-black">{row.nombre}</td>
            <td className="text-black">{row.nivel}</td>
            <td className="text-black">{row.genero}</td>
            <td className="text-black">{row.posicion}</td>
            <td className="text-black">{row.pista_fija || "-"}</td>
            <td className="text-black">{row.mano_dominante}</td>
            <td>
              {excelWarnings[i]?.length
                ? <ul className="text-xs text-yellow-700">{excelWarnings[i].map((w, j) => <li key={j}>{w}</li>)}</ul>
                : <span className="text-green-600">OK</span>
              }
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    <div className="mt-2 flex gap-2">
      <button
        className="px-3 py-1 rounded bg-green-600 text-white font-semibold disabled:bg-gray-400"
        onClick={handleExcelImportConfirm}
        disabled={!excelPreview.some((row, i) =>
          !excelWarnings[i]?.some(warn =>
            ["Nombre vacío", "Nivel inválido", "Nombre duplicado en Excel", "Ya existe en inscritos"].includes(warn)
          )
        )}
      >Importar filas válidas</button>
      <button
        className="px-3 py-1 rounded bg-red-600 text-white font-semibold"
        onClick={() => { setExcelPreview([]); setExcelFile(null); }}
      >Cancelar</button>
    </div>
    <div className="mt-1 text-xs text-gray-500">* Sólo se importarán filas sin errores críticos.</div>
  </div>
)}


          </div>
      )}

      {/* Botón emparejar */}
      <div className="text-center mb-6">
        <button disabled={!pozoCompleto} onClick={onPair} className={`px-6 py-2 rounded text-white font-semibold ${pozoCompleto ? "bg-indigo-600 hover:bg-indigo-700" : "bg-gray-500 cursor-not-allowed"}`} >
          {pozoCompleto ? "🧩 Generar emparejamientos" : "Esperando participantes..."}
        </button>
      </div>

      {/* Resultados */}
      {(emparejamientos?.length ?? 0) > 0 && (
        <div className="w-full max-w-lg mx-auto mb-6 text-white space-y-4">
          <h3 className="text-lg font-semibold mb-2 text-center">Emparejamientos</h3>
          {emparejamientos.map((m, i) => {
            // Validación básica para la nueva estructura y jugadores (evita errores si algo falta)
            const equipoA = Array.isArray(m.equipo_A) ? m.equipo_A : [];
            const equipoB = Array.isArray(m.equipo_B) ? m.equipo_B : [];
            const pA1 = equipoA[0] || {};
            const pA2 = equipoA[1] || {};
            const pB1 = equipoB[0] || {};
            const pB2 = equipoB[1] || {};

            return (
              <div key={i} className="p-4 bg-white/10 rounded-lg shadow-md">
                <div className="font-bold text-center mb-2 text-indigo-300">Pista {m.pista}</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {/* --- Equipo A --- */}
                  <div className="bg-black/20 p-3 rounded space-y-1">
                    <div className="font-semibold text-center mb-1 border-b border-white/20 pb-1">Equipo A</div>
                    {/* Jugador A1 */}
                    <div>
                      <span className="font-medium">{pA1.nombre ?? '?'}</span>
                      <span className="text-xs text-gray-400 ml-1">({pA1.nivel?.toFixed(1) ?? 'N/A'})</span>
                    </div>
                    <div className="text-xs text-gray-300 pl-2">
                      {pA1.genero?.[0]?.toUpperCase() ?? '?'} / {pA1.mano?.[0]?.toUpperCase() ?? '?'} / {pA1.posicion ?? '?'}
                    </div>
                     {/* Jugador A2 */}
                    <div>
                      <span className="font-medium">{pA2.nombre ?? '?'}</span>
                       <span className="text-xs text-gray-400 ml-1">({pA2.nivel?.toFixed(1) ?? 'N/A'})</span>
                    </div>
                    <div className="text-xs text-gray-300 pl-2">
                      {pA2.genero?.[0]?.toUpperCase() ?? '?'} / {pA2.mano?.[0]?.toUpperCase() ?? '?'} / {pA2.posicion ?? '?'}
                    </div>
                    {/* Media Equipo A */}
                    <div className="mt-2 pt-1 border-t border-white/30 text-xs text-center text-gray-300">
                      Media: {m.avg_A?.toFixed(2) ?? 'N/A'}
                    </div>
                  </div>

                  {/* --- Equipo B --- */}
                  <div className="bg-black/20 p-3 rounded space-y-1">
                    <div className="font-semibold text-center mb-1 border-b border-white/20 pb-1">Equipo B</div>
                    {/* Jugador B1 */}
                    <div>
                      <span className="font-medium">{pB1.nombre ?? '?'}</span>
                       <span className="text-xs text-gray-400 ml-1">({pB1.nivel?.toFixed(1) ?? 'N/A'})</span>
                    </div>
                     <div className="text-xs text-gray-300 pl-2">
                      {pB1.genero?.[0]?.toUpperCase() ?? '?'} / {pB1.mano?.[0]?.toUpperCase() ?? '?'} / {pB1.posicion ?? '?'}
                    </div>
                    {/* Jugador B2 */}
                     <div>
                      <span className="font-medium">{pB2.nombre ?? '?'}</span>
                       <span className="text-xs text-gray-400 ml-1">({pB2.nivel?.toFixed(1) ?? 'N/A'})</span>
                    </div>
                    <div className="text-xs text-gray-300 pl-2">
                      {pB2.genero?.[0]?.toUpperCase() ?? '?'} / {pB2.mano?.[0]?.toUpperCase() ?? '?'} / {pB2.posicion ?? '?'}
                    </div>
                    {/* Media Equipo B */}
                    <div className="mt-2 pt-1 border-t border-white/30 text-xs text-center text-gray-300">
                      Media: {m.avg_B?.toFixed(2) ?? 'N/A'}
                    </div>
                  </div>
                </div>

                {/* --- Diferencia y Avisos --- */}
                <div className="mt-3 text-xs text-center text-gray-400">
                  <span>Δ Media Equipos: {m.diffAvg?.toFixed(2) ?? 'N/A'}</span>
                </div>
                {/* Mostrar avisos si existen */}
                {Array.isArray(m.avisos) && m.avisos.length > 0 && (
                  <div className="mt-2 text-xs text-center text-amber-400 border-t border-white/10 pt-1">
                    Avisos: {m.avisos.join(' | ')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
