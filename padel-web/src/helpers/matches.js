/*  matches.js
 *  ───────────
 *  Todas las fases que transforman jugadores ⇒ partidos completos
 */

import { buildTrials, forbiddenSameTeam, forbiddenRivals } from "./couples.js";
import { EPSILON_BUILD } from "./constants.js";
import { combinations, calculateMatchStats, formatPlayer } from "./utils.js";

/*  ░░░ 1. Rellenar un grupo de pista fija (añade jugadores del pool) ░░░ */
export function fillFixedGroup(group, pool, opciones) {
  const { tipoPozo, esMixtoPerfecto } = opciones;
  const need = 4 - group.jugadores.length;
  if (need <= 0) return;

  pool.sort((a, b) => b.nivel - a.nivel || Math.random() - 0.5);
  const candidates = pool.slice(0, Math.min(12, pool.length));
  if (candidates.length < need) return;

  /* combinaciones válidas, manteniendo juntos:
       - rivales forzados   (juega_contra)
       - parejas obligadas  (juega_con)     */
  let validCombos = combinations(candidates, need).filter((combo) => {
    /* 0) si el grupo ya contiene a alguien con vínculo obligatorio,
          su pareja/rival debe aparecer en el mismo grupo o en la combo */
    for (const pExist of group.jugadores) {
      for (const idObl of [...pExist.juega_con, ...pExist.juega_contra]) {
        if (
          !group.jugadores.some(p => p.id === idObl) &&
          !combo.some(p => p.id === idObl)
        ) return false;
      }
    }

    for (const pX of combo) {
      /* contra los ya en grupo */
      for (const pExist of group.jugadores) {
        if (
          (pX.no_juega_con || []).includes(pExist.id) ||
          (pExist.no_juega_con || []).includes(pX.id)
        ) return false;
        if (
          (pX.no_juega_contra || []).includes(pExist.id) ||
          (pExist.no_juega_contra || []).includes(pX.id)
        ) return false;
        /* se permite jugar_con y jugar_contra */
      }
      /* entre ellos dentro del combo */
      for (const pY of combo) {
        if (pX.id === pY.id) continue;
        if (
          (pX.no_juega_con || []).includes(pY.id) ||
          (pX.no_juega_contra || []).includes(pY.id)
        ) return false;
      }
    }
    return true;
  });

  /* Mixto perfecto: 2H-2M exactos */
  if (esMixtoPerfecto) {
    const hNow = group.jugadores.filter(p => p.genero === "hombre").length;
    const mNow = group.jugadores.filter(p => p.genero === "mujer").length;
    const hNeed = 2 - hNow;
    const mNeed = 2 - mNow;
    const mixed = validCombos.filter(
      c =>
        c.filter(p => p.genero === "hombre").length === hNeed &&
        c.filter(p => p.genero === "mujer").length === mNeed
    );
    if (mixed.length) validCombos = mixed;
  }

  if (!validCombos.length) return;

  /* escorar por suma total – rango (más regular = mejor) */
  const scored = validCombos
    .map((combo) => {
      const lvls = [...group.jugadores, ...combo].map(p => p.nivel);
      const sum = lvls.reduce((a, b) => a + b, 0);
      const range = Math.max(...lvls) - Math.min(...lvls);
      return { combo, score: sum - 0.5 * range };
    })
    .sort((a, b) => b.score - a.score);

  const bestScore  = scored[0].score;
  const bestCombos = scored.filter(x => Math.abs(x.score - bestScore) < 1e-6);
  const pick       = bestCombos[Math.floor(Math.random() * bestCombos.length)];

  group.jugadores.push(...pick.combo);

  /* quitar del pool */
  const ids = new Set(pick.combo.map(p => p.id));
  for (let i = pool.length - 1; i >= 0; i--) {
    if (ids.has(pool[i].id)) pool.splice(i, 1);
  }
}

/*  ░░░ 2. Generar partido óptimo dentro de un grupo de 4 jugadores ░░░ */
export function bestMatchForGroup(group, opciones) {
    const trials = buildTrials(group.jugadores, opciones);
    if (!trials.length) return null;

    trials.sort((a, b) => a.metric - b.metric);
    const bestMetric = trials[0].metric;
    const bestPool = trials.filter((t) => t.metric <= bestMetric + EPSILON_BUILD);

    const pick = bestPool[Math.floor(Math.random() * bestPool.length)];
    return {
        A         : pick.A,
        B         : pick.B,
        basePista : group.pista,
        fixed     : group.fijos,
        ...pick,
        ids       : [pick.A.map((p) => p.id), pick.B.map((p) => p.id)],
    };
}

/*  ░░░ 3. Draft global (parejas libres -> emparejar rivales del mismo nivel) ░░░ */
export function draftGlobalPairs(matches, opciones) {
    const { tipoPozo, esMixtoPerfecto } = opciones;

    const libres = matches.filter((m) => !m.fixed && !m.incompleto);
    let allPairs = [];

    /* recolectar parejas completas de los libres */
    libres.forEach((m) => {
        if (m.A?.length === 2) {
            allPairs.push({ pair: m.A, nivel: m.totals[0], avg: m.avgs[0] });
        }
        if (m.B?.length === 2) {
            allPairs.push({ pair: m.B, nivel: m.totals[1], avg: m.avgs[1] });
        }
    });

    /* si el pozo es mixto perfecto y todavía hay 2H-2M sin pareja rival, crear combos H+M */
    if (esMixtoPerfecto) {
        const playersFree = libres.flatMap((m) => [...m.A, ...m.B]);
        const hombres = playersFree.filter((p) => p.genero === "hombre");
        const mujeres = playersFree.filter((p) => p.genero === "mujer");
        hombres.sort(() => Math.random() - 0.5);
        mujeres.sort(() => Math.random() - 0.5);
        const len = Math.min(hombres.length, mujeres.length);
        for (let i = 0; i < len; i++) {
            const h = hombres[i];
            const m = mujeres[i];
            if (
                !forbiddenSameTeam(h, m) &&
                !(h.mano === "zurdo" && m.mano === "zurdo") &&
                (h.posicion === "Ambos" ||
                    m.posicion === "Ambos" ||
                    h.posicion !== m.posicion)
            ) {
                allPairs.push({
                    pair : [h, m],
                    nivel: h.nivel + m.nivel,
                    avg  : (h.nivel + m.nivel) / 2,
                });
            }
        }
    }

    /*  emparejar parejas de forma que diff nivel sea mínimo  */
    let drafted = [];
    let used = new Set();
    allPairs.sort((a, b) => b.nivel - a.nivel);

    while (true) {
        const iBase = allPairs.findIndex((_, idx) => !used.has(idx));
        if (iBase === -1 || allPairs.length - used.size < 2) break;
        const base = allPairs[iBase];
        used.add(iBase);

        let bestIdx = -1;
        let bestDiff = Infinity;

        for (let j = 0; j < allPairs.length; j++) {
            if (j === iBase || used.has(j)) continue;
            const rival = allPairs[j];

            // restricciones entre parejas
            const [A1, A2] = base.pair;
            const [B1, B2] = rival.pair;
            if (
                forbiddenRivals(A1, B1) ||
                forbiddenRivals(A1, B2) ||
                forbiddenRivals(A2, B1) ||
                forbiddenRivals(A2, B2)
            )
                continue;

            const diff = Math.abs(base.nivel - rival.nivel);
            if (diff < bestDiff) {
                bestDiff = diff;
                bestIdx = j;
            }
        }

        if (bestIdx !== -1) {
            const rival = allPairs[bestIdx];
            used.add(bestIdx);

            const stats = calculateMatchStats(base.pair, rival.pair);
            drafted.push({
                A         : base.pair,
                B         : rival.pair,
                basePista : null,
                fixed     : false,
                ...stats,
                ids       : [base.pair.map((p) => p.id), rival.pair.map((p) => p.id)],
            });
        }
    }
    return drafted;
}

/*  ░░░ helpers para output final  (pista, formato etc.) ░░░ */
export function prettifyMatches(list) {
    return list.map((m) => {
        const stats = calculateMatchStats(m.A, m.B);
        return {
            pista      : m.basePista,
            teams      : [m.A.map(formatPlayer), m.B.map(formatPlayer)],
            totals     : stats.totals,
            avgs       : stats.avgs.map((x) => x.toFixed(1)),
            diffAvg    : stats.incompleto ? "?.?" : stats.diffAvg.toFixed(1),
            diffTot    : stats.incompleto ? "?"   : stats.diffTot,
            empate     : stats.empate,
            incompleto : stats.incompleto,
        };
    });
}
