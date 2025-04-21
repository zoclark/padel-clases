/**
 * generatePairings – top‑vs‑top · pistas fijas · sin "undef"
 * ----------------------------------------------------------
 *  ▸ Respeta pista_fija.
 *  ▸ En mixto cada pareja es Hombre‑Mujer (2 H / 2 M por pista).
 *  ▸ Los niveles altos se colocan primero en las pistas superiores,
 *    asignando mejor nivel total a pistas con menor índice.
 *  ▸ Cada pista procura equilibrio entre parejas y compatibilidad (reves/drive/zurdo).
 *  ▸ Stateless: cada llamada parte de cero; ningún efecto residual.
 */
export function generatePairings(jugadores, numPistas, tipoPozo = "mixto", epsilon = 0.01) {
    const PARTNER_DIFF_W = 0.5;
    const POSMAN_W = 0.15;
    const LOW_PAIR_W = 0.6;
    const LO_LVL = 1;
  
    const players = jugadores.map((p) => ({
      ...p,
      genero: p.genero ?? "hombre",
      sexo: p.genero === "mujer" ? "M" : "H",
      mano: p.mano_dominante ?? "diestro",
      nivel: Number(p.nivel) || 0,
      pista_fija: Number(p.pista_fija) || 0,
    }));
  
    const grupos = Array.from({ length: numPistas }, (_, i) => ({
      pista: i + 1,
      jugadores: [],
      fijos: false,
    }));
  
    const libres = [];
    for (const p of players) {
      if (p.pista_fija >= 1 && p.pista_fija <= numPistas) {
        grupos[p.pista_fija - 1].jugadores.push(p);
        grupos[p.pista_fija - 1].fijos = true;
      } else {
        libres.push(p);
      }
    }
  
    libres.sort((a, b) => b.nivel - a.nivel);
    const sinFijos = grupos.filter((g) => !g.fijos);
  
    // Generar todas las posibles combinaciones válidas de 4 jugadores
    const combinacionesValidas = [];
    for (let i = 0; i < libres.length; i++) {
      for (let j = i + 1; j < libres.length; j++) {
        for (let k = j + 1; k < libres.length; k++) {
          for (let l = k + 1; l < libres.length; l++) {
            const grupo = [libres[i], libres[j], libres[k], libres[l]];
  
            const hombres = grupo.filter(p => p.genero === "hombre").length;
            const mujeres = grupo.length - hombres;
            if (tipoPozo === "mixto" && (hombres !== 2 || mujeres !== 2)) continue;
  
            // Generar todas las permutaciones para formar dos parejas
            const pares = [
              [[grupo[0], grupo[1]], [grupo[2], grupo[3]]],
              [[grupo[0], grupo[2]], [grupo[1], grupo[3]]],
              [[grupo[0], grupo[3]], [grupo[1], grupo[2]]],
            ];
  
            for (const [A, B] of pares) {
              const totA = A[0].nivel + A[1].nivel;
              const totB = B[0].nivel + B[1].nivel;
              const avgA = totA / 2;
              const avgB = totB / 2;
              const diffAvg = Math.abs(avgA - avgB);
              const partnerDiff = Math.abs(A[0].nivel - A[1].nivel) + Math.abs(B[0].nivel - B[1].nivel);
              const lowPair = (A.every(x => x.nivel <= LO_LVL) ? 1 : 0) + (B.every(x => x.nivel <= LO_LVL) ? 1 : 0);
  
              let posMan = 0;
              for (const t of [A, B]) {
                if (t[0].posicion === t[1].posicion && t[0].posicion !== "Ambos") posMan++;
                if (t[0].mano === "zurdo" && t[1].mano === "zurdo") posMan++;
              }
  
              const metric = diffAvg * 2 + partnerDiff * PARTNER_DIFF_W + posMan * POSMAN_W + lowPair * LOW_PAIR_W;
              combinacionesValidas.push({ A, B, jugadores: grupo, nivelTotal: totA + totB, metric });
            }
          }
        }
      }
    }
  
    // Ordenar combinaciones por mayor nivel total y menor métrica
    combinacionesValidas.sort((a, b) => b.nivelTotal - a.nivelTotal || a.metric - b.metric);
  
    for (const g of sinFijos) {
      const pick = combinacionesValidas.find(c => c.jugadores.every(j => libres.includes(j)));
      if (!pick) break;
      g.jugadores.push(...pick.jugadores);
      pick.jugadores.forEach(p => libres.splice(libres.indexOf(p), 1));
    }
  
    const matches = [];
    for (const g of grupos) {
      const p = g.jugadores;
      if (p.length < 4) continue;
      const perms = [
        [0, 1, 2, 3],
        [0, 2, 1, 3],
        [0, 3, 1, 2],
      ];
      let best = null;
  
      for (const [i1, i2, j1, j2] of perms) {
        const A = [p[i1], p[i2]];
        const B = [p[j1], p[j2]];
        if (tipoPozo === "mixto") {
          const ok = (t) => t.some((x) => x.genero === "hombre") && t.some((x) => x.genero === "mujer");
          if (!ok(A) || !ok(B)) continue;
        }
  
        const totA = A[0].nivel + A[1].nivel;
        const totB = B[0].nivel + B[1].nivel;
        const avgA = totA / 2;
        const avgB = totB / 2;
        const diffAvg = Math.abs(avgA - avgB);
        const partnerDiff = Math.abs(A[0].nivel - A[1].nivel) + Math.abs(B[0].nivel - B[1].nivel);
        const lowPair = (A.every((x) => x.nivel <= LO_LVL) ? 1 : 0) + (B.every((x) => x.nivel <= LO_LVL) ? 1 : 0);
  
        let posMan = 0;
        for (const t of [A, B]) {
          if (t[0].posicion === t[1].posicion && t[0].posicion !== "Ambos") posMan++;
          if (t[0].mano === "zurdo" && t[1].mano === "zurdo") posMan++;
        }
  
        const metric = diffAvg * 2 + partnerDiff * PARTNER_DIFF_W + posMan * POSMAN_W + lowPair * LOW_PAIR_W;
        if (!best || metric < best.metric) best = { A, B, metric, avgA, avgB, totA, totB, diffAvg };
      }
  
      if (best) {
        const describe = (p) => `${p.nombre} (${p.sexo} ${p.mano === "zurdo" ? "🩲" : "✋"} ${p.nivel})`;
        matches.push({
          pista: g.pista,
          teams: [best.A.map(describe), best.B.map(describe)],
          totals: [best.totA, best.totB],
          avgs: [best.avgA.toFixed(1), best.avgB.toFixed(1)],
          diffAvg: best.diffAvg.toFixed(1),
          diffTot: Math.abs(best.totA - best.totB),
        });
      }
    }
  
    matches.sort((a, b) => a.pista - b.pista);
    return { matches, debug: [] };
  }
  