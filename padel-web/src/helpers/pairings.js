/*
 * generatePairings.js – versión ES2020 (sin TypeScript)
 * -----------------------------------------------------
 * Mantiene la misma lógica que el diseño original en TS
 * pero elimina interfaces, type‑alias y anotaciones.
 * Puedes colocarlo en src/helpers/pairings.js y usarlo
 * directamente desde tu app React / Node.
 *
 *   import { generatePairings } from "./helpers/pairings";
 *   const { matches, debug } = generatePairings(participantes, 3, "mixto");
 */

/**
 * @typedef {Object} Jugador
 * @property {string} nombre
 * @property {number} nivel  // 0‑5
 * @property {"hombre"|"mujer"} genero
 * @property {"Drive"|"Reves"|"Ambos"} posicion
 * @property {"diestro"|"zurdo"} mano_dominante
 * @property {number|"-"|0} pista_fija
 */

/**
 * @param {Jugador[]} participantes
 * @param {number} numPistas – Nº de pistas físicas disponibles
 * @param {"mixto"|"abierto"} tipoPozo – Si es "mixto" fuerza H‑M‑H‑M en cada grupo
 * @param {number} [epsilon=0.01] – Umbral para empates en la métrica
 */
export function generatePairings(participantes, numPistas, tipoPozo = "mixto", epsilon = 0.01) {
    /* ---------- 1. Parámetros de la métrica ---------- */
    const PARTNER_DIFF_WEIGHT = 0.2;
    const POSMAN_WEIGHT = 0.1;
  
    /* ---------- 2. Construir todas las particiones 2×2 de 4 jugadores ---------- */
    const buildTrials = (grupo) => {
      const trials = [];
      const combos = [
        [0, 1, 2, 3],
        [0, 2, 1, 3],
        [0, 3, 1, 2],
      ];
  
      for (const [i1, i2, j1, j2] of combos) {
        const t1 = [grupo[i1], grupo[i2]];
        const t2 = [grupo[j1], grupo[j2]];
  
        if (tipoPozo === "mixto") {
          const esMixto = (team) => team.some((p) => p.genero === "hombre") && team.some((p) => p.genero === "mujer");
          if (!esMixto(t1) || !esMixto(t2)) continue;
        }
  
        const total1 = t1[0].nivel + t1[1].nivel;
        const total2 = t2[0].nivel + t2[1].nivel;
        const avg1 = total1 / 2;
        const avg2 = total2 / 2;
        const diffAvg = Math.abs(avg1 - avg2);
        const partnerDiff = Math.abs(t1[0].nivel - t1[1].nivel) + Math.abs(t2[0].nivel - t2[1].nivel);
  
        let posMan = 0;
        for (const tm of [t1, t2]) {
          if (tm[0].posicion === tm[1].posicion && tm[0].posicion !== "Ambos") posMan++;
          if (tm[0].mano_dominante === "zurdo" && tm[1].mano_dominante === "zurdo") posMan++;
        }
  
        const metric = diffAvg + partnerDiff * PARTNER_DIFF_WEIGHT + posMan * POSMAN_WEIGHT;
        trials.push({ t1, t2, total1, total2, avg1, avg2, diffAvg, partnerDiff, posMan, metric });
      }
  
      return trials;
    };
  
    /* ---------- 3. Separar fijos de libres ---------- */
    const byPista = new Map();
    const libres = [];
    participantes.forEach((p) => {
      const pista = Number(p.pista_fija);
      if (pista >= 1) {
        if (!byPista.has(pista)) byPista.set(pista, []);
        byPista.get(pista).push(p);
      } else {
        libres.push(p);
      }
    });
  
    /* ---------- 4. Ordenar libres por género y nivel ---------- */
    const hombres = libres.filter((p) => p.genero === "hombre").sort((a, b) => b.nivel - a.nivel);
    const mujeres = libres.filter((p) => p.genero === "mujer").sort((a, b) => b.nivel - a.nivel);
  
    /* ---------- 5. Construir grupos de 4 con balance 2‑2 ---------- */
    const grupos = Array.from({ length: numPistas }, (_, i) => ({ pista: i + 1, jugadores: byPista.get(i + 1) || [] }));
    const take = (arr) => (arr.length ? arr.shift() : undefined);
  
    for (const g of grupos) {
      while (g.jugadores.length < 4) {
        const menCnt = g.jugadores.filter((p) => p.genero === "hombre").length;
        const womenCnt = g.jugadores.length - menCnt;
        let next;
        if (menCnt < 2 && menCnt <= womenCnt) next = take(hombres);
        else if (womenCnt < 2 && womenCnt < menCnt) next = take(mujeres);
        if (!next) next = take(hombres) || take(mujeres);
        if (!next) break;
        g.jugadores.push(next);
      }
    }
  
    while (grupos.length < numPistas && hombres.length >= 2 && mujeres.length >= 2) {
      grupos.push({ pista: grupos.length + 1, jugadores: [take(hombres), take(hombres), take(mujeres), take(mujeres)] });
    }
  
    /* ---------- 6. Ordenar grupos por media de nivel ---------- */
    grupos.sort((a, b) => {
      const avgA = a.jugadores.reduce((s, p) => s + p.nivel, 0) / a.jugadores.length;
      const avgB = b.jugadores.reduce((s, p) => s + p.nivel, 0) / b.jugadores.length;
      return avgB - avgA;
    });
  
    /* ---------- 7. Evaluar emparejamientos ---------- */
    const matches = [];
    const debug = [];
  
    for (const g of grupos) {
      const trials = buildTrials(g.jugadores);
      const info = { pista: g.pista, initial: g.jugadores.map((j) => j.nombre), trialsCount: trials.length, selected: null };
  
      if (!trials.length) {
        info.selected = { pairing: "❌ No se pudo emparejar", metric: "–", reason: "Combinaciones no mixtas", trialsConsidered: 0 };
        debug.push(info);
        continue;
      }
  
      const bestMetric = Math.min(...trials.map((t) => t.metric));
      const candidatos = trials.filter((t) => t.metric <= bestMetric + epsilon);
      const elegido = candidatos[Math.floor(Math.random() * candidatos.length)];
  
      matches.push({
        pista: g.pista,
        teams: [elegido.t1, elegido.t2],
        totals: [elegido.total1, elegido.total2],
        avgs: [elegido.avg1.toFixed(1), elegido.avg2.toFixed(1)],
        diffAvg: elegido.diffAvg.toFixed(1),
        diffTot: Math.abs(elegido.total1 - elegido.total2),
      });
  
      info.selected = {
        pairing: `${elegido.t1[0].nombre} & ${elegido.t1[1].nombre} vs ${elegido.t2[0].nombre} & ${elegido.t2[1].nombre}`,
        metric: elegido.metric.toFixed(2),
        reason: elegido.posMan > 0 ? `Penalización posición/mano (${elegido.posMan})` : elegido.partnerDiff > 0 ? `Penalización nivel interno (${elegido.partnerDiff})` : "Sin penalización",
        trialsConsidered: trials.length,
      };
      debug.push(info);
    }
  
    return { matches, debug };
  }
  