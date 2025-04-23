export function generatePairings(jugadores, numPistas, tipoPozo = "mixto", epsilon = 0.01) {
    const PARTNER_DIFF_W  = 0.5;
    const POSMAN_W        = 0.15;
    const ZURDO_ZURDO_W   = 0.5;

    // 1) Coerción y defaults
    const players = jugadores.map(p => ({
      ...p,
      genero:          p.genero            ?? "hombre",
      nivel:           Number(p.nivel)     || 0,
      pista_fija:      Number(p.pista_fija) || 0,
      mano:            p.mano_dominante    || "diestro",
      posicion:        p.posicion          || "Ambos",
      juega_con:       p.juega_con         || [],
      juega_contra:    p.juega_contra      || [],
      no_juega_con:    p.no_juega_con      || [],
      no_juega_contra: p.no_juega_contra   || [],
    }));

    // Validaciones
    for (const p of players) {
      if (p.juega_con && p.juega_con.length > 1) {
        throw new Error(`El jugador ${p.nombre} tiene más de un 'juega_con' (${p.juega_con.join(", ")}). No permitido.`);
      }
      if (p.juega_contra && p.juega_contra.length > 2) {
        throw new Error(`El jugador ${p.nombre} tiene más de dos 'juega_contra' (${p.juega_contra.join(", ")}). No permitido.`);
      }
    }

    // 2) Separar fijos y pool libre
    const grupos = Array.from({ length: numPistas }, (_, i) => ({
      pista:     i + 1,
      jugadores: [],
      fijos:     false,
    }));
    const pool = [];
    for (const p of players) {
      if (p.pista_fija >= 1 && p.pista_fija <= numPistas) {
        const g = grupos[p.pista_fija - 1];
        g.jugadores.push(p);
        g.fijos = true;
      } else {
        pool.push(p);
      }
    }

    // 3) Extraer forcedPairs del pool (y priorizar generación de partidos con juega_con y juega_contra)
    const forcedMatches = [];
    while (true) {
      const idxPair = pool.findIndex(p => p.juega_con && p.juega_con.length === 1);
      if (idxPair === -1) break;
      const p1 = pool[idxPair];
      const pairId = p1.juega_con[0];
      const idxP2 = pool.findIndex(p => p.id === pairId);
      if (idxP2 === -1) break;
      const p2 = pool[idxP2];
      pool.splice(Math.max(idxPair, idxP2), 1);
      pool.splice(Math.min(idxPair, idxP2), 1);

      // Buscar rivales ideales (juega_contra de cualquiera de los dos)
      let rivales = [];
      let rivalesIds = [...(p1.juega_contra || []), ...(p2.juega_contra || [])];
      rivalesIds = [...new Set(rivalesIds)];
      for (const rid of rivalesIds) {
        const idxR = pool.findIndex(p => p.id === rid);
        if (idxR !== -1) {
          rivales.push(pool[idxR]);
        }
      }
      // Buscar mejor acompañante para equipo rival si falta alguno
      while (rivales.length < 2 && pool.length > 0) {
        let candidates = pool.filter(cand =>
          !(p1.no_juega_contra || []).includes(cand.id) &&
          !(p2.no_juega_contra || []).includes(cand.id) &&
          !rivales.includes(cand)
        );
        if (tipoPozo === "mixto" && rivales.length === 1) {
          const ya = rivales[0];
          const hombres = candidates.filter(p => p.genero === "hombre");
          const mujeres = candidates.filter(p => p.genero === "mujer");
          if (ya.genero === "hombre" && mujeres.length) candidates = mujeres;
          else if (ya.genero === "mujer" && hombres.length) candidates = hombres;
        }
        if (rivales.length === 1) {
          candidates = candidates.filter(c => !(c.mano === "zurdo" && rivales[0].mano === "zurdo"));
        }
        if (rivales.length === 1) {
          const pos = rivales[0].posicion;
          if (pos !== "Ambos") {
            candidates = candidates.filter(c => c.posicion !== pos || c.posicion === "Ambos");
          }
        }
        let bestDiff = Infinity, picks = [];
        for (const cand of candidates) {
          const totA = p1.nivel + p2.nivel;
          const totB = rivales.length === 1 ? rivales[0].nivel + cand.nivel : cand.nivel;
          const diff = Math.abs(totA - totB);
          if (diff < bestDiff) {
            bestDiff = diff;
            picks = [cand];
          } else if (diff === bestDiff) {
            picks.push(cand);
          }
        }
        let compañero = picks.length ? picks[Math.floor(Math.random() * picks.length)] : null;
        if (compañero) {
          rivales.push(compañero);
          const idx = pool.findIndex(p => p.id === compañero.id);
          if (idx !== -1) pool.splice(idx, 1);
        } else {
          break;
        }
      }
      if (rivales.length < 2) {
        forcedMatches.push({
          A: [p1, p2],
          B: rivales,
          basePista: null,
          fixed: false,
          avgOverall: ([p1, p2, ...rivales].reduce((s, p) => s + p.nivel, 0)) / ([p1, p2, ...rivales].length || 1),
          diffAvg: 0,
          diffTot: 0,
          totals: [[p1.nivel + p2.nivel], [rivales.reduce((s, p) => s + p.nivel, 0)]],
          avgs: [
            (p1.nivel + p2.nivel) / 2,
            rivales.length ? rivales.reduce((s, p) => s + p.nivel, 0) / rivales.length : 0
          ],
          ids: [[p1.id, p2.id], rivales.map(p => p.id)],
          incompleto: true
        });
        for (const r of rivales) {
          const idx = pool.findIndex(p => p.id === r.id);
          if (idx !== -1) pool.splice(idx, 1);
        }
      } else {
        forcedMatches.push({
          A: [p1, p2],
          B: [rivales[0], rivales[1]],
          basePista: null,
          fixed: false,
          avgOverall: ([p1, p2, rivales[0], rivales[1]].reduce((s, p) => s + p.nivel, 0)) / 4,
          diffAvg: Math.abs(((p1.nivel + p2.nivel) / 2) - ((rivales[0].nivel + rivales[1].nivel) / 2)),
          diffTot: Math.abs((p1.nivel + p2.nivel) - (rivales[0].nivel + rivales[1].nivel)),
          totals: [p1.nivel + p2.nivel, rivales[0].nivel + rivales[1].nivel],
          avgs: [
            (p1.nivel + p2.nivel) / 2,
            (rivales[0].nivel + rivales[1].nivel) / 2
          ],
          ids: [[p1.id, p2.id], [rivales[0].id, rivales[1].id]],
          incompleto: false
        });
        for (const r of rivales.slice(0, 2)) {
          const idx = pool.findIndex(p => p.id === r.id);
          if (idx !== -1) pool.splice(idx, 1);
        }
      }
    }

    // Extraer forcedRivals del pool (juega_contra, pero SIN pareja forzada)
    const forcedRivalMatches = [];
    while (true) {
      const idx = pool.findIndex(p => p.juega_contra && p.juega_contra.length > 0);
      if (idx === -1) break;
      const A = pool[idx];
      const bid = A.juega_contra[0];
      const j = pool.findIndex(x => x.id === bid);
      if (j === -1) break;
      const B = pool[j];
      pool.splice(Math.max(idx, j), 1);
      pool.splice(Math.min(idx, j), 1);

      let compA = null, compB = null;

      if (pool.length) {
        let candidatesA = pool.filter(cand =>
          !(A.no_juega_con || []).includes(cand.id)
        );
        if (tipoPozo === "mixto") {
          if (A.genero === "hombre") {
            const mujeres = candidatesA.filter(p => p.genero === "mujer");
            if (mujeres.length) candidatesA = mujeres;
          } else if (A.genero === "mujer") {
            const hombres = candidatesA.filter(p => p.genero === "hombre");
            if (hombres.length) candidatesA = hombres;
          }
        }
        candidatesA = candidatesA.filter(c => !(c.mano === "zurdo" && A.mano === "zurdo"));
        if (A.posicion !== "Ambos") {
          candidatesA = candidatesA.filter(c => c.posicion !== A.posicion || c.posicion === "Ambos");
        }
        let bestDiffA = Infinity, picksA = [];
        for (const cand of candidatesA) {
          const diff = Math.abs((A.nivel + cand.nivel) - B.nivel);
          if (diff < bestDiffA) {
            bestDiffA = diff;
            picksA = [cand];
          } else if (diff === bestDiffA) {
            picksA.push(cand);
          }
        }
        compA = picksA.length ? picksA[Math.floor(Math.random() * picksA.length)] : null;
        if (compA) {
          const idxA = pool.findIndex(p => p.id === compA.id);
          if (idxA !== -1) pool.splice(idxA, 1);
        }
      }

      if (pool.length) {
        let candidatesB = pool.filter(cand =>
          !(B.no_juega_con || []).includes(cand.id)
        );
        if (tipoPozo === "mixto") {
          if (B.genero === "hombre") {
            const mujeres = candidatesB.filter(p => p.genero === "mujer");
            if (mujeres.length) candidatesB = mujeres;
          } else if (B.genero === "mujer") {
            const hombres = candidatesB.filter(p => p.genero === "hombre");
            if (hombres.length) candidatesB = hombres;
          }
        }
        candidatesB = candidatesB.filter(c => !(c.mano === "zurdo" && B.mano === "zurdo"));
        if (B.posicion !== "Ambos") {
          candidatesB = candidatesB.filter(c => c.posicion !== B.posicion || c.posicion === "Ambos");
        }
        let bestDiffB = Infinity, picksB = [];
        for (const cand of candidatesB) {
          const diff = Math.abs((B.nivel + cand.nivel) - (A.nivel + (compA?.nivel ?? 0)));
          if (diff < bestDiffB) {
            bestDiffB = diff;
            picksB = [cand];
          } else if (diff === bestDiffB) {
            picksB.push(cand);
          }
        }
        compB = picksB.length ? picksB[Math.floor(Math.random() * picksB.length)] : null;
        if (compB) {
          const idxB = pool.findIndex(p => p.id === compB.id);
          if (idxB !== -1) pool.splice(idxB, 1);
        }
      }

      const teamA = [A, compA].filter(Boolean);
      const teamB = [B, compB].filter(Boolean);

      forcedRivalMatches.push({
        A: teamA,
        B: teamB,
        basePista: null,
        fixed: false,
        avgOverall: (teamA.reduce((s, p) => s + p.nivel, 0) + teamB.reduce((s, p) => s + p.nivel, 0)) / (teamA.length + teamB.length),
        diffAvg: Math.abs(
          (teamA.reduce((s, p) => s + p.nivel, 0) / (teamA.length || 1)) -
          (teamB.reduce((s, p) => s + p.nivel, 0) / (teamB.length || 1))
        ),
        diffTot: Math.abs(teamA.reduce((s, p) => s + p.nivel, 0) - teamB.reduce((s, p) => s + p.nivel, 0)),
        totals: [teamA.reduce((s, p) => s + p.nivel, 0), teamB.reduce((s, p) => s + p.nivel, 0)],
        avgs: [
          teamA.reduce((s, p) => s + p.nivel, 0) / (teamA.length || 1),
          teamB.reduce((s, p) => s + p.nivel, 0) / (teamB.length || 1)
        ],
        ids: [teamA.map(p => p.id), teamB.map(p => p.id)],
        incompleto: (teamA.length < 2 || teamB.length < 2)
      });
    }

    // Aux: combinaciones n choose k
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

    // 4) Rellenar cada pista fija hasta 4 con el pool
    function fillGroup(g) {
      const need = 4 - g.jugadores.length;
      if (need <= 0) return;
      pool.sort((a, b) => b.nivel - a.nivel || Math.random() - 0.5);
      const cand = pool.slice(0, Math.min(12, pool.length));
      let valid = combinations(cand, need).filter(grp => {
        for (let x = 0; x < grp.length; x++) {
          for (let y = x + 1; y < grp.length; y++) {
            const A = grp[x], B = grp[y];
            if (A.no_juega_con.includes(B.id) && A.no_juega_contra.includes(B.id)) return false;
            if (B.no_juega_con.includes(A.id) && B.no_juega_contra.includes(A.id)) return false;
          }
        }
        return true;
      });
      if (tipoPozo === "mixto") {
        const mix = valid.filter(grp => {
          const h = grp.filter(p => p.genero === "hombre").length;
          return h === 2 && grp.length - h === 2;
        });
        if (mix.length) valid = mix;
      }
      if (!valid.length) return;
      const scored = valid.map(grp => {
        const lvls = grp.map(p => p.nivel),
          sum = lvls.reduce((a, b) => a + b, 0),
          range = Math.max(...lvls) - Math.min(...lvls);
        return { grp, score: sum - 0.5 * range };
      }).sort((a, b) => b.score - a.score);
      const top = scored[0].score,
        picks = scored.filter(x => Math.abs(x.score - top) < 1e-6).map(x => x.grp),
        pick = picks[Math.floor(Math.random() * picks.length)];
      g.jugadores.push(...pick);
      const ids = new Set(pick.map(p => p.id));
      for (let i = pool.length - 1; i >= 0; i--) {
        if (ids.has(pool[i].id)) pool.splice(i, 1);
      }
    }
    grupos.forEach(fillGroup);

    // 5) buildTrials (relaciones + métrica)
    function buildTrials(arr, requireMixed = true) {
      const perms = [[0, 1, 2, 3], [0, 2, 1, 3], [0, 3, 1, 2]];
      const out = [];
      for (const [i1, i2, j1, j2] of perms) {
        const A = [arr[i1], arr[i2]], B = [arr[j1], arr[j2]];
        if (requireMixed && tipoPozo === "mixto") {
          if (!A.some(x => x.genero === "hombre") || !A.some(x => x.genero === "mujer")
            || !B.some(x => x.genero === "hombre") || !B.some(x => x.genero === "mujer"))
            continue;
        }
        let ok = true;
        for (const X of [...A, ...B]) {
          for (const Y of [...A, ...B]) {
            if (X.id === Y.id) continue;
            if ((X.juega_con.includes(Y.id) || Y.juega_con.includes(X.id)) &&
              !((A.includes(X) && A.includes(Y)) || (B.includes(X) && B.includes(Y)))) ok = false;
            if ((X.juega_contra.includes(Y.id) || Y.juega_contra.includes(X.id)) &&
              !((A.includes(X) && B.includes(Y)) || (A.includes(Y) && B.includes(X)))) ok = false;
            if (X.no_juega_con.includes(Y.id) &&
              ((A.includes(X) && A.includes(Y)) || (B.includes(X) && B.includes(Y)))) ok = false;
            if (X.no_juega_contra.includes(Y.id) &&
              ((A.includes(X) && B.includes(Y)) || (B.includes(X) && A.includes(Y)))) ok = false;
            if (!ok) break;
          }
          if (!ok) break;
        }
        if (!ok) continue;
        const totA = A[0].nivel + A[1].nivel,
          totB = B[0].nivel + B[1].nivel,
          avgA = totA / 2, avgB = totB / 2,
          diffAvg = Math.abs(avgA - avgB),
          partnerDiff = Math.abs(A[0].nivel - A[1].nivel)
            + Math.abs(B[0].nivel - B[1].nivel);
        let posMan = 0, zz = 0;
        for (const t of [A, B]) {
          if (t[0].posicion === t[1].posicion && t[0].posicion !== "Ambos") posMan++;
          if (t[0].mano === "zurdo" && t[1].mano === "zurdo") zz++;
        }
        const metric = diffAvg * 2
          + partnerDiff * PARTNER_DIFF_W
          + posMan * POSMAN_W
          + zz * ZURDO_ZURDO_W;
        out.push({ A, B, metric, diffAvg, totA, totB, avgA, avgB });
      }
      return out;
    }

    // 6) Generar partidos de grupo
    const groupMatches = [];
    for (const g of grupos) {
      if (g.jugadores.length < 4) continue;
      let ts = buildTrials(g.jugadores, true);
      if (!ts.length && tipoPozo === "mixto") ts = buildTrials(g.jugadores, false);
      if (!ts.length) continue;
      ts.sort((a, b) => a.metric - b.metric);
      const best = ts.filter(t => t.metric <= ts[0].metric + epsilon),
        pick = best[Math.floor(Math.random() * best.length)];
      groupMatches.push({
        A: pick.A, B: pick.B,
        basePista: g.pista,
        fixed: g.fijos,
        avgOverall: (pick.avgA + pick.avgB) / 2,
        diffAvg: pick.diffAvg,
        diffTot: Math.abs(pick.totA - pick.totB),
        totals: [pick.totA, pick.totB],
        avgs: [pick.avgA, pick.avgB],
        ids: [pick.A.map(p => p.id), pick.B.map(p => p.id)]
      });
    }

    // =====================
    // DRAFT GLOBAL para partidos libres (aplicar después de groupMatches)
    function draftGlobalPairings(groupMatches, tipoPozo = "mixto") {
      // Solo partidos no fijos
      const libres = groupMatches.filter(m => !m.fixed);
      let allPairs = [];
      libres.forEach(m => {
          allPairs.push({pair: m.A, nivel: m.totals[0], avg: m.avgs[0]});
          allPairs.push({pair: m.B, nivel: m.totals[1], avg: m.avgs[1]});
      });
      // Emparejar parejas (el draft)
      let drafted = [], used = new Set();
      while (allPairs.length - used.size >= 2) {
          let i = allPairs.findIndex((p, idx) => !used.has(idx));
          if (i === -1) break;
          let base = allPairs[i];
          used.add(i);
          let bestIdx = -1, bestDiff = Infinity;
          for (let j = 0; j < allPairs.length; ++j) {
              if (i === j || used.has(j)) continue;
              if (tipoPozo === "mixto") {
                  const aH = base.pair.filter(x => x.genero === "hombre").length;
                  const aM = base.pair.length - aH;
                  const bH = allPairs[j].pair.filter(x => x.genero === "hombre").length;
                  const bM = allPairs[j].pair.length - bH;
                  if ((aH === 2 || aM === 2) && (bH === 2 || bM === 2)) continue;
              }
              const diff = Math.abs(base.nivel - allPairs[j].nivel);
              if (diff < bestDiff) {
                  bestDiff = diff;
                  bestIdx = j;
              }
          }
          if (bestIdx !== -1) {
              drafted.push({
                  A: base.pair,
                  B: allPairs[bestIdx].pair,
                  basePista: null,
                  fixed: false,
                  avgOverall: (base.avg + allPairs[bestIdx].avg) / 2,
                  diffAvg: Math.abs(base.avg - allPairs[bestIdx].avg),
                  diffTot: Math.abs(base.nivel - allPairs[bestIdx].nivel),
                  totals: [base.nivel, allPairs[bestIdx].nivel],
                  avgs: [base.avg, allPairs[bestIdx].avg],
                  ids: [base.pair.map(p => p.id), allPairs[bestIdx].pair.map(p => p.id)]
              });
              used.add(bestIdx);
          } else {
              used.add(i);
          }
      }
      return drafted;
    }
    // =====================

    // 7) Unir todos los partidos (fijos, forzados, resto)
    const fixedMatches = groupMatches.filter(m => m.fixed);
    // draft global solo para partidos libres (no fijos ni forced)
    const draftedMatches = draftGlobalPairings(groupMatches, tipoPozo);
    const freeMatches = [
      ...forcedMatches,
      ...forcedRivalMatches,
      ...draftedMatches // <--- draft global
    ];
    const usedPistas = new Set(fixedMatches.map(m => m.basePista));
    const freePistas = grupos.map(g => g.pista).filter(p => !usedPistas.has(p));
    freeMatches.sort((a, b) => {
      if (b.avgOverall !== a.avgOverall) return b.avgOverall - a.avgOverall;
      return a.diffAvg - b.diffAvg;
    });
    freeMatches.forEach((m, i) => m.basePista = freePistas[i]);

    // 8) Ajuste de adyacencias (corregido para evitar duplicados)
    const all = [...fixedMatches, ...freeMatches];
    const bad = [];
    for (const p of players) {
      for (const b of p.no_juega_con) {
        if (p.no_juega_contra.includes(b)) bad.push([p.id, b]);
      }
    }
    const deltas = [1, -1, 3, -3, 5, -5];
    const processedPlayers = new Set();
    const processedMatches = new Set();

    for (const [a, b] of bad) {
      if (processedPlayers.has(a) || processedPlayers.has(b)) continue;
      const iA = all.findIndex(m => m.ids[0].includes(a) || m.ids[1].includes(a));
      const iB = all.findIndex(m => m.ids[0].includes(b) || m.ids[1].includes(b));
      if (iA < 0 || iB < 0 || iA === iB) continue;

      const idxHigh = all[iA].avgOverall > all[iB].avgOverall ? iA : iB;
      const idxLow = idxHigh === iA ? iB : iA;
      const matchLow = all[idxLow];
      const avgLow = matchLow.avgOverall;

      if (processedMatches.has(matchLow)) continue;

      let bestMove = null, bestCost = Infinity;
      for (const d of deltas) {
        const t = idxHigh + d;
        if (t < 0 || t >= all.length) continue;
        const avgDest = all[t].avgOverall;
        if (avgLow > avgDest && t > idxHigh) continue;
        if (avgLow < avgDest && t < idxHigh) continue;
        const cost = Math.abs(idxLow - t);
        if (cost < bestCost) {
          bestCost = cost;
          bestMove = t;
        }
      }
      if (bestMove != null) {
        all.splice(idxLow, 1);
        const insertPos = bestMove > idxLow ? bestMove - 1 : bestMove;
        all.splice(insertPos, 0, matchLow);
        processedMatches.add(matchLow);
      }
      processedPlayers.add(a);
      processedPlayers.add(b);
    }

    // 8.b) reasignar pistas 1..numPistas según nuevo orden
    all.sort((a, b) => {
        if (b.avgOverall !== a.avgOverall) return b.avgOverall - a.avgOverall;
        return a.diffAvg - b.diffAvg;
      });
      all.forEach((m, idx) => {
        m.basePista = idx + 1;
      });

    // --- Eliminar partidos con jugadores duplicados (asegura unicidad) ---
    const usedPlayers = new Set();
    const uniqueMatches = [];
    for (const m of all) {
      const ids = [...(m.A || []), ...(m.B || [])].map(p => p.id);
      if (ids.some(id => usedPlayers.has(id))) continue;
      ids.forEach(id => usedPlayers.add(id));
      uniqueMatches.push(m);
    }

    // --- NUEVO: Reasignar los jugadores sin partido a partidos incompletos ---
    const todosIds = new Set(players.map(p => p.id));
    const asignadosIds = new Set();
    uniqueMatches.forEach(m => {
      [...(m.A || []), ...(m.B || [])].forEach(p => asignadosIds.add(p.id));
    });
    const sinPartido = [...todosIds].filter(id => !asignadosIds.has(id));
    if (sinPartido.length > 0) {
      let idxPista = uniqueMatches.length + 1;
      for (let i = 0; i < sinPartido.length; i += 4) {
        const ids = sinPartido.slice(i, i + 4);
        const jugadoresIncompletos = ids.map(id => players.find(p => p.id === id));
        const mitad = Math.ceil(jugadoresIncompletos.length / 2);
        const A = jugadoresIncompletos.slice(0, mitad);
        const B = jugadoresIncompletos.slice(mitad);
        uniqueMatches.push({
          A, B,
          basePista: idxPista++,
          fixed: false,
          avgOverall: (A.reduce((s, p) => s + p.nivel, 0) + B.reduce((s, p) => s + p.nivel, 0)) / (A.length + B.length),
          diffAvg: Math.abs(
            (A.reduce((s, p) => s + p.nivel, 0) / (A.length || 1)) -
            (B.length ? B.reduce((s, p) => s + p.nivel, 0) / B.length : 0)
          ),
          diffTot: Math.abs(A.reduce((s, p) => s + p.nivel, 0) - B.reduce((s, p) => s + p.nivel, 0)),
          totals: [A.reduce((s, p) => s + p.nivel, 0), B.reduce((s, p) => s + p.nivel, 0)],
          avgs: [
            A.length ? A.reduce((s, p) => s + p.nivel, 0) / A.length : 0,
            B.length ? B.reduce((s, p) => s + p.nivel, 0) / B.length : 0,
          ],
          ids: [A.map(p => p.id), B.map(p => p.id)],
          incompleto: true
        });
      }
    }

    // 9) Formatear UI
    function formatPlayer(p) {
      const icon = p.genero === 'hombre' ? '👦' : '👧',
        hand = p.mano === 'zurdo' ? '🫲' : '✋';
      return `${p.nombre} (${icon} ${p.nivel}, ${p.posicion}, ${hand})`;
    }
    const matches = uniqueMatches.map(m => ({
      pista: m.basePista,
      teams: [(m.A || []).slice(0, 2).map(formatPlayer), (m.B || []).slice(0, 2).map(formatPlayer)],
      totals: m.totals || [0, 0],
      avgs: (m.avgs || [0, 0]).map(x => x.toFixed(1)),
      diffAvg: (m.diffAvg || 0).toFixed(1),
      diffTot: m.diffTot || 0,
      incompleto: m.incompleto || false
    }));
    const debug = uniqueMatches.map(m => ({
      pista: m.basePista,
      avgOverall: Number((m.avgOverall || 0).toFixed(2)),
      diffAvg: Number((m.diffAvg || 0).toFixed(2))
    }));

    return { matches, debug, sinPartido: sinPartido.map(id => players.find(p => p.id === id)?.nombre) };
}
