/*  pairings.js
 *  ────────────
 *  Orquesta los módulos auxiliares y expone generatePairings().
 */

/* ─── Importes ─────────────────────────────────────────────── */
import { EPSILON_BUILD } from "./constants.js";

import {
  fillFixedGroup,
  bestMatchForGroup,
  draftGlobalPairs,
  prettifyMatches,
} from "./matches.js";

/* ═════════════════════════════════════════════════════════════
   ░░░  Función auxiliar: normalizar y validar jugadores  ░░░
   ═════════════════════════════════════════════════════════════ */
function normalisePlayers(raw) {
  const players = raw.map((p) => ({
    ...p,
    genero          : p.genero        ?? "hombre",
    nivel           : Number(p.nivel) || 0,
    pista_fija      : Number(p.pista_fija) || 0,
    mano            : p.mano_dominante || "diestro",
    posicion        : p.posicion      || "Ambos",
    juega_con       : Array.isArray(p.juega_con)       ? p.juega_con       : [],
    juega_contra    : Array.isArray(p.juega_contra)    ? p.juega_contra    : [],
    no_juega_con    : Array.isArray(p.no_juega_con)    ? p.no_juega_con    : [],
    no_juega_contra : Array.isArray(p.no_juega_contra) ? p.no_juega_contra : [],
  }));

  /* bidireccionalidad + propagación pista fija */
  const idMap = new Map(players.map((pl) => [pl.id, pl]));
  const sync = (list, field, self) => {
    list.forEach((otherId) => {
      const other = idMap.get(otherId);
      if (!other) return;
      if (!Array.isArray(other[field])) other[field] = [];
      if (!other[field].includes(self.id)) other[field].push(self.id);
    });
  };

  players.forEach((p) => {
    sync(p.juega_con,        "juega_con",        p);
    sync(p.juega_contra,     "juega_contra",     p);
    sync(p.no_juega_con,     "no_juega_con",     p);
    sync(p.no_juega_contra,  "no_juega_contra",  p);
  });

  players.forEach((p) => {
    if (p.juega_con.length === 1) {
      const mate = idMap.get(p.juega_con[0]);
      if (!mate) return;
      if (p.pista_fija && !mate.pista_fija) mate.pista_fija = p.pista_fija;
      if (!p.pista_fija && mate.pista_fija) p.pista_fija    = mate.pista_fija;
      if (p.pista_fija && mate.pista_fija && p.pista_fija !== mate.pista_fija) {
        const min = Math.min(p.pista_fija, mate.pista_fija);
        p.pista_fija   = min;
        mate.pista_fija= min;
      }
    }
  });

  /* validaciones mínimas */
  players.forEach((p) => {
    if (p.juega_con.length    > 1) throw new Error(`${p.nombre} tiene >1 'juega_con'`);
    if (p.juega_contra.length > 2) throw new Error(`${p.nombre} tiene >2 'juega_contra'`);
    p.juega_con.forEach((id) => {
      if (p.no_juega_con.includes(id))
        throw new Error(`${p.nombre} conflicto: juega_con y no_juega_con (${id})`);
    });
    p.juega_contra.forEach((id) => {
      if (p.no_juega_contra.includes(id))
        throw new Error(`${p.nombre} conflicto: juega_contra y no_juega_contra (${id})`);
    });
  });

  return players;
}

/* ═════════════════════════════════════════════════════════════
   ░░░  FUNCIÓN PRINCIPAL  ░░░
   ═════════════════════════════════════════════════════════════ */
export function generatePairings(
  jugadores,
  numPistas,
  tipoPozo = "mixto",
  epsilon  = EPSILON_BUILD
) {

  /* 0. Normalizar entrada */
  const players = normalisePlayers(jugadores);

  /* 1. Flags globales */
  const hombres         = players.filter(p => p.genero === "hombre").length;
  const mujeres         = players.filter(p => p.genero === "mujer").length;
  const esMixtoPerfecto = tipoPozo === "mixto" && hombres === mujeres &&
                          players.length === hombres + mujeres;
  const opciones        = { tipoPozo, esMixtoPerfecto };

  /* 2. Grupos + pool */
  const grupos = Array.from({ length: numPistas }, (_, i) => ({
    pista    : i + 1,
    jugadores: [],
    fijos    : false,
  }));
  const pool = [];

  players.forEach((p) => {
    const g = p.pista_fija >= 1 && p.pista_fija <= numPistas
                ? grupos[p.pista_fija - 1]
                : null;
    if (g) {
      g.jugadores.push(p);
      g.fijos = true;
    } else {
      pool.push(p);
    }
  });

  /* 3. Rellenar fijos */
  grupos.forEach(g => fillFixedGroup(g, pool, opciones));

  /* 4. Partido óptimo por grupo completo */
  const groupMatches = grupos
    .filter(g => g.jugadores.length === 4)
    .map(g => bestMatchForGroup(g, { ...opciones, exigirMixto: true }))
    .filter(Boolean);

  /* 5. Draft global */
  const draftedRaw = draftGlobalPairs(groupMatches, opciones);

  /* ────────────────────────────────────────────────────────────
     6.  Eliminar partidos duplicados (jugadores repetidos)
     ──────────────────────────────────────────────────────────── */

  // ►►  CAMBIO CLAVE  ◄◄
  // ocupamos YA a todos los jugadores presentes en cualquier partido de grupo,
  // sean fijos o libres; antes sólo incluíamos los fijos.
  const initialMatches = [...groupMatches];
  const takenPlayers   = new Set(
    initialMatches
      .flatMap(m => [...m.A, ...m.B])
      .map(p => p.id)
  );

  const draftedMatches = [];
  draftedRaw.forEach(match => {
    const ids = [...match.A, ...match.B].map(p => p.id);
    if (ids.some(id => takenPlayers.has(id))) return;   // ignora si se repite
    ids.forEach(id => takenPlayers.add(id));
    draftedMatches.push(match);
  });

  /* 7. Unir, ordenar por nivel desc */
  const allMatches = [...initialMatches, ...draftedMatches];
  allMatches.sort((a, b) => b.avgOverall - a.avgOverall);

  /* 8. Asignar pistas libres */
  const takenPistas = new Set(
    allMatches.filter(m => m.basePista).map(m => m.basePista)
  );
  const libres = Array.from({ length: numPistas }, (_, i) => i + 1)
                     .filter(p => !takenPistas.has(p));
  allMatches.forEach(m => { if (!m.basePista) m.basePista = libres.shift() || null; });

  allMatches.sort((a, b) => (a.basePista ?? Infinity) - (b.basePista ?? Infinity));

  /* 9. Salida */
  const matchesPretty = prettifyMatches(allMatches);

  const assignedIds = new Set(
    allMatches.flatMap(m => [...m.A, ...m.B]).map(p => p.id)
  );
  const sinPartido  = players.filter(p => !assignedIds.has(p.id)).map(p => p.nombre);

  const debug = allMatches.map(m => ({
    pista    : m.basePista,
    idsA     : m.A.map(p => p.id),
    idsB     : m.B.map(p => p.id),
    diffAvg  : m.diffAvg.toFixed(2),
    diffTot  : m.diffTot,
  }));

  return { matches: matchesPretty, debug, sinPartido };
}
