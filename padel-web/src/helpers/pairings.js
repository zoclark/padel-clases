// src/helpers/pairings.js

/**
 * generatePairings – top‑vs‑top · pistas fijas · sin "undef"
 * ----------------------------------------------------------
 *  ▸ Respeta pista_fija.
 *  ▸ En mixto busca H‑M (2 H / 2 M) por pista, y si no hay modo,
 *    acepta H-H o M-M para llenar.
 *  ▸ Respeta todas las relaciones juega_con, juega_contra,
 *    no_juega_con y no_juega_contra.
 *  ▸ EXTRA: extrae forcedPairs pero **no** los mete en los grupos,
 *         sino que genera partidos propios para ellos.
 *  ▸ Genera todos los partidos posibles y luego asigna pistas
 *    libre según nivel medio (descendente) y diffAvg (ascendente).
 *  ▸ Ajusta adyacencias “no total” al final (ventana flexible).
 *  ▸ Stateless: cada llamada parte de cero.
 */
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
  
    // 3) Extraer forcedPairs del pool
    const forcedPairs = [];
    for (let i = 0; i < pool.length; i++) {
      const A = pool[i];
      for (const bid of A.juega_con) {
        const j = pool.findIndex(x => x.id === bid);
        if (j > -1) {
          forcedPairs.push([A, pool[j]]);
          pool.splice(j, 1);
          pool.splice(i, 1);
          i--;
          break;
        }
      }
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
  
    // 4) Rellenar cada pista hasta 4 con el pool
    function fillGroup(g) {
      const need = 4 - g.jugadores.length;
      if (need <= 0) return;
      pool.sort((a,b)=>b.nivel - a.nivel || Math.random() - 0.5);
      const cand = pool.slice(0, Math.min(12, pool.length));
      let valid = combinations(cand, need).filter(grp => {
        for (let x = 0; x < grp.length; x++) {
          for (let y = x+1; y < grp.length; y++) {
            const A = grp[x], B = grp[y];
            if (A.no_juega_con.includes(B.id) && A.no_juega_contra.includes(B.id)) return false;
            if (B.no_juega_con.includes(A.id) && B.no_juega_contra.includes(A.id)) return false;
          }
        }
        return true;
      });
      if (tipoPozo === "mixto") {
        const mix = valid.filter(grp => {
          const h = grp.filter(p=>p.genero==="hombre").length;
          return h===2 && grp.length-h===2;
        });
        if (mix.length) valid = mix;
      }
      if (!valid.length) return;
      const scored = valid.map(grp => {
        const lvls = grp.map(p=>p.nivel),
              sum  = lvls.reduce((a,b)=>a+b,0),
              range= Math.max(...lvls)-Math.min(...lvls);
        return { grp, score: sum - 0.5*range };
      }).sort((a,b)=>b.score - a.score);
      const top   = scored[0].score,
            picks = scored.filter(x=>Math.abs(x.score-top)<1e-6).map(x=>x.grp),
            pick  = picks[Math.floor(Math.random()*picks.length)];
      g.jugadores.push(...pick);
      const ids = new Set(pick.map(p=>p.id));
      for (let i = pool.length-1; i>=0; i--) {
        if (ids.has(pool[i].id)) pool.splice(i,1);
      }
    }
    grupos.forEach(fillGroup);
  
    // 5) buildTrials (relaciones + métrica)
    function buildTrials(arr, requireMixed=true) {
      const perms = [[0,1,2,3],[0,2,1,3],[0,3,1,2]];
      const out = [];
      for (const [i1,i2,j1,j2] of perms) {
        const A=[arr[i1],arr[i2]], B=[arr[j1],arr[j2]];
        if (requireMixed && tipoPozo==="mixto") {
          if (!A.some(x=>x.genero==="hombre")||!A.some(x=>x.genero==="mujer")
           || !B.some(x=>x.genero==="hombre")||!B.some(x=>x.genero==="mujer"))
            continue;
        }
        let ok=true;
        for (const X of [...A,...B]) {
          for (const Y of [...A,...B]) {
            if (X.id===Y.id) continue;
            if ((X.juega_con.includes(Y.id)||Y.juega_con.includes(X.id)) &&
                !((A.includes(X)&&A.includes(Y))||(B.includes(X)&&B.includes(Y)))) ok=false;
            if ((X.juega_contra.includes(Y.id)||Y.juega_contra.includes(X.id)) &&
                !((A.includes(X)&&B.includes(Y))||(A.includes(Y)&&B.includes(X)))) ok=false;
            if (X.no_juega_con.includes(Y.id) &&
                ((A.includes(X) && A.includes(Y)) || (B.includes(X) && B.includes(Y)))) ok = false;
            if (X.no_juega_contra.includes(Y.id) &&
                ((A.includes(X) && B.includes(Y)) || (B.includes(X) && A.includes(Y)))) ok = false;
            if (!ok) break;
          }
          if (!ok) break;
        }
        if (!ok) continue;
        const totA=A[0].nivel+A[1].nivel,
              totB=B[0].nivel+B[1].nivel,
              avgA=totA/2, avgB=totB/2,
              diffAvg     = Math.abs(avgA-avgB),
              partnerDiff = Math.abs(A[0].nivel-A[1].nivel)
                          + Math.abs(B[0].nivel-B[1].nivel);
        let posMan=0, zz=0;
        for (const t of [A,B]) {
          if (t[0].posicion===t[1].posicion && t[0].posicion!=="Ambos") posMan++;
          if (t[0].mano==="zurdo" && t[1].mano==="zurdo") zz++;
        }
        const metric = diffAvg*2
                     + partnerDiff*PARTNER_DIFF_W
                     + posMan*POSMAN_W
                     + zz*ZURDO_ZURDO_W;
        out.push({ A,B,metric,diffAvg,totA,totB,avgA,avgB });
      }
      return out;
    }
  
    // 6) Generar partidos de grupo
    const groupMatches = [];
    for (const g of grupos) {
      if (g.jugadores.length < 4) continue;
      let ts = buildTrials(g.jugadores, true);
      if (!ts.length && tipoPozo==="mixto") ts = buildTrials(g.jugadores, false);
      if (!ts.length) continue;
      ts.sort((a,b)=>a.metric - b.metric);
      const best = ts.filter(t=>t.metric <= ts[0].metric + epsilon),
            pick = best[Math.floor(Math.random()*best.length)];
      groupMatches.push({
        A: pick.A, B: pick.B,
        basePista:  g.pista,
        fixed:      g.fijos,
        avgOverall: (pick.avgA+pick.avgB)/2,
        diffAvg:    pick.diffAvg,
        diffTot:    Math.abs(pick.totA-pick.totB),
        totals:     [pick.totA,pick.totB],
        avgs:       [pick.avgA,pick.avgB],
        ids:        [pick.A.map(p=>p.id), pick.B.map(p=>p.id)]
      });
    }
  
    // 6.a) forcedPairs → partidos propios
    const forcedMatches = [];
    for (const [A,B] of forcedPairs) {
      const avgAB = (A.nivel+B.nivel)/2;
      let best = null;
      for (const m of groupMatches) {
        ['A','B'].forEach(side => {
          const team = m[side],
                avgT = (team[0].nivel+team[1].nivel)/2,
                diff = Math.abs(avgAB-avgT);
          if (!best || diff < best.diff || 
              (Math.abs(diff-best.diff)<1e-6 && m.diffAvg < best.match.diffAvg)) {
            best = { match: m, side, diff };
          }
        });
      }
      if (!best) continue;
      forcedMatches.push({
        A: [A,B],
        B: best.match[best.side],
        basePista:  null,
        fixed:      false,
        avgOverall: (avgAB + best.match.avgOverall)/2,
        diffAvg:    best.diff,
        diffTot:    null,
        totals:     [A.nivel+B.nivel, best.match.totals[ best.side==='A'?0:1 ]],
        avgs:       [avgAB,            best.match.avgs[    best.side==='A'?0:1 ]],
        ids:        [[A.id,B.id],     best.match.ids[    best.side==='A'?0:1 ]]
      });
    }
  
    // 7) Separar fijos y libres, asignar pistas
    const fixedMatches     = groupMatches.filter(m=>m.fixed);
    const freeMatches      = [
      ...forcedMatches,
      ...groupMatches.filter(m=>!m.fixed)
    ];
    const usedPistas       = new Set(fixedMatches.map(m=>m.basePista));
    const freePistas       = grupos.map(g=>g.pista).filter(p=>!usedPistas.has(p));
    freeMatches.sort((a,b)=>{
      if (b.avgOverall !== a.avgOverall) return b.avgOverall - a.avgOverall;
      return a.diffAvg - b.diffAvg;
    });
    freeMatches.forEach((m,i)=>m.basePista = freePistas[i]);

    // 8) Ajuste de adyacencias (corregido para evitar duplicados)
    const all = [...fixedMatches, ...freeMatches];
    const bad = [];
    for (const p of players) {
      for (const b of p.no_juega_con) {
        if (p.no_juega_contra.includes(b)) bad.push([p.id, b]);
      }
    }
    const deltas           = [1, -1, 3, -3, 5, -5];
    const processedPlayers = new Set();
    const processedMatches = new Set();

    for (const [a, b] of bad) {
      if (processedPlayers.has(a) || processedPlayers.has(b)) continue;
      const iA = all.findIndex(m => m.ids[0].includes(a) || m.ids[1].includes(a));
      const iB = all.findIndex(m => m.ids[0].includes(b) || m.ids[1].includes(b));
      if (iA < 0 || iB < 0 || iA === iB) continue;

      const idxHigh = all[iA].avgOverall > all[iB].avgOverall ? iA : iB;
      const idxLow  = idxHigh === iA ? iB : iA;
      const matchLow  = all[idxLow];
      const avgLow    = matchLow.avgOverall;

      if (processedMatches.has(matchLow)) continue;

      // buscamos la nueva posición ideal
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
      // si encontramos sitio, mover
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
    all.forEach((m, idx) => {
      m.basePista = idx + 1;
    });
  
    // 9) Formatear UI
    function formatPlayer(p) {
      const icon = p.genero==='hombre'?'👦':'👧',
            hand = p.mano==='zurdo'   ?'🫲':'✋';
      return `${p.nombre} (${icon} ${p.nivel}, ${p.posicion}, ${hand})`;
    }
    const matches = all.map(m=>({
      pista:   m.basePista,
      teams:   [(m.A||[]).slice(0,2).map(formatPlayer), (m.B||[]).slice(0,2).map(formatPlayer)],
      totals:  m.totals   || [0,0],
      avgs:    (m.avgs   || [0,0]).map(x=>x.toFixed(1)),
      diffAvg: (m.diffAvg|| 0).toFixed(1),
      diffTot: m.diffTot || 0
    }));
    const debug = all.map(m=>({
      pista:      m.basePista,
      avgOverall: Number((m.avgOverall||0).toFixed(2)),
      diffAvg:    Number((m.diffAvg   ||0).toFixed(2))
    }));
  
    return { matches, debug };
  }
