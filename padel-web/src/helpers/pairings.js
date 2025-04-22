// src/helpers/pairings.js

/**
 * generatePairings – top‑vs‑top · pistas fijas · sin "undef"
 * ----------------------------------------------------------
 *  ▸ Respeta pista_fija.
 *  ▸ En mixto busca H‑M (2 H / 2 M) por pista, y si no hay modo,
 *    acepta H-H o M-M para llenar.
 *  ▸ Los niveles altos se colocan primero en las pistas libres superiores,
 *    agrupando siempre a los mejores, y mezclando aleatoriamente jugadores de mismo nivel.
 *  ▸ Dentro de cada pista minimiza diffAvg, partnerDiff, penaliza z-z y posMan.
 *  ▸ Llena todas las pistas posibles sin abortar el proceso.
 *  ▸ Stateless: cada llamada parte de cero.
 */
export function generatePairings(jugadores, numPistas, tipoPozo = "mixto", epsilon = 0.01) {
    const PARTNER_DIFF_W  = 0.5;
    const POSMAN_W        = 0.15;
    const ZURDO_ZURDO_W   = 0.5;

    // 1) Coerción y defaults
    const players = jugadores.map(p => ({
      ...p,
      genero:     p.genero ?? "hombre",
      nivel:      Number(p.nivel)      || 0,
      pista_fija: Number(p.pista_fija) || 0,
      mano:       p.mano_dominante     || "diestro",
      posicion:   p.posicion           || "Ambos",
    }));

    // 2) Creamos las pistas y separamos libres
    const grupos = Array.from({ length: numPistas }, (_, i) => ({
      pista: i + 1,
      jugadores: [],
      fijos: false,
    }));
    let libres = [];
    for (const p of players) {
      if (p.pista_fija >= 1 && p.pista_fija <= numPistas) {
        grupos[p.pista_fija - 1].jugadores.push(p);
        grupos[p.pista_fija - 1].fijos = true;
      } else {
        libres.push(p);
      }
    }

    // 3) Orden descendente de nivel para los libres (aleatorio entre mismos niveles)
    libres.sort((a, b) => {
      if (b.nivel !== a.nivel) return b.nivel - a.nivel;
      return Math.random() - 0.5;
    });

    // 4) Generador de combinaciones n-choose-k
    function combinations(arr, k) {
      const res = [];
      (function go(start, combo) {
        if (combo.length === k) { res.push(combo.slice()); return; }
        for (let i = start; i < arr.length; i++) {
          combo.push(arr[i]);
          go(i + 1, combo);
          combo.pop();
        }
      })(0, []);
      return res;
    }

    // 5) Llenar pistas libres
    const sinFijos = grupos.filter(g => !g.fijos).sort((a, b) => a.pista - b.pista);
    for (const g of sinFijos) {
      const topN  = libres.slice(0, Math.min(12, libres.length));
      let comb4   = combinations(topN, 4);

      if (tipoPozo === "mixto") {
        // primero intento sólo H‑M
        const mixedOnly = comb4.filter(grp => {
          const h = grp.filter(p => p.genero === "hombre").length;
          return h === 2 && grp.length - h === 2;
        });
        if (mixedOnly.length > 0) {
          comb4 = mixedOnly;
        }
        // si mixedOnly vacío, comb4 incluye H-H/M-M
      }

      if (!comb4.length) {
        // no hay suficientes jugadores para formar grupo de 4
        continue;
      }

      // puntuar grupos y elegir el más equilibrado
      const scored = comb4.map(grp => {
        const lvls  = grp.map(p => p.nivel);
        const sum   = lvls.reduce((a, b) => a + b, 0);
        const range = Math.max(...lvls) - Math.min(...lvls);
        return { grp, score: sum - 0.5 * range };
      });
      scored.sort((a, b) => b.score - a.score);
      const topScore = scored[0].score;
      const picks    = scored.filter(x => Math.abs(x.score - topScore) < 1e-6).map(x => x.grp);
      const pickGrp  = picks[Math.floor(Math.random() * picks.length)];

      // asigno los 4 a la pista
      g.jugadores.push(...pickGrp);
      const names = new Set(pickGrp.map(p => p.nombre));
      libres = libres.filter(p => !names.has(p.nombre));
    }

    // 6) Trials interno para AB vs CD con opción fallback
    function buildTrials(p4, requireMixed = true) {
      const perms = [
        [0, 1, 2, 3],
        [0, 2, 1, 3],
        [0, 3, 1, 2]
      ];
      const trials = [];
      let validCount = 0;

      for (const [i1, i2, j1, j2] of perms) {
        const A = [p4[i1], p4[i2]];
        const B = [p4[j1], p4[j2]];
        let ok = true;
        if (requireMixed && tipoPozo === "mixto") {
          ok = A.some(x => x.genero === "hombre") && A.some(x => x.genero === "mujer")
            && B.some(x => x.genero === "hombre") && B.some(x => x.genero === "mujer");
        }
        if (!ok) continue;
        validCount++;

        const totA = A[0].nivel + A[1].nivel;
        const totB = B[0].nivel + B[1].nivel;
        const avgA = totA / 2;
        const avgB = totB / 2;
        const diffAvg = Math.abs(avgA - avgB);
        const partnerDiff = Math.abs(A[0].nivel - A[1].nivel) + Math.abs(B[0].nivel - B[1].nivel);
        let posMan = 0, zz = 0;

        for (const t of [A, B]) {
          if (t[0].posicion === t[1].posicion && t[0].posicion !== "Ambos") posMan++;
          if (t[0].mano === "zurdo" && t[1].mano === "zurdo") zz++;
        }

        const metric = diffAvg * 2
                     + partnerDiff * PARTNER_DIFF_W
                     + posMan       * POSMAN_W
                     + zz           * ZURDO_ZURDO_W;

        trials.push({ A, B, metric, diffAvg, totA, totB, avgA, avgB });
      }

      return { trials, totalTrials: perms.length, validTrials: validCount };
    }

    // 7) Función describe para strings completos
    function describe(p) {
      const icon = p.genero === "hombre" ? "👦" : "👧";
      const mano = p.mano   === "zurdo"   ? "🫲" : "✋";
      return `${p.nombre} (${icon} ${p.nivel}, ${p.posicion}, ${mano})`;
    }

    // 8) Empaquetar resultado
    const matches = [], debug = [];
    for (const g of grupos) {
      if (g.jugadores.length < 4) {
        debug.push({ pista: g.pista, msg: "❌ no completada" });
        continue;
      }

      // Primero intento mixto
      let { trials, totalTrials, validTrials } = buildTrials(g.jugadores, true);
      if (trials.length === 0 && tipoPozo === "mixto") {
        // fallback: permitir H-H / M-M
        ({ trials, totalTrials, validTrials } = buildTrials(g.jugadores, false));
        debug.push({ pista: g.pista, msg: "⚠️ fallback same-sex" });
      }
      if (trials.length === 0) {
        debug.push({ pista: g.pista, msg: "❌ sin pairing posible" });
        continue;
      }

      trials.sort((a, b) => a.metric - b.metric);
      const bestM = trials[0].metric;
      const opts  = trials.filter(t => t.metric <= bestM + epsilon);
      const pick  = opts[Math.floor(Math.random() * opts.length)];

      matches.push({
        pista   : g.pista,
        teams   : [ pick.A.map(describe), pick.B.map(describe) ],
        totals  : [pick.totA, pick.totB],
        avgs    : [pick.avgA.toFixed(1), pick.avgB.toFixed(1)],
        diffAvg : pick.diffAvg.toFixed(1),
        diffTot : Math.abs(pick.totA - pick.totB),
      });

      debug.push({
        pista:         g.pista,
        pairing:      `${pick.A[0].nombre}&${pick.A[1].nombre} vs ${pick.B[0].nombre}&${pick.B[1].nombre}`,
        metric:        pick.metric.toFixed(2),
        totalTrials,
        validTrials,
        epsilonTrials: opts.length,
      });
    }

    matches.sort((a, b) => a.pista - b.pista);
    debug.sort((a, b) => a.pista - b.pista);
    return { matches, debug };
}
