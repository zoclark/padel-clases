// src/helpers/tournament.js

/**
 * Genera los emparejamientos de una ronda.
 * @param {Array} participantes 
 * @param {number} numPistas 
 * @param {string} tipoPozo 
 * @returns {{ matches: Array, debugGrouping: Array }}
 */
export function generateRound(participantes, numPistas, tipoPozo) {
    const byPista = {};
    const unassigned = [];
    participantes.forEach((p) => {
      if (p.pista_fija) {
        byPista[p.pista_fija] = byPista[p.pista_fija] || [];
        byPista[p.pista_fija].push(p);
      } else {
        unassigned.push(p);
      }
    });
  
    const debugGrouping = [];
    const matches = [];
  
    for (let pista = 1; pista <= numPistas; pista++) {
      const group = byPista[pista] ? [...byPista[pista]] : [];
      debugGrouping.push({
        pista,
        beforeFill: [...group],
        added: []
      });
  
      // Rellenar hasta 4 con no asignados
      while (group.length < 4 && unassigned.length) {
        const u = unassigned.shift();
        group.push(u);
        debugGrouping[debugGrouping.length - 1].added.push(u);
      }
  
      debugGrouping[debugGrouping.length - 1].afterFill = [...group];
  
      if (group.length !== 4) continue;
  
      // Generar las 3 particiones posibles
      const idx = [0,1,2,3];
      const partitions = [
        [[0,1],[2,3]],
        [[0,2],[1,3]],
        [[0,3],[1,2]],
      ];
  
      let best = null;
      let bestMetric = Infinity;
  
      partitions.forEach(([[i1,i2],[j1,j2]]) => {
        const team1 = [group[i1], group[i2]];
        const team2 = [group[j1], group[j2]];
  
        // mixto: forzar hombre+mujer por pareja
        if (tipoPozo === "mixto") {
          if (
            !team1.some(x => x.genero==="hombre") ||
            !team1.some(x => x.genero==="mujer") ||
            !team2.some(x => x.genero==="hombre") ||
            !team2.some(x => x.genero==="mujer")
          ) return;
        }
  
        const avg = arr => arr.reduce((sum,x)=>sum+x.nivel,0)/arr.length;
        const diff = Math.abs(avg(team1) - avg(team2));
  
        // penalizar pareja mismo posicion (no Ambos) y zurdo-zurdo
        let penalty = 0;
        [team1,team2].forEach(t => {
          if (t[0].posicion === t[1].posicion && t[0].posicion !== "Ambos") penalty++;
          if (t[0].mano_dominante === "zurdo" && t[1].mano_dominante === "zurdo") penalty++;
        });
  
        const metric = diff + penalty*0.1;
        if (metric < bestMetric) {
          bestMetric = metric;
          best = { teams: [team1, team2], nivelDiff: diff.toFixed(1) };
        }
      });
  
      if (best) {
        matches.push({ pista, ...best });
      }
    }
  
    return { matches, debugGrouping };
  }
  
  /**
   * Simula resultados aleatorios de una ronda.
   * @param {Array} matches 
   * @returns {Array} results [{ matchIndex, pista, winners, losers }]
   */
  export function simulateResults(matches) {
    return matches.map((m, idx) => {
      const pick = Math.random() < 0.5 ? 0 : 1;
      return {
        matchIndex: idx,
        pista: m.pista,
        winners: m.teams[pick],
        losers : m.teams[1-pick]
      };
    });
  }
  
  /**
   * Actualiza pista_fija según ganadores/subcampeones y
   * genera debug de las nuevas parejas mixtas H(ganador)-M(perdedora) vs H(perdedor)-M(ganadora).
   * @param {Array} participantes 
   * @param {Array} results 
   * @param {number} numPistas 
   * @returns {{ newParticipants: Array, debugRecomb: Array }}
   */
  export function recombineAndMove(participantes, results, numPistas) {
    // clonamos para no mutar original
    const newParticipants = participantes.map(p => ({ ...p }));
    const debugRecomb = [];
  
    results.forEach(r => {
      const { pista, winners, losers } = r;
  
      // referenciar clones
      const w = winners.map(p => newParticipants.find(x => x.id === p.id));
      const l = losers .map(p => newParticipants.find(x => x.id === p.id));
  
      // mover pistas
      w.forEach(p => p.pista_fija = Math.max(1, pista - 1));
      l.forEach(p => p.pista_fija = Math.min(numPistas, pista + 1));
  
      // recombinar parejas H(winner)-M(loser) vs H(loser)-M(winner)
      const manW = w.find(x => x.genero==="hombre");
      const womanW = w.find(x => x.genero==="mujer");
      const manL = l.find(x => x.genero==="hombre");
      const womanL = l.find(x => x.genero==="mujer");
  
      const teamA = [manW, womanL];
      const teamB = [manL, womanW];
  
      debugRecomb.push({ pista, winners: [...w], losers: [...l], teamA, teamB });
    });
  
    return { newParticipants, debugRecomb };
  }
  