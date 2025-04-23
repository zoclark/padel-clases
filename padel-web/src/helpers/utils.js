/*  utils.js
 *  ────────
 *  Funciones auxiliares de uso general
 */

import { AVG_TIE_THRESHOLD } from "./constants.js";

/* Combina N elementos tomados de K en K  (n choose k)  */
export function combinations(arr, k) {
  const res = [];
  (function go (start, combo) {
    if (combo.length === k) {
      res.push(combo.slice());
      return;
    }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      go(i + 1, combo);
      combo.pop();
    }
  })(0, []);
  return res;
}

/* Calcula stats de un partido A vs B y marca “incompleto” si falta gente */
export function calculateMatchStats(teamA, teamB) {
  const teamAOk     = Array.isArray(teamA) && teamA.length > 0;
  const teamBOk     = Array.isArray(teamB) && teamB.length > 0;
  const playersList = [
    ...(teamAOk ? teamA : []),
    ...(teamBOk ? teamB : []),
  ];
  const numPlayers  = playersList.length;

  if (numPlayers === 0) {
    return {
      avgOverall : 0,
      diffAvg    : 0,
      diffTot    : 0,
      totals     : [0, 0],
      avgs       : [0.0, 0.0],
      incompleto : true,
    };
  }

  const totA = teamAOk ? teamA.reduce((s, p) => s + (p?.nivel ?? 0), 0) : 0;
  const totB = teamBOk ? teamB.reduce((s, p) => s + (p?.nivel ?? 0), 0) : 0;
  const avgA = teamAOk ? totA / teamA.length : 0;
  const avgB = teamBOk ? totB / teamB.length : 0;

  const avgOverall = playersList.reduce((s, p) => s + (p?.nivel ?? 0), 0) / numPlayers;
  const diffAvg    = (teamAOk && teamA.length === 2 && teamBOk && teamB.length === 2)
                       ? Math.abs(avgA - avgB)
                       : 0;
  const diffTot    = (teamAOk && teamA.length === 2 && teamBOk && teamB.length === 2)
                       ? Math.abs(totA - totB)
                       : 0;

  return {
    avgOverall,
    diffAvg,
    diffTot,
    totals     : [totA, totB],
    avgs       : [avgA,  avgB],
    incompleto : !teamAOk || !teamBOk || teamA.length < 2 || teamB.length < 2,
    /* Helper para “empate” según nuevo umbral */
    empate     : diffAvg <= AVG_TIE_THRESHOLD,
  };
}

/* Emojis / formato human-friendly para depurar rápido */
export function formatPlayer(p) {
  if (!p) return "Vacío";
  const icon = p.genero === "hombre" ? "👦" : "👧";
  const hand = p.mano   === "zurdo"  ? "🫲" : "✋";
  return `${p.nombre || "N/A"} (${icon} ${p.nivel}, ${p.posicion}, ${hand})`;
}
