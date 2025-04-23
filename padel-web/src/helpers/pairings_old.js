export function generatePairings(jugadores, numPistas, tipoPozo = "mixto", epsilon = 0.01) {
    const PARTNER_DIFF_W = 0.5;
    const POSMAN_W = 0.15;
    const ZURDO_ZURDO_W = 0.5;

    // --- Helper Function ---
    function calculateMatchStats(teamA, teamB) {
        const teamAOk = Array.isArray(teamA) && teamA.length > 0;
        const teamBOk = Array.isArray(teamB) && teamB.length > 0;
        const playersList = [...(teamAOk ? teamA : []), ...(teamBOk ? teamB : [])];
        const numPlayers = playersList.length;

        if (numPlayers === 0) return { avgOverall: 0, diffAvg: 0, diffTot: 0, totals: [0, 0], avgs: [0.0, 0.0], incompleto: true };

        const totA = teamAOk ? teamA.reduce((s, p) => s + (p?.nivel ?? 0), 0) : 0;
        const totB = teamBOk ? teamB.reduce((s, p) => s + (p?.nivel ?? 0), 0) : 0;
        const avgA = teamAOk ? totA / teamA.length : 0;
        const avgB = teamBOk ? totB / teamB.length : 0;
        const avgOverall = numPlayers > 0 ? playersList.reduce((s, p) => s + (p?.nivel ?? 0), 0) / numPlayers : 0;
        const diffAvg = (teamAOk && teamA.length==2 && teamBOk && teamB.length==2) ? Math.abs(avgA - avgB) : 0;
        const diffTot = (teamAOk && teamA.length==2 && teamBOk && teamB.length==2) ? Math.abs(totA - totB) : 0;
        const incompleto = !teamAOk || teamA.length < 2 || !teamBOk || teamB.length < 2;

        return { avgOverall, diffAvg, diffTot, totals: [totA, totB], avgs: [avgA, avgB], incompleto };
    }

    // 1) Coerción y defaults
    const players = jugadores.map(p => ({
        ...p,
        genero: p.genero ?? "hombre",
        nivel: Number(p.nivel) || 0,
        pista_fija: Number(p.pista_fija) || 0,
        mano: p.mano_dominante || "diestro",
        posicion: p.posicion || "Ambos",
        juega_con: p.juega_con || [],
        juega_contra: p.juega_contra || [],
        no_juega_con: p.no_juega_con || [],
        no_juega_contra: p.no_juega_contra || [],
    }));

    const idToPlayer = new Map(players.map(p => [p.id, p]));
    // --- INICIO: Forzar Bidireccionalidad de Restricciones ---
    players.forEach(p1 => {
        const p1Id = p1.id;

        // Función auxiliar para sincronizar una restricción
        const syncConstraint = (p1ConstraintList, p2ConstraintName) => {
            // Usar el array asegurado en el paso anterior
            p1ConstraintList.forEach(p2Id => {
                const p2 = idToPlayer.get(p2Id);
                // Asegurar que p2 existe y que su array de restricción existe
                if (p2) {
                    // Asegurar que el campo existe como array en p2
                    if (!Array.isArray(p2[p2ConstraintName])) {
                         p2[p2ConstraintName] = [];
                    }
                    // Añadir solo si no está ya incluido
                    if (!p2[p2ConstraintName].includes(p1Id)) {
                        p2[p2ConstraintName].push(p1Id);
                    }
                }
            });
        };

        // Sincronizar todas las restricciones
        syncConstraint(p1.juega_con, 'juega_con');
        syncConstraint(p1.juega_contra, 'juega_contra');
        syncConstraint(p1.no_juega_con, 'no_juega_con');
        syncConstraint(p1.no_juega_contra, 'no_juega_contra');
    });
    // --- FIN: Forzar Bidireccionalidad de Restricciones ---


    players.forEach(p => {
        if (p.juega_con?.length === 1) {
            const pareja = idToPlayer.get(p.juega_con[0]);
            if (pareja) {
                if (p.pista_fija && !pareja.pista_fija) pareja.pista_fija = p.pista_fija;
                if (!p.pista_fija && pareja.pista_fija) p.pista_fija = pareja.pista_fija;
                if (p.pista_fija && pareja.pista_fija && p.pista_fija !== pareja.pista_fija) {
                    p.pista_fija = pareja.pista_fija = Math.min(p.pista_fija, pareja.pista_fija);
                }
            }
        }
    });

     // --- INICIO: Validaciones Post-Sincronización Adicionales ---
     for (const p of players) {
        // Validar conflictos lógicos creados por la sincronización
        if (p.juega_con.some(id => p.no_juega_con.includes(id))) {
           const conflictId = p.juega_con.find(id => p.no_juega_con.includes(id));
           throw new Error(`${p.nombre||p.id} conflicto: juega_con y no_juega_con ${idToPlayer.get(conflictId)?.nombre || conflictId}`);
        }
        if (p.juega_contra.some(id => p.no_juega_contra.includes(id))) {
           const conflictId = p.juega_contra.find(id => p.no_juega_contra.includes(id));
           throw new Error(`${p.nombre||p.id} conflicto: juega_contra y no_juega_contra ${idToPlayer.get(conflictId)?.nombre || conflictId}`);
        }
   }
   // --- FIN: Validaciones Post-Sincronización Adicionales ---

    for (const p of players) {
        if (p.juega_con?.length > 1) throw new Error(`Jugador ${p.nombre} tiene >1 'juega_con'.`);
        if (p.juega_contra?.length > 2) throw new Error(`Jugador ${p.nombre} tiene >2 'juega_contra'.`);
    }

    // 2) Separar fijos y pool libre
    const grupos = Array.from({ length: numPistas }, (_, i) => ({ pista: i + 1, jugadores: [], fijos: false }));
    const pool = [];
    for (const p of players) {
        const g = (p.pista_fija >= 1 && p.pista_fija <= numPistas) ? grupos[p.pista_fija - 1] : null;
        if (g) {
            g.jugadores.push(p);
            g.fijos = true;
        } else {
            if (p.pista_fija) console.warn(`Pista fija inválida ${p.pista_fija} para ${p.nombre}.`);
            pool.push(p);
        }
    }

    const hombres = players.filter(p => p.genero === "hombre").length;
    const mujeres = players.filter(p => p.genero === "mujer").length;
    const esMixtoPerfecto = tipoPozo === "mixto" && hombres === mujeres && (hombres + mujeres) === players.length;

    // 3) Extraer forcedPairs y forcedRivals
    const forcedMatches = [];
    const forcedRivalMatches = [];
    const processedForced = new Set(); // Para evitar procesar dos veces por A->B y B->A

    // --- Forced Pairs (juega_con) ---
    for (let i = pool.length - 1; i >= 0; i--) {
        const p1 = pool[i];
        if (!p1 || processedForced.has(p1.id) || !(p1.juega_con?.length === 1)) continue;

        const pairId = p1.juega_con[0];
        const idxP2 = pool.findIndex(p => p.id === pairId);
        if (idxP2 === -1) {
             console.warn(`Pareja ${pairId} de ${p1.nombre} no en pool.`);
             // Considerar sacar a p1 del pool aquí si se quiere ser estricto
             continue;
         }
        const p2 = pool[idxP2];

        // Marcar ambos como procesados
        processedForced.add(p1.id);
        processedForced.add(p2.id);

        // Quitar p1 y p2 del pool (manejar índices con cuidado)
        pool.splice(i, 1);
        const realIdxP2 = pool.findIndex(p => p.id === pairId); // Rebuscar índice por si cambió
        if(realIdxP2 !== -1) pool.splice(realIdxP2, 1);

        // Buscar rivales (similar a antes, pero más compacto)
        let rivales = [];
        const rivalesForzadosIds = new Set([...(p1.juega_contra || []), ...(p2.juega_contra || [])]);
        const rivalesPoolIndices = []; // Guardar índices para quitar luego
        for(let j=0; j<pool.length; ++j) {
            if(rivalesForzadosIds.has(pool[j].id)) {
                rivales.push(pool[j]);
                rivalesPoolIndices.push(j);
            }
        }
        // Quitar rivales forzados del pool (orden inverso de índices)
        rivalesPoolIndices.sort((a,b)=>b-a).forEach(idx => pool.splice(idx, 1));

        // Completar hasta 2 rivales si es necesario
        while (rivales.length < 2 && pool.length > 0) {
            // ... (lógica interna de buscar mejor rival/pareja rival - mantenerla detallada por claridad) ...
            // Esta parte es difícil de acortar sin perder la lógica de filtros y selección del mejor
            let candidates = pool.filter(cand => !(p1.no_juega_contra || []).includes(cand.id) && !(p2.no_juega_contra || []).includes(cand.id) && !rivales.some(r => r.id === cand.id));
            if (esMixtoPerfecto && p1.genero !== p2.genero) {
                if(rivales.length === 1) candidates = candidates.filter(p => p.genero !== rivales[0].genero);
                // else if (rivales.length === 0) { /* Podría filtrar para H y M si hay */ }
            }
            if (rivales.length === 1) {
                candidates = candidates.filter(c => !(c.mano === "zurdo" && rivales[0].mano === "zurdo") && (rivales[0].posicion === "Ambos" || c.posicion === "Ambos" || c.posicion !== rivales[0].posicion) );
            }

            let bestDiff = Infinity, picks = [];
            if (rivales.length === 1) {
                const r0 = rivales[0];
                candidates.forEach(cand => {
                     if (!((r0.no_juega_con || []).includes(cand.id) || (cand.no_juega_con || []).includes(r0.id)) && !(r0.mano === 'zurdo' && cand.mano === 'zurdo') && (r0.posicion === 'Ambos' || cand.posicion === 'Ambos' || r0.posicion !== cand.posicion) ) {
                         const diff = Math.abs((p1.nivel + p2.nivel) - (r0.nivel + cand.nivel));
                         if (diff < bestDiff) { bestDiff = diff; picks = [cand]; } else if (diff === bestDiff) { picks.push(cand); }
                     }
                });
            } else {
                 combinations(candidates, 2).forEach(combo => {
                     const [r1, r2] = combo;
                     if (!((r1.no_juega_con || []).includes(r2.id) || (r2.no_juega_con || []).includes(r1.id)) && !(r1.mano === 'zurdo' && r2.mano === 'zurdo') && (r1.posicion === 'Ambos' || r2.posicion === 'Ambos' || r1.posicion !== r2.posicion) && !(esMixtoPerfecto && p1.genero !== p2.genero && r1.genero === r2.genero) ) {
                         const diff = Math.abs((p1.nivel + p2.nivel) - (r1.nivel + r2.nivel));
                         if (diff < bestDiff) { bestDiff = diff; picks = [combo]; } else if (diff === bestDiff) { picks.push(combo); }
                     }
                 });
            }
            let seleccion = picks.length ? picks[Math.floor(Math.random() * picks.length)] : null;
            if (seleccion) {
                 const itemsToAdd = Array.isArray(seleccion) ? seleccion : [seleccion];
                 rivales.push(...itemsToAdd);
                 itemsToAdd.forEach(item => {
                     const idx = pool.findIndex(p => p.id === item.id);
                     if (idx !== -1) pool.splice(idx, 1);
                 });
             } else break;
        } // end while completar rivales

        const stats = calculateMatchStats([p1, p2], rivales);
        forcedMatches.push({ A: [p1, p2], B: rivales, basePista: null, fixed: false, ...stats, ids: [[p1.id, p2.id], rivales.map(p => p.id)] });
    } // end for forced pairs

     // --- Forced Rivals (juega_contra SIN juega_con) ---
     // (Manteniendo lógica similar por ahora, es compleja de acortar drásticamente)
     for (let i = pool.length - 1; i >= 0; i--) {
         const A = pool[i];
         if (!A || processedForced.has(A.id) || !(A.juega_contra?.length > 0) || (A.juega_con?.length > 0)) continue;

         let B = null, j = -1;
         for(const rivalId of A.juega_contra) {
             const rivalIdx = pool.findIndex(x => x.id === rivalId && !(x.juega_con?.length > 0));
             if (rivalIdx !== -1) { j = rivalIdx; B = pool[j]; break; }
         }
         if (!B) continue;

         processedForced.add(A.id);
         processedForced.add(B.id);
         pool.splice(i, 1);
         const realIdxB = pool.findIndex(p => p.id === B.id); // Rebuscar índice
         if (realIdxB !== -1) pool.splice(realIdxB, 1);

         let compA = null, compB = null;
         // Buscar compA
         if (pool.length) {
             let candidatesA = pool.filter(cand => !(A.no_juega_con || []).includes(cand.id) && !(cand.no_juega_con || []).includes(A.id) && !(cand.juega_con?.length > 0) && !(cand.juega_contra || []).some(id => id === A.id || id === B.id) );
             if (esMixtoPerfecto) candidatesA = candidatesA.filter(p => p.genero !== A.genero);
             candidatesA = candidatesA.filter(c => !(c.mano === "zurdo" && A.mano === "zurdo") && (A.posicion === "Ambos" || c.posicion === "Ambos" || c.posicion !== A.posicion));
             let bestDiffA = Infinity, picksA = [];
             candidatesA.forEach(cand => { const diff = Math.abs((A.nivel + cand.nivel) - B.nivel); if (diff < bestDiffA) { bestDiffA = diff; picksA = [cand]; } else if (diff === bestDiffA) { picksA.push(cand); } });
             compA = picksA.length ? picksA[Math.floor(Math.random() * picksA.length)] : null;
             if (compA) { const idxA = pool.findIndex(p => p.id === compA.id); if (idxA !== -1) pool.splice(idxA, 1); }
         }
         // Buscar compB
         if (pool.length && compA) { // Solo si hay compA
             let candidatesB = pool.filter(cand => !(B.no_juega_con || []).includes(cand.id) && !(cand.no_juega_con || []).includes(B.id) && !(cand.juega_con?.length > 0) && !(cand.juega_contra || []).some(id => id === A.id || id === B.id || id === compA.id ) );
             if (esMixtoPerfecto) candidatesB = candidatesB.filter(p => p.genero !== B.genero);
             candidatesB = candidatesB.filter(c => !(c.mano === "zurdo" && B.mano === "zurdo") && (B.posicion === "Ambos" || c.posicion === "Ambos" || c.posicion !== B.posicion));
             let bestDiffB = Infinity, picksB = [];
             const nivelTeamA = A.nivel + compA.nivel;
             candidatesB.forEach(cand => { if(!((compA.no_juega_contra || []).includes(cand.id) || (cand.no_juega_contra || []).includes(compA.id))) { const diff = Math.abs((B.nivel + cand.nivel) - nivelTeamA); if (diff < bestDiffB) { bestDiffB = diff; picksB = [cand]; } else if (diff === bestDiffB) { picksB.push(cand); } } });
             compB = picksB.length ? picksB[Math.floor(Math.random() * picksB.length)] : null;
             if (compB) { const idxB = pool.findIndex(p => p.id === compB.id); if (idxB !== -1) pool.splice(idxB, 1); }
         }

         const teamA = [A, compA].filter(Boolean);
         const teamB = [B, compB].filter(Boolean);
         const stats = calculateMatchStats(teamA, teamB);
         forcedRivalMatches.push({ A: teamA, B: teamB, basePista: null, fixed: false, ...stats, ids: [teamA.map(p => p.id), teamB.map(p => p.id)] });
     } // end for forced rivals


    // combinaciones n choose k
    function combinations(arr, k) {
        const res = [];
        (function go(start, combo) {
            if (combo.length === k) { res.push(combo.slice()); return; }
            for (let i = start; i < arr.length; i++) {
                combo.push(arr[i]); go(i + 1, combo); combo.pop();
            }
        })(0, []);
        return res;
    }

    // 4) Rellenar grupos fijos
    function fillGroup(g) {
        const need = 4 - g.jugadores.length;
        if (need <= 0) return;
        pool.sort((a, b) => b.nivel - a.nivel || Math.random() - 0.5);
        const candidates = pool.slice(0, Math.min(12, pool.length));
        if (candidates.length < need) return;

        let validCombinations = combinations(candidates, need).filter(grp => {
            for (let x = 0; x < grp.length; x++) {
                 for (let y = x + 1; y < grp.length; y++) {
                     const pX = grp[x], pY = grp[y];
                     if (((pX.no_juega_con || []).includes(pY.id) && (pX.no_juega_contra || []).includes(pY.id)) || ((pY.no_juega_con || []).includes(pX.id) && (pY.no_juega_contra || []).includes(pX.id))) return false;
                     for(const pExist of g.jugadores) {
                         if (((pX.no_juega_con || []).includes(pExist.id) && (pX.no_juega_contra || []).includes(pExist.id)) || ((pExist.no_juega_con || []).includes(pX.id) && (pExist.no_juega_contra || []).includes(pX.id))) return false;
                     }
                 }
             }
             return true;
        });

        if (esMixtoPerfecto) {
            const hNow = g.jugadores.filter(p => p.genero === "hombre").length;
            const mNow = g.jugadores.filter(p => p.genero === "mujer").length;
            const hNeed = 2 - hNow;
            const mNeed = 2 - mNow;
            const mixed = validCombinations.filter(grp => grp.filter(p => p.genero === "hombre").length === hNeed && grp.filter(p => p.genero === "mujer").length === mNeed);
            if (mixed.length > 0) validCombinations = mixed;
            else console.warn(`No se pudo rellenar grupo ${g.pista} manteniendo 2H/2M.`);
        }

        if (validCombinations.length === 0) return;

        const scored = validCombinations.map(grp => {
            const lvls = [...g.jugadores, ...grp].map(p => p.nivel);
            const sum = lvls.reduce((a, b) => a + b, 0);
            const range = lvls.length > 1 ? Math.max(...lvls) - Math.min(...lvls) : 0;
            return { grp, score: sum - 0.5 * range };
        }).sort((a, b) => b.score - a.score);

        const bestPicks = scored.filter(x => Math.abs(x.score - scored[0].score) < 1e-6).map(x => x.grp);
        const pick = bestPicks[Math.floor(Math.random() * bestPicks.length)];

        g.jugadores.push(...pick);
        const idsToRemove = new Set(pick.map(p => p.id));
        for (let i = pool.length - 1; i >= 0; i--) {
            if (idsToRemove.has(pool[i].id)) pool.splice(i, 1);
        }
    }
    grupos.forEach(fillGroup);

    // 5) buildTrials
    function buildTrials(arr, requireMixed = true) {
        if (!arr || arr.length !== 4 || arr.some(p=>!p)) {
             console.error("buildTrials recibió array inválido:", arr?.map(p=>p?.nombre||'inválido')); // Log nombres
             return [];
         }
        // --- DEBUG: Log entrada ---
        console.log(`DEBUG buildTrials: Input [${arr.map(p=>p.nombre).join(', ')}], requireMixed=${requireMixed}, esMixtoPerfecto=${esMixtoPerfecto}`);

        const perms=[[0,1,2,3],[0,2,1,3],[0,3,1,2]]; const out=[];
        for(const [i1,i2,j1,j2] of perms){
            const A=[arr[i1], arr[i2]], B=[arr[j1], arr[j2]];
            let skip=false;
            let skipReason = ""; // --- DEBUG: Razón del skip ---

            // --- Filtros iniciales (género) ---
            if(requireMixed && esMixtoPerfecto && !((A[0].genero!==A[1].genero)&&(B[0].genero!==B[1].genero))) { skip=true; skipReason="Género Mixto Perfecto"; }
            if(!skip && requireMixed && tipoPozo==="mixto" && !esMixtoPerfecto && (!A.some(p=>p.genero==='hombre')||!A.some(p=>p.genero==='mujer')||!B.some(p=>p.genero==='hombre')||!B.some(p=>p.genero==='mujer'))) { skip=true; skipReason="Género Mixto General"; }

            // --- Filtros de Restricciones ---
            if(!skip){
                for(const X of [...A,...B]){
                    if(skip) break;
                    for(const Y of [...A,...B]){
                        if(X.id===Y.id) continue;
                        if(((X.juega_con||[]).includes(Y.id)||(Y.juega_con||[]).includes(X.id))&&!((A.includes(X)&&A.includes(Y))||(B.includes(X)&&B.includes(Y)))){ skip=true; skipReason=`${X.nombre} juega_con ${Y.nombre} mal asignado`; break; }
                        if(((X.juega_contra||[]).includes(Y.id)||(Y.juega_contra||[]).includes(X.id))&&!((A.includes(X)&&B.includes(Y))||(A.includes(Y)&&B.includes(X)))){ skip=true; skipReason=`${X.nombre} juega_contra ${Y.nombre} mal asignado`; break; }
                        if((X.no_juega_con||[]).includes(Y.id)&&((A.includes(X)&&A.includes(Y))||(B.includes(X)&&B.includes(Y)))){ skip=true; skipReason=`${X.nombre} no_juega_con ${Y.nombre}`; break; }
                        if((X.no_juega_contra||[]).includes(Y.id)&&((A.includes(X)&&B.includes(Y))||(B.includes(X)&&A.includes(Y)))){ skip=true; skipReason=`${X.nombre} no_juega_contra ${Y.nombre}`; break; }
                    }
                }
            }

            // --- DEBUG: Log Permutación ---
            console.log(`  -> Perm: A=[${A.map(p=>p.nombre).join(',')}] B=[${B.map(p=>p.nombre).join(',')}]. Skip=${skip}${skip ? ` (Razón: ${skipReason})` : ''}`);

            if(skip) continue; // Saltar al siguiente perm si hay skip

            // Si llega aquí, es una combinación válida, calcular métrica y añadir
            const stats=calculateMatchStats(A, B); const partnerDiff=Math.abs(A[0].nivel-A[1].nivel)+Math.abs(B[0].nivel-B[1].nivel); let posMan=0, zz=0; [A,B].forEach(t=>{if(t[0].posicion!=='Ambos'&&t[0].posicion===t[1].posicion)posMan++; if(t[0].mano==='zurdo'&&t[1].mano==='zurdo')zz++;}); const metric=stats.diffAvg*2+partnerDiff*PARTNER_DIFF_W+posMan*POSMAN_W+zz*ZURDO_ZURDO_W; out.push({A,B,metric,...stats});
        }
        // --- DEBUG: Log salida ---
        console.log(`DEBUG buildTrials: Output trials count = ${out.length}`);
        return out;
    }


    // ===========================================================
    // ===== SECCIÓN 6 MODIFICADA Y LIGERAMENTE COMPACTADA =======
    // ===========================================================
    const groupMatches = [];
    for (const g of grupos) {
        if (g.jugadores.length < 4 || g.jugadores.some(p => !p)) continue; // Skip incomplete/invalid groups

        let trials = [];
        let selectionMade = false;

        if (esMixtoPerfecto) {
            const mixedTrials = buildTrials(g.jugadores, true);
            if (mixedTrials.length > 0) {
                trials = mixedTrials; // Prioritize these
                selectionMade = true;
            }
        }

        if (!selectionMade) {
            trials = buildTrials(g.jugadores, true); // Try requireMixed=true first
            if (trials.length === 0 && tipoPozo === "mixto") {
                trials = buildTrials(g.jugadores, false); // Fallback 1
            }
            if (trials.length === 0) {
                 trials = buildTrials(g.jugadores, false); // Fallback 2 (also for non-mixto)
            }
        }

        if (trials.length > 0) {
            trials.sort((a, b) => a.metric - b.metric);
            const bestMetric = trials[0].metric;
            const bestTrials = trials.filter(t => t.metric <= bestMetric + epsilon);
            const pick = bestTrials[Math.floor(Math.random() * bestTrials.length)];
            // Create match object using stats from 'pick'
            groupMatches.push({
                A: pick.A, B: pick.B, basePista: g.pista, fixed: g.fijos,
                avgOverall: pick.avgOverall, diffAvg: pick.diffAvg, diffTot: pick.diffTot,
                totals: pick.totals, avgs: pick.avgs, incompleto: pick.incompleto,
                ids: [pick.A.map(p => p.id), pick.B.map(p => p.id)]
            });
        } else {
             console.warn(`No pairings found for group ${g.pista}`);
        }
    }
    // ===========================================================
    // ===== FIN SECCIÓN 6 MODIFICADA ============================
    // ===========================================================

    // DRAFT GLOBAL
    function draftGlobalPairings(groupMatches, tipoPozo = "mixto") {
        const libres = groupMatches.filter(m => !m.fixed && !m.incompleto); // Only draft complete, non-fixed matches
        let allPairs = [];

        if (esMixtoPerfecto) {
            let playersInFree = libres.flatMap(m => [...(m.A || []), ...(m.B || [])]);
            let hombres = playersInFree.filter(p => p.genero === "hombre").sort(() => Math.random() - 0.5);
            let mujeres = playersInFree.filter(p => p.genero === "mujer").sort(() => Math.random() - 0.5);
            const minLen = Math.min(hombres.length, mujeres.length);
            for (let i = 0; i < minLen; i++) {
                const h = hombres[i], m = mujeres[i];
                 // Check constraints simplified
                 if (!((h.no_juega_con||[]).includes(m.id) || (m.no_juega_con||[]).includes(h.id) || (h.mano=='zurdo'&&m.mano=='zurdo') || (h.posicion!='Ambos'&&h.posicion==m.posicion))) {
                     allPairs.push({ pair: [h, m], nivel: h.nivel + m.nivel, avg: (h.nivel + m.nivel) / 2 });
                 }
            }
        } else {
            libres.forEach(m => {
                if (m.A?.length === 2) allPairs.push({ pair: m.A, nivel: m.totals[0], avg: m.avgs[0] });
                if (m.B?.length === 2) allPairs.push({ pair: m.B, nivel: m.totals[1], avg: m.avgs[1] });
            });
        }

        let drafted = [], usedIdx = new Set();
        allPairs.sort((a, b) => b.nivel - a.nivel);

        while (true) {
            const i = allPairs.findIndex((_, idx) => !usedIdx.has(idx));
            if (i === -1 || allPairs.length - usedIdx.size < 2) break;
            const base = allPairs[i];
            usedIdx.add(i);
            let bestRivalIdx = -1, bestDiff = Infinity;

            for (let j = 0; j < allPairs.length; ++j) {
                if (i === j || usedIdx.has(j)) continue;
                const rival = allPairs[j];
                // Check contra constraints between pairs
                 const [pA1, pA2] = base.pair; const [pB1, pB2] = rival.pair;
                 if (!((pA1.no_juega_contra||[]).includes(pB1.id) || (pA1.no_juega_contra||[]).includes(pB2.id) || (pA2.no_juega_contra||[]).includes(pB1.id) || (pA2.no_juega_contra||[]).includes(pB2.id) || (pB1.no_juega_contra||[]).includes(pA1.id) || (pB1.no_juega_contra||[]).includes(pA2.id) || (pB2.no_juega_contra||[]).includes(pA1.id) || (pB2.no_juega_contra||[]).includes(pA2.id))) {
                     const diff = Math.abs(base.nivel - rival.nivel);
                     if (diff < bestDiff) { bestDiff = diff; bestRivalIdx = j; }
                 }
            }

            if (bestRivalIdx !== -1) {
                const rival = allPairs[bestRivalIdx];
                const stats = calculateMatchStats(base.pair, rival.pair); // Calculate final stats
                drafted.push({
                    A: base.pair, B: rival.pair, basePista: null, fixed: false, ...stats,
                    ids: [base.pair.map(p => p.id), rival.pair.map(p => p.id)]
                });
                usedIdx.add(bestRivalIdx);
            }
        }
        return drafted;
    }

    // 7) Unir partidos
    const fixedMatches = groupMatches.filter(m => m.fixed);
    const draftedMatches = draftGlobalPairings(groupMatches, tipoPozo);
    const forcedComplete = [...forcedMatches.filter(m => !m.incompleto), ...forcedRivalMatches.filter(m => !m.incompleto)];
    const incompleteForced = [...forcedMatches.filter(m => m.incompleto), ...forcedRivalMatches.filter(m => m.incompleto)];

    const freeComplete = [...forcedComplete, ...draftedMatches];
    freeComplete.sort((a, b) => (b.avgOverall - a.avgOverall) || (a.diffAvg - b.diffAvg));

    const occupiedPistas = new Set(fixedMatches.map(m => m.basePista));
    const freePistas = Array.from({ length: numPistas }, (_, i) => i + 1).filter(p => !occupiedPistas.has(p));
    freeComplete.forEach((m, idx) => { m.basePista = freePistas[idx] ?? null; });

    let allCompleteMatches = [...fixedMatches, ...freeComplete];

    // 8) Ajuste Adyacencias (simplificado - opcional)
     // ... (Manteniendo la lógica original por ahora, pero podría eliminarse para acortar) ...
     const bad = []; players.forEach(p => { (p.no_juega_con||[]).forEach(bId => { if ((p.no_juega_contra||[]).includes(bId)) bad.push([p.id, bId]); }); });
     const deltas = [1, -1, 3, -3]; const processedPlayersAdj = new Set(); const processedMatchesAdj = new Set();
     allCompleteMatches.sort((a, b) => (a.basePista || Infinity) - (b.basePista || Infinity));
     for (const [aId, bId] of bad) { if (processedPlayersAdj.has(aId) || processedPlayersAdj.has(bId)) continue; const iA = allCompleteMatches.findIndex(m => m.basePista && m.ids.flat().includes(aId)); const iB = allCompleteMatches.findIndex(m => m.basePista && m.ids.flat().includes(bId)); if (iA < 0 || iB < 0 || iA === iB || Math.abs(allCompleteMatches[iA].basePista - allCompleteMatches[iB].basePista) > 1) continue; const idxToMove = allCompleteMatches[iA].avgOverall < allCompleteMatches[iB].avgOverall ? iA : iB; const matchToMove = allCompleteMatches[idxToMove]; if (processedMatchesAdj.has(matchToMove)) continue; let bestTargetIdx = -1, bestCost = Infinity; for (let tIdx = 0; tIdx < allCompleteMatches.length; tIdx++) { if (tIdx === iA || tIdx === iB) continue; const targetMatch = allCompleteMatches[tIdx]; if (!targetMatch?.basePista || Math.abs(targetMatch.basePista - allCompleteMatches[iA===idxToMove?iB:iA].basePista) <= 1) continue; const cost = Math.abs(idxToMove - tIdx); if (cost < bestCost) { bestCost = cost; bestTargetIdx = tIdx; } } if (bestTargetIdx !== -1) { const [moved] = allCompleteMatches.splice(idxToMove, 1); allCompleteMatches.splice(bestTargetIdx, 0, moved); processedMatchesAdj.add(moved); } processedPlayersAdj.add(aId); processedPlayersAdj.add(bId); }
     allCompleteMatches.sort((a, b) => (a.basePista || Infinity) - (b.basePista || Infinity)); // Re-sort by final pista

        // ===========================================================
    // ===== INICIO: REESCRITURA FASE 8b (Opción C - SUPER Optimizada) =
    // ===========================================================

    // 8b) Finalizar partidos incompletos y asignar restantes (Lógica SUPER Optimizada)
    const assignedIds = new Set(allCompleteMatches.flatMap(m => m.ids || []).flat());
    incompleteForced.forEach(m => { (m.ids || []).flat().forEach(id => assignedIds.add(id)); });
    let unassignedPlayers = players.filter(p => !assignedIds.has(p.id)); // Lista inicial de no asignados
    let finalIncomplete = [...incompleteForced];
    let newlyCreatedMatches = [];
    let trulyUnassigned = []; // Para los que definitivamente no se pueden emparejar

    // --- 8b Parte 1: Completar Incompletos (Prioritario) ---
    finalIncomplete.forEach(match => {
        while (match.incompleto && unassignedPlayers.length > 0) {
            unassignedPlayers.sort((a,b) => b.nivel - a.nivel); // Coger el de más nivel compatible
            const currentPlayers=[...(match.A||[]),...(match.B||[])];
            if(currentPlayers.length>=4){ match.incompleto=false; break; }
            let bestPlayerToAdd=null, bestPlayerIdx=-1;
            for(let i=0; i<unassignedPlayers.length; ++i){ const cand=unassignedPlayers[i]; const canAdd=!currentPlayers.some(pE=>(cand.no_juega_con.includes(pE.id)||pE.no_juega_con.includes(cand.id)||cand.no_juega_contra.includes(pE.id)||pE.no_juega_contra.includes(cand.id))); if(canAdd){bestPlayerToAdd=cand; bestPlayerIdx=i; break;} }
            if(bestPlayerToAdd){ if(!match.B||match.B.length<2){match.B=[...(match.B||[]),bestPlayerToAdd];} else {match.A=[...(match.A||[]),bestPlayerToAdd];} unassignedPlayers.splice(bestPlayerIdx,1); if((match.A?.length??0)+(match.B?.length??0)===4){ match.incompleto=false; Object.assign(match, calculateMatchStats(match.A, match.B)); }} else break;
        }
    });
    // Añadir los partidos (ahora posiblemente completos) a la lista principal
    allCompleteMatches.push(...finalIncomplete.filter(m => !m.incompleto));
    // Los que quedaron incompletos, sus jugadores van a trulyUnassigned
    finalIncomplete.filter(m => m.incompleto).forEach(m => trulyUnassigned.push(...(m.A || []), ...(m.B || [])));

    // --- 8b Parte 2: Optimización Global H-M para Sobrantes (SI aplica) ---
    if (esMixtoPerfecto && unassignedPlayers.length >= 4) {
        console.log(`Optimizando sobrantes (${unassignedPlayers.length}) para H-M vs H-M...`);
        let hombresSobrantes = unassignedPlayers.filter(p => p.genero === 'hombre');
        let mujeresSobrantes = unassignedPlayers.filter(p => p.genero === 'mujer');
        unassignedPlayers = []; // Resetear, se llenará con los que sobren de la optimización

        while (hombresSobrantes.length >= 2 && mujeresSobrantes.length >= 2) {
            let bestGroupFound = null;
            let bestMatchFound = null;
            let lowestMetric = Infinity;

            // Buscar la MEJOR combinación 2H+2M posible que genere un partido válido
            const comboH = combinations(hombresSobrantes, 2);
            const comboM = combinations(mujeresSobrantes, 2);

            for (const hPair of comboH) {
                for (const mPair of comboM) {
                    const currentGroup = [...hPair, ...mPair];
                    // Intentar formar H-M vs H-M con este grupo
                    const trials = buildTrials(currentGroup, true); // Forzar mixto estricto
                    if (trials.length > 0) {
                        trials.sort((a, b) => a.metric - b.metric); // Ordenar por métrica
                        if (trials[0].metric < lowestMetric) {
                             lowestMetric = trials[0].metric;
                             bestMatchFound = trials[0]; // Guardar el mejor trial (partido)
                             bestGroupFound = currentGroup; // Guardar el grupo que lo generó
                        }
                    }
                }
            }

            // Si se encontró un buen partido H-M vs H-M
            if (bestMatchFound) {
                 console.log(` -> Encontrado partido H-M optimizado con métrica ${lowestMetric.toFixed(2)}`);
                 newlyCreatedMatches.push({
                     ...bestMatchFound, // Usar los datos del trial (incluye A, B, stats)
                     basePista: null, fixed: false,
                     ids: [bestMatchFound.A.map(p => p.id), bestMatchFound.B.map(p => p.id)]
                 });
                 // Quitar los jugadores del grupo encontrado de las listas de sobrantes
                 const idsToRemove = new Set(bestGroupFound.map(p => p.id));
                 hombresSobrantes = hombresSobrantes.filter(p => !idsToRemove.has(p.id));
                 mujeresSobrantes = mujeresSobrantes.filter(p => !idsToRemove.has(p.id));
            } else {
                 // No se encontró ninguna combinación 2H+2M válida, salir del bucle H-M
                 console.log(" -> No se encontraron más combinaciones 2H+2M válidas para H-M vs H-M.");
                 break;
            }
        }
        // Los jugadores que queden en hombresSobrantes y mujeresSobrantes van al pool final
        unassignedPlayers = [...hombresSobrantes, ...mujeresSobrantes];
        console.log(` -> Quedan ${unassignedPlayers.length} jugadores tras optimización H-M.`);
    } // Fin optimización H-M

    // --- 8b Parte 3: Fallback - Emparejar lo que quede de 4 en 4 ---
    unassignedPlayers.sort((a, b) => b.nivel - a.nivel); // Ordenar por nivel
    while (unassignedPlayers.length >= 4) {
        // Coger los 4 de mayor nivel (o barajar?) Barajar podría ser mejor aquí
        // unassignedPlayers.sort(() => Math.random() - 0.5); // Descomentar para barajar
        const group = unassignedPlayers.splice(0, 4);

        // Intentar formar CUALQUIER partido válido (buildTrials false)
        let trials = buildTrials(group, false);

        if (trials.length > 0) {
            trials.sort((a, b) => a.metric - b.metric); // Coger la mejor métrica posible
            const pick = trials[0];
            console.log(` -> Formado partido fallback con [${group.map(p=>p.nombre||p.id).join(', ')}]`);
            newlyCreatedMatches.push({
                ...pick, basePista: null, fixed: false,
                ids: [pick.A.map(p => p.id), pick.B.map(p => p.id)]
            });
        } else {
            // Si ni así se puede, estos 4 no pueden jugar entre sí por restricciones
            console.warn(`Grupo sobrante irresoluble por restricciones internas: ${group.map(p=>p.nombre||p.id).join(',')}`);
            trulyUnassigned.push(...group); // Añadir a la lista final de sin partido
        }
    }
    // Los < 4 jugadores restantes en unassignedPlayers también van a trulyUnassigned
    trulyUnassigned.push(...unassignedPlayers);

    // --- FIN de la Reesctritura Fase 8b ---

    const uniqueMatchesList = [...allCompleteMatches, ...finalIncomplete, ...newlyCreatedMatches];
    // Final pista assignment if any are null
     let finalAvailablePistas = Array.from({ length: numPistas }, (_, i) => i + 1).filter(p => !new Set(uniqueMatchesList.filter(m=>m.basePista).map(m=>m.basePista)).has(p));
     uniqueMatchesList.forEach(m => { if(!m.basePista) m.basePista = finalAvailablePistas.shift() ?? nextNewPista++; });
     uniqueMatchesList.sort((a, b) => (a.basePista || Infinity) - (b.basePista || Infinity));


    // 9) Formatear UI
    function formatPlayer(p) {
        if (!p) return "Vacío";
        const icon = p.genero === 'hombre' ? '👦' : '👧';
        const hand = p.mano === 'zurdo' ? '🫲' : '✋';
        return `${p.nombre || 'N/A'} (${icon} ${p.nivel}, ${p.posicion}, ${hand})`;
    }

    const matches = uniqueMatchesList.map(m => {
        const finalStats = calculateMatchStats(m.A, m.B); // Recalculate final stats consistently
        return {
            pista: m.basePista,
            teams: [(m.A || []).map(formatPlayer), (m.B || []).map(formatPlayer)],
            totals: finalStats.totals,
            avgs: finalStats.avgs.map(avg => avg.toFixed(1)),
            diffAvg: finalStats.incompleto ? '?.?' : finalStats.diffAvg.toFixed(1),
            diffTot: finalStats.incompleto ? '?' : finalStats.diffTot,
            incompleto: finalStats.incompleto
        };
    });

    const sinPartidoNombres = unassignedPlayers.map(p => p.nombre); // Players still unassigned
    const debug = uniqueMatchesList.map(m => ({ // Simplified debug output
        pista: m.basePista, idsA: m.A?.map(p=>p.id), idsB: m.B?.map(p=>p.id), incompleto: m.incompleto, fixed: m.fixed, avgOverall: m.avgOverall?.toFixed(2), diffAvg: m.diffAvg?.toFixed(2)
    }));

    return { matches, debug, sinPartido: sinPartidoNombres };
}