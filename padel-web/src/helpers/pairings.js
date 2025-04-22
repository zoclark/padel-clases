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
 *  ▸ Ajusta adyacencias “no total” al final.
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
  
    // 3) Extraer forcedPairs (juega_con) del pool; los reservamos
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
  
    // 4) Rellenar cada pista hasta 4 con el pool (sin forcedPairs)
    function fillGroup(g) {
      const need = 4 - g.jugadores.length;
      if (need <= 0) return;
      pool.sort((a,b)=>b.nivel - a.nivel || Math.random() - 0.5);
      const cand = pool.slice(0, Math.min(12, pool.length));
      const combs = [];
      (function go(s, combo) {
        if (combo.length === need) { combs.push(combo.slice()); return; }
        for (let k = s; k < cand.length; k++) {
          combo.push(cand[k]);
          go(k+1, combo);
          combo.pop();
        }
      })(0, []);
      // filtrar no_total
      let valid = combs.filter(grp => {
        for (let x = 0; x < grp.length; x++) {
          for (let y = x+1; y < grp.length; y++) {
            const A = grp[x], B = grp[y];
            if (A.no_juega_con.includes(B.id) && A.no_juega_contra.includes(B.id)) return false;
            if (B.no_juega_con.includes(A.id) && B.no_juega_contra.includes(A.id)) return false;
          }
        }
        return true;
      });
      // mixto
      if (tipoPozo === "mixto") {
        const m = valid.filter(grp => {
          const h = grp.filter(p=>p.genero==="hombre").length;
          return h===2 && grp.length-h===2;
        });
        if (m.length) valid = m;
      }
      if (!valid.length) return;
      // puntuar
      const scored = valid.map(grp => {
        const lvls  = grp.map(p=>p.nivel);
        const sum   = lvls.reduce((a,b)=>a+b,0);
        const range = Math.max(...lvls) - Math.min(...lvls);
        return { grp, score: sum - 0.5*range };
      }).sort((a,b)=>b.score - a.score);
      const top   = scored[0].score;
      const picks = scored.filter(x=>Math.abs(x.score - top) < 1e-6).map(x=>x.grp);
      const pick  = picks[Math.floor(Math.random()*picks.length)];
      // asignar y quitar del pool
      const ids = new Set(pick.map(p=>p.id));
      g.jugadores.push(...pick);
      for (let k = pool.length - 1; k >= 0; k--) {
        if (ids.has(pool[k].id)) pool.splice(k,1);
      }
    }
    grupos.forEach(fillGroup);
  
    // 5) buildTrials (validar relaciones + métrica)
    function buildTrials(arr, requireMixed = true) {
      const perms = [[0,1,2,3],[0,2,1,3],[0,3,1,2]];
      const out = [];
      for (const [i1,i2,j1,j2] of perms) {
        const A = [arr[i1], arr[i2]], B = [arr[j1], arr[j2]];
        if (requireMixed && tipoPozo === "mixto") {
          if (
            !A.some(x=>x.genero==="hombre") ||
            !A.some(x=>x.genero==="mujer") ||
            !B.some(x=>x.genero==="hombre") ||
            !B.some(x=>x.genero==="mujer")
          ) continue;
        }
        let ok = true;
        for (const X of [...A, ...B]) {
          for (const Y of [...A, ...B]) {
            if (X.id === Y.id) continue;
            if (
              (X.juega_con.includes(Y.id) || Y.juega_con.includes(X.id)) &&
              !((A.includes(X)&&A.includes(Y))||(B.includes(X)&&B.includes(Y)))
            ) ok = false;
            if (
              (X.juega_contra.includes(Y.id) || Y.juega_contra.includes(X.id)) &&
              !((A.includes(X)&&B.includes(Y))||(A.includes(Y)&&B.includes(X)))
            ) ok = false;
            if (
              (X.no_juega_con.includes(Y.id) || Y.no_juega_con.includes(X.id)) &&
              ((A.includes(X)&&A.includes(Y))||(B.includes(X)&&B.includes(Y)))
            ) ok = false;
            if (
              (X.no_juega_contra.includes(Y.id) || Y.no_juega_contra.includes(X.id)) &&
              ((A.includes(X)&&B.includes(Y))||(A.includes(Y)&&B.includes(X)))
            ) ok = false;
            if (!ok) break;
          }
          if (!ok) break;
        }
        if (!ok) continue;
  
        const totA = A[0].nivel + A[1].nivel;
        const totB = B[0].nivel + B[1].nivel;
        const avgA = totA/2, avgB = totB/2;
        const diffAvg     = Math.abs(avgA - avgB);
        const partnerDiff = Math.abs(A[0].nivel - A[1].nivel) + Math.abs(B[0].nivel - B[1].nivel);
        let posMan = 0, zz = 0;
        for (const t of [A,B]) {
          if (t[0].posicion===t[1].posicion && t[0].posicion!=="Ambos") posMan++;
          if (t[0].mano==="zurdo" && t[1].mano==="zurdo") zz++;
        }
        const metric = diffAvg*2 + partnerDiff*PARTNER_DIFF_W + posMan*POSMAN_W + zz*ZURDO_ZURDO_W;
        out.push({ A, B, metric, diffAvg, totA, totB, avgA, avgB });
      }
      return out;
    }
  
    // 6) Generar todos los partidos de grupo
    const groupMatches = [];
    for (const g of grupos) {
      if (g.jugadores.length < 4) continue;
      let ts = buildTrials(g.jugadores, true);
      if (!ts.length && tipoPozo === "mixto") ts = buildTrials(g.jugadores, false);
      if (!ts.length) continue;
      ts.sort((a,b)=>a.metric - b.metric);
      const best = ts.filter(t=>t.metric <= ts[0].metric + epsilon);
      const pick = best[Math.floor(Math.random()*best.length)];
      groupMatches.push({
        A:           pick.A,
        B:           pick.B,
        basePista:   g.pista,
        fixed:       g.fijos,
        avgOverall:  (pick.avgA + pick.avgB)/2,
        diffAvg:     pick.diffAvg,
        diffTot:     Math.abs(pick.totA - pick.totB),
        totals:      [ pick.totA, pick.totB ],
        avgs:        [ pick.avgA, pick.avgB ],
        ids:         [ pick.A.map(p=>p.id), pick.B.map(p=>p.id) ],
      });
    }
  
    // 6.a) forcedPairs => partido propio
    const forcedMatches = forcedPairs.map(([A,B]) => {
      const avgAB = (A.nivel + B.nivel)/2;
      let best = null;
      for (const m of groupMatches) {
        const avgC = (m.A[0].nivel + m.A[1].nivel)/2;
        const diff  = Math.abs(avgAB - avgC);
        if (
          !best ||
          diff < best.diff ||
          (Math.abs(diff - best.diff)<1e-6 && m.diffAvg < best.match.diffAvg)
        ) {
          best = { match: m, diff };
        }
      }
      return {
        A:           [A,B],
        B:           best.match.A,
        basePista:   null,
        fixed:       false,
        avgOverall:  (avgAB + best.match.avgOverall)/2,
        diffAvg:     Math.abs(avgAB - best.match.avgOverall),
        diffTot:     null,
        totals:      [ A.nivel+B.nivel, best.match.totals[0] ],
        avgs:        [ avgAB,    best.match.avgs[0] ],
        ids:         [[A.id,B.id], best.match.ids[0]],
      };
    });
  
    // 7) Separar fijos y libres, asignar pistas a libres
    const fixedMatches = groupMatches.filter(m=>m.fixed);
    const freeMatches  = [ ...forcedMatches, ...groupMatches.filter(m=>!m.fixed) ];
    const usedPistas   = new Set(fixedMatches.map(m=>m.basePista));
    const freePistas   = grupos.map(g=>g.pista).filter(p=>!usedPistas.has(p));
  
    freeMatches.sort((a,b) => {
      if (b.avgOverall !== a.avgOverall) return b.avgOverall - a.avgOverall;
      return a.diffAvg - b.diffAvg;
    });
    freeMatches.forEach((m,i) => m.basePista = freePistas[i]);
  
    // 8) Juntar todos y ordenar por pista
    const all = [ ...fixedMatches, ...freeMatches ];
    all.sort((a,b)=>a.basePista - b.basePista);
  
    // Ajustar adyacencias “no total”
    const bad = [];
    for (const p of players) {
      for (const b of p.no_juega_con) {
        if (p.no_juega_contra.includes(b)) bad.push([p.id,b]);
      }
    }
    for (const [a,b] of bad) {
      const iA = all.findIndex(m=>m.ids[0].includes(a));
      const iB = all.findIndex(m=>m.ids[0].includes(b));
      if (iA >= 0 && iB >= 0 && Math.abs(all[iA].basePista - all[iB].basePista) > 1) {
        const tmp = all[iA].basePista;
        all[iA].basePista = all[iB].basePista;
        all[iB].basePista = tmp;
      }
    }
  
    // 9) Formatear para UI, garantizando siempre `teams` y `totals` etc.
    const matches = all.map(m => {
      const teamA = Array.isArray(m.A) ? m.A : [];
      const teamB = Array.isArray(m.B) ? m.B : [];
      return {
        pista:      m.basePista,
        teams:      [ teamA.map(formatPlayer), teamB.map(formatPlayer) ],
        totals:     Array.isArray(m.totals) ? m.totals : [0,0],
        avgs:       Array.isArray(m.avgs)   ? m.avgs.map(x=>x.toFixed(1)) : ["0.0","0.0"],
        diffAvg:    (m.diffAvg    ?? 0).toFixed(1),
        diffTot:    (m.diffTot    ?? 0),
      };
    });
  
    const debug = all.map(m => ({
      pista:      m.basePista,
      avgOverall: Number((m.avgOverall ?? 0).toFixed(2)),
      diffAvg:    Number((m.diffAvg    ?? 0).toFixed(2)),
    }));
  
    return { matches, debug };
  }
  
  // helper externo para formatear cada jugador
  function formatPlayer(p) {
    const icon = p.genero==="hombre" ? "👦" : "👧";
    const mano = p.mano==="zurdo"       ? "🫲" : "✋";
    return `${p.nombre} (${icon} ${p.nivel}, ${p.posicion}, ${mano})`;
  }
  