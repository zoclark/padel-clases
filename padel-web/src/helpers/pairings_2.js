/*  pairings.js
 *  Orquesta módulos y expone generatePairings().
 */

import { EPSILON_BUILD } from "./constants.js";
import {
  fillFixedGroup,
  bestMatchForGroup,
  draftGlobalPairs,
  prettifyMatches,
} from "./matches.js";

/* ─── helpers y constantes ───────────────────────────── */
function sameTeamForbidden(x, y) {
  return (x.no_juega_con || []).includes(y.id) ||
         (y.no_juega_con || []).includes(x.id);
}
const handPairBad = (a, b) => a.mano === "zurdo" && b.mano === "zurdo";
const posPairBad  = (a, b) =>
  a.posicion !== "Ambos" &&
  b.posicion !== "Ambos" &&
  a.posicion === b.posicion;

const LVL_TOL      = 3;
const LVL_TOL_PAIR = LVL_TOL * 2;

/* ══ normalisePlayers ═══════════════════════════════════════ */
function normalisePlayers(raw) {
  const players = raw.map(p => ({ ...p,
    genero          : p.genero ?? "hombre",
    nivel           : Number(p.nivel) || 0,
    pista_fija      : Number(p.pista_fija) || 0,
    mano            : p.mano_dominante || "diestro",
    posicion        : p.posicion ?? "Ambos",
    juega_con       : Array.isArray(p.juega_con)       ? p.juega_con       : [],
    juega_contra    : Array.isArray(p.juega_contra)    ? p.juega_contra    : [],
    no_juega_con    : Array.isArray(p.no_juega_con)    ? p.no_juega_con    : [],
    no_juega_contra : Array.isArray(p.no_juega_contra) ? p.no_juega_contra : [],
  }));

  /* — bidireccionalidad — */
  const idMap = new Map(players.map(p => [p.id, p]));
  const sync  = (lst, fld, self) => lst.forEach(id => {
    const o = idMap.get(id);
    if (!o) return;
    o[fld] ??= [];
    if (!o[fld].includes(self.id)) o[fld].push(self.id);
  });
  players.forEach(p => {
    sync(p.juega_con,       "juega_con",       p);
    sync(p.juega_contra,    "juega_contra",    p);
    sync(p.no_juega_con,    "no_juega_con",    p);
    sync(p.no_juega_contra, "no_juega_contra", p);
  });

  /* — propagar pista fija en parejas y rivales — */
  players.forEach(p => {
    if (p.juega_con.length === 1) {
      const mate = idMap.get(p.juega_con[0]);
      if (!mate) return;
      if (p.pista_fija && !mate.pista_fija) mate.pista_fija = p.pista_fija;
      if (!p.pista_fija && mate.pista_fija) p.pista_fija = mate.pista_fija;
      if (p.pista_fija && mate.pista_fija && p.pista_fija !== mate.pista_fija) {
        const m = Math.min(p.pista_fija, mate.pista_fija);
        p.pista_fija = mate.pista_fija = m;
      }
    }
    if (p.juega_contra.length === 1) {
      const rival = idMap.get(p.juega_contra[0]);
      if (!rival) return;
      if (p.pista_fija && !rival.pista_fija) rival.pista_fija = p.pista_fija;
      if (!p.pista_fija && rival.pista_fija) p.pista_fija = rival.pista_fija;
      if (p.pista_fija && rival.pista_fija && p.pista_fija !== rival.pista_fija) {
        const m = Math.min(p.pista_fija, rival.pista_fija);
        p.pista_fija = rival.pista_fija = m;
      }
    }
  });

  return players;
}

/* ══ Agrupamiento en clústeres forzados ═════════════════════ */
function buildForcedClusters(players) {
  // Agrupa por parejas/rivales obligatorios y pistas fijas propagadas
  const clusters = [];
  const id2cluster = new Map();
  function merge(a, b) {
    if (a === b) return a;
    if (a.pista && b.pista && a.pista !== b.pista)
      throw new Error(`Conflicto de pistas fijas entre ${[...a.ids]} y ${[...b.ids]}`);
    a.pista = a.pista || b.pista;
    for (let id of b.ids) { a.ids.add(id); id2cluster.set(id, a); }
    clusters.splice(clusters.indexOf(b), 1);
    return a;
  }
  for (const p of players) {
    let c = id2cluster.get(p.id);
    if (!c) { c = { ids: new Set([p.id]), pista: p.pista_fija || null }; clusters.push(c); id2cluster.set(p.id, c); }
    for (let id2 of [...p.juega_con, ...p.juega_contra]) {
      let c2 = id2cluster.get(id2);
      if (!c2) { c2 = { ids: new Set([id2]), pista: null }; clusters.push(c2); id2cluster.set(id2, c2); }
      if (c !== c2) c = merge(c, c2);
    }
    if (p.pista_fija && !c.pista) c.pista = p.pista_fija;
    if (p.pista_fija && c.pista && c.pista !== p.pista_fija)
      throw new Error(`Conflicto de pista fija para ${[...c.ids]}`);
  }
  return clusters;
}

/* ══ generatePairings ═══════════════════════════════════════ */
export function generatePairings(
  jugadores,
  numPistas,
  tipoPozo = "mixto",
  epsilon  = EPSILON_BUILD
) {
  const players = normalisePlayers(jugadores);

  /* flags */
  const hombres = players.filter(p => p.genero === "hombre").length;
  const esMixtoPerfecto = tipoPozo === "mixto" && hombres * 2 === players.length;
  const opts = { tipoPozo, esMixtoPerfecto };

  // ========= CLUSTERING INICIAL: parejas/rivales/pistas fijas ===========
  let clusters;
  try { clusters = buildForcedClusters(players); }
  catch (e) { return { matches: [], debug: [], sinPartido: [], error: e.message }; }

  // Asignar clústeres a pistas (respetando pistas fijas y límite de 4 por pista)
  const grupos = Array.from({ length: numPistas }, (_, i) => ({
    pista: i + 1, jugadores: [], fijos: false,
  }));
  let sinPartido = [];
  // 1. Clústeres con pista fija
  for (const c of clusters.filter(cl => cl.pista)) {
    const g = grupos[c.pista - 1];
    if (!g) return { matches: [], debug: [], sinPartido: [], error: `Pista ${c.pista} fuera de rango` };
    for (let id of c.ids) {
      const pl = players.find(p => p.id === id);
      if (!pl) continue;
      if (g.jugadores.length >= 4) return { matches: [], debug: [], sinPartido: [], error: `Demasiados jugadores en pista ${g.pista}` };
      g.jugadores.push(pl);
    }
    g.fijos = true;
  }
  // 2. Clústeres sin pista fija, repartir donde quepa
  for (const c of clusters.filter(cl => !cl.pista)) {
    let assigned = false;
    for (const g of grupos) {
      if (g.jugadores.length + c.ids.size <= 4) {
        for (let id of c.ids) g.jugadores.push(players.find(p => p.id === id));
        assigned = true; break;
      }
    }
    if (!assigned) sinPartido.push(...[...c.ids].map(id => players.find(p => p.id === id)?.nombre ?? id));
  }
  // 3. Jugadores sin clúster (no forzados), repartir igual
  for (const p of players) {
    if (!clusters.some(cl => cl.ids.has(p.id))) {
      for (const g of grupos) if (g.jugadores.length < 4) { g.jugadores.push(p); break; }
    }
  }
  if (grupos.some(g => g.jugadores.length > 4))
    return { matches: [], debug: [], sinPartido: [], error: `Demasiados jugadores en alguna pista tras asignar clústeres.` };
  if (sinPartido.length > 0)
    return { matches: [], debug: [], sinPartido, error: `No se ha podido ubicar a todos los jugadores por restricciones cruzadas.` };

  // ========== FIN DEL CLUSTERING FORZADO ====================

  /* llenar y generar partidos óptimos */
  grupos.forEach(g => fillFixedGroup(g, [], opts));
  const groupMatches = grupos
    .filter(g => g.jugadores.length === 4)
    .map(g => bestMatchForGroup(g, { ...opts, exigirMixto: true }))
    .filter(Boolean);

  /* draft global sin duplicados */
  const draftAll   = draftGlobalPairs(groupMatches, opts);
  const takenIds   = new Set(groupMatches.flatMap(m => m.ids.flat()));
  const drafted    = draftAll.filter(m => !m.ids.flat().some(id => takenIds.has(id)));

  /* ordenar por nivel general */
  const partidos = [...groupMatches, ...drafted]
    .sort((a, b) => b.avgOverall - a.avgOverall);

  /* asignar pistas por orden de nivel */
  partidos.forEach((m, i) => {
    if (!m.basePista) m.basePista = i + 1;
  });

  /* — utilitarios de posición — */
  const locate = id => {
    for (const pm of partidos) {
      const ai = pm.A.findIndex(p => p.id === id);
      if (ai !== -1) return { match: pm, team: 0, idx: ai };
      const bi = pm.B.findIndex(p => p.id === id);
      if (bi !== -1) return { match: pm, team: 1, idx: bi };
    }
    return null;
  };
  const sameTeam     = (x, y) => { const a = locate(x), b = locate(y); return a && b && a.match === b.match && a.team === b.team; };
  const oppositeTeam = (x, y) => { const a = locate(x), b = locate(y); return a && b && a.match === b.match && a.team !== b.team; };

  /* — construir listas de pares — */
  const vetoPairs    = [];
  const rivalPairs   = [];
  const partnerPairs = [];
  players.forEach(p => {
    p.no_juega_con.forEach(id => {
      if (p.no_juega_contra.includes(id)) vetoPairs.push([p.id, id]);
    });
    p.juega_contra.forEach(id => rivalPairs.push([p.id, id]));
    p.juega_con.forEach(id => { if (p.id < id) partnerPairs.push([p.id, id]); });
  });
  const badDistance = d => d === 0 || d === 2;

  /* — validación global de restricciones — */
  function globalConstraintsOK() {
    // 0) misma pista para vínculos obligatorios
    for (const p of players) {
      for (const id of [...p.juega_con, ...p.juega_contra]) {
        const a = locate(p.id), b = locate(id);
        if (!a || !b || a.match.basePista !== b.match.basePista) return false;
      }
    }
    // 1) parejas obligatorias juntas
    for (const [a, b] of partnerPairs) if (!sameTeam(a, b)) return false;
    // 2) rivales obligatorios enfrentados
    for (const [a, b] of rivalPairs)   if (!oppositeTeam(a, b)) return false;
    // 3) vetos
    for (const p of players) {
      for (const id of p.no_juega_con)    if (sameTeam(p.id, id))     return false;
      for (const id of p.no_juega_contra) if (oppositeTeam(p.id, id)) return false;
    }
    // 4) distancias vetadas
    for (const [a, b] of vetoPairs) {
      const da = locate(a).match.basePista, db = locate(b).match.basePista;
      if (badDistance(Math.abs(da - db))) return false;
    }
    return true;
  }

  /* — utilidades de swap — */
  const pairsOK = m =>
    [m.A, m.B].every(t => {
      if (t.length !== 2) return false;
      const [x, y] = t;
      return !sameTeamForbidden(x, y) && !handPairBad(x, y) && !posPairBad(x, y);
    });

  const replacePair = (match, oldId, newPl) => {
    const iA = match.A.findIndex(p => p.id === oldId);
    if (iA !== -1) { match.A[iA] = newPl; return; }
    const iB = match.B.findIndex(p => p.id === oldId);
    if (iB !== -1) match.B[iB] = newPl;
  };

  // FUNCIONES para forzar parejas y rivales:
  function forcePairs(typePairs, checkFn, swapFn) {
    let changed = false;
    for (const [idA, idB] of typePairs) {
      if (checkFn(idA, idB)) continue;
      const lA = locate(idA), lB = locate(idB);
      if (!lA || !lB) continue;

      // Mismo partido pero posición incorrecta → swap interno
      if (lA.match === lB.match && lA.team !== lB.team) {
        const fromArr = lA.team === 0 ? lA.match.B : lA.match.A;
        const moverId = lA.team === 0 ? lA.match.B[lA.idx].id : lA.match.A[lA.idx].id;
        for (const cand of fromArr) {
          if (Math.abs(cand.nivel - players.find(p => p.id === moverId).nivel) > LVL_TOL) continue;
          replacePair(lA.match, moverId, cand);
          replacePair(lA.match, cand.id, players.find(p => p.id === moverId));
          if (pairsOK(lA.match) && globalConstraintsOK()) { changed = true; break; }
          // revertir
          replacePair(lA.match, cand.id, cand);
          replacePair(lA.match, moverId, players.find(p => p.id === moverId));
        }
      }

      // Distinto partido → swap dirigido y swap de parejas
      if (!checkFn(idA, idB)) {
        if (!swapFn(lA, lB)) {
          swapFn(lB, lA);
        }
      }
      if (!checkFn(idA, idB)) {
        trySwapCouples(lA.match, lB.match);
      }
    }
    return changed;
  }

  function trySwapDirected(locFrom, locTo) {
    const matchFrom = locFrom.match;
    const mover     = locFrom.team === 0
                      ? matchFrom.A[locFrom.idx]
                      : matchFrom.B[locFrom.idx];
    const matchTo   = locTo.match;
    const targetArr = locTo.team === 0 ? matchTo.A : matchTo.B;

    for (const jd of targetArr) {
      if (Math.abs(jd.nivel - mover.nivel) > LVL_TOL) continue;

      const bak = {
        fA: [...matchFrom.A], fB: [...matchFrom.B],
        tA: [...matchTo.A],   tB: [...matchTo.B]
      };
      replacePair(matchFrom, mover.id, jd);
      replacePair(matchTo,   jd.id,    mover);

      if (pairsOK(matchFrom) && pairsOK(matchTo) && globalConstraintsOK()) {
        return true;
      }

      matchFrom.A = bak.fA; matchFrom.B = bak.fB;
      matchTo.A   = bak.tA; matchTo.B   = bak.tB;
    }
    return false;
  }

  function trySwapCouples(m1, m2) {
    for (const [s1, s2] of [["A","A"], ["B","B"]]) {
      const p1 = m1[s1], p2 = m2[s2];
      const sum1 = p1[0].nivel + p1[1].nivel;
      const sum2 = p2[0].nivel + p2[1].nivel;
      if (Math.abs(sum1 - sum2) > LVL_TOL_PAIR) continue;

      const bak = {
        m1A: [...m1.A], m1B: [...m1.B],
        m2A: [...m2.A], m2B: [...m2.B]
      };
      m1[s1] = p2;
      m2[s2] = p1;

      if (pairsOK(m1) && pairsOK(m2) && globalConstraintsOK()) {
        return true;
      }

      m1.A = bak.m1A; m1.B = bak.m1B;
      m2.A = bak.m2A; m2.B = bak.m2B;
    }
    return false;
  }

  // FORZAR RESTRICCIONES DE PAREJAS Y RIVALES TRAS EL DRAFT
  let intentos = 5; // Por seguridad: evita bucles infinitos si no hay solución posible
  while (intentos-- > 0) {
    const changedA = forcePairs(partnerPairs, sameTeam, trySwapDirected);
    const changedB = forcePairs(rivalPairs,  oppositeTeam, trySwapDirected);
    if (!changedA && !changedB) break;
  }

  /* ── Ajuste: distancias vetadas ── */
  partidos.sort((a, b) => a.basePista - b.basePista);
  function trySwap(loc) {
    const matchFrom = loc.match;
    const mover     = loc.team === 0
                      ? matchFrom.A[loc.idx]
                      : matchFrom.B[loc.idx];
    const fromP = matchFrom.basePista;
    const dirs = [];
    for (let d = 1; d < numPistas; d += 2) {
      if (fromP + d <= numPistas) dirs.push(fromP + d);
      if (fromP - d >= 1)         dirs.push(fromP - d);
    }
    for (const pd of dirs) {
      const matchTo = partidos.find(m => m.basePista === pd);
      if (!matchTo) continue;
      for (const jd of [...matchTo.A, ...matchTo.B]) {
        if (Math.abs(jd.nivel - mover.nivel) > LVL_TOL) continue;
        const bak = {
          fA: [...matchFrom.A], fB: [...matchFrom.B],
          tA: [...matchTo.A],   tB: [...matchTo.B]
        };
        replacePair(matchFrom, mover.id, jd);
        replacePair(matchTo,   jd.id,    mover);
        if (pairsOK(matchFrom) && pairsOK(matchTo) && globalConstraintsOK()) {
          return true;
        }
        matchFrom.A = bak.fA; matchFrom.B = bak.fB;
        matchTo.A   = bak.tA; matchTo.B   = bak.tB;
      }
    }
    return false;
  }

  for (const [a, b] of vetoPairs) {
    const d = Math.abs(locate(a).match.basePista - locate(b).match.basePista);
    if (!badDistance(d)) continue;
    const mover = locate(a).match.basePista > locate(b).match.basePista
                  ? locate(a) : locate(b);
    trySwap(mover) || trySwap(mover === locate(a) ? locate(b) : locate(a));
  }

  partidos.sort((a, b) => a.basePista - b.basePista);

  /* salida */
  return {
    matches: prettifyMatches(partidos),
    debug:    partidos,
    sinPartido: players
      .filter(p => !partidos.flatMap(m => m.ids.flat()).includes(p.id))
      .map(p => p.nombre)
  };
}
