// ==== PADEL PAIRINGS ESTRICTO Y FUNCIONAL ====

/**
 * Mezcla un array (Fisher-Yates)
 */
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/**
 * No pueden emparejarse si hay restricción mutua
 */
function noPuedenEmparejar(j1, j2) {
    if (!j1 || !j2) return false;
    const njc1 = (j1.no_juega_con || []).map(Number);
    const njc2 = (j2.no_juega_con || []).map(Number);
    return njc1.includes(j2.id) || njc2.includes(j1.id);
}

/**
 * Penaliza combinaciones no óptimas (no-mixto, zurdos, posiciones)
 */
function penalizaPareja(j1, j2) {
    let penal = 0;
    if (!j1 || !j2) return 0;
    if (j1.genero && j2.genero && j1.genero === j2.genero) penal += 10; // Penaliza no mixto
    if (j1.mano_dominante === "zurdo" && j2.mano_dominante === "zurdo") penal += 1;
    if (j1.posicion === "drive" && j2.posicion === "drive") penal += 1;
    if (j1.posicion === "reves" && j2.posicion === "reves") penal += 1;
    return penal;
}

/**
 * Empareja jugadores libres priorizando mixto y penalizando malas combinaciones
 */
function emparejaLibres(jugadores, usadosSet) {
    let libres = jugadores.filter(j => !usadosSet.has(j.id));
    let parejas = [];
    let usados = new Set();

    // Mientras haya más de 1 jugador libre...
    while (libres.length > 1) {
        let mejor = null, menorPenal = 9999, idxA = -1, idxB = -1;
        // Busca la pareja con menor penalización posible
        for (let i = 0; i < libres.length; i++) {
            for (let j = i + 1; j < libres.length; j++) {
                let a = libres[i], b = libres[j];
                if (noPuedenEmparejar(a, b)) continue;
                let penal = penalizaPareja(a, b);
                if (penal < menorPenal) {
                    menorPenal = penal;
                    mejor = [a, b];
                    idxA = i;
                    idxB = j;
                }
            }
        }
        // Si encontró pareja óptima, la asigna y elimina de libres
        if (mejor) {
            parejas.push({
                jugadores: mejor,
                manual: false,
                fija: null,
                avisos: []
            });
            usados.add(mejor[0].id);
            usados.add(mejor[1].id);
            // Eliminar del array (el mayor primero para no descolocar el menor)
            libres.splice(idxB, 1);
            libres.splice(idxA, 1);
        } else {
            // Si no encuentra ningún emparejamiento posible, rompe (caso raro)
            break;
        }
    }
    // Los que queden sin pareja son "singles"
    return { parejas, singles: libres };
}

/**
 * Asigna parejas fijas a sus pistas (inmovibles)
 */
function asignaParejasFijas(jugadores, numPistas) {
    let pistas = Array(numPistas).fill(null).map(() => []);
    let usados = new Set();

    for (const jugador of jugadores) {
        if (usados.has(jugador.id)) continue;
        if (jugador.juega_con && jugador.juega_con.length > 0) {
            const parejaId = Number(jugador.juega_con[0]);
            const pareja = jugadores.find(j => j.id === parejaId);
            if (pareja && !usados.has(pareja.id)) {
                const pistaFija = jugador.pista_fija || pareja.pista_fija;
                if (pistaFija) {
                    let idx = Number(pistaFija) - 1;
                    if (idx >= 0 && idx < numPistas && pistas[idx].length < 2) {
                        pistas[idx].push({
                            jugadores: [jugador, pareja],
                            manual: true,
                            fija: pistaFija,
                            avisos: []
                        });
                        usados.add(jugador.id);
                        usados.add(pareja.id);
                    }
                }
            }
        }
    }
    return { pistas, usados };
}

/**
 * Asigna las parejas libres a las pistas vacías por nivel
 */
function asignaParejasLibres(pistas, parejasLibres, numPistas) {
    // Ordena por media descendente (mejores arriba)
    parejasLibres.sort((a, b) => {
        let nivelA = (Number(a.jugadores[0].nivel) + Number(a.jugadores[1].nivel)) / 2;
        let nivelB = (Number(b.jugadores[0].nivel) + Number(b.jugadores[1].nivel)) / 2;
        return nivelB - nivelA;
    });

    let idx = 0;
    // Recorre todas las pistas y las rellena donde falten parejas
    for (let i = 0; i < numPistas; i++) {
        while (pistas[i].length < 2 && idx < parejasLibres.length) {
            pistas[i].push(parejasLibres[idx]);
            idx++;
        }
    }
    return pistas;
}

/**
 * Paso final: formatea resultado para mostrar
 */
function resultadoFinal(pistas) {
    let partidos = [];
    pistas.forEach((parejas, idx) => {
        if (!parejas.length) return;
        let [pA, pB] = parejas;
        let jugA = pA ? pA.jugadores : [];
        let jugB = pB ? pB.jugadores : [];
        let totalA = jugA.length ? Number(jugA[0].nivel || 0) + Number(jugA[1]?.nivel || 0) : 0;
        let totalB = jugB.length ? Number(jugB[0].nivel || 0) + Number(jugB[1]?.nivel || 0) : 0;
        let avgA = jugA.length ? (Number(jugA[0].nivel || 0) + Number(jugA[1]?.nivel || 0)) / (jugA[1] ? 2 : 1) : 0;
        let avgB = jugB.length ? (Number(jugB[0].nivel || 0) + Number(jugB[1]?.nivel || 0)) / (jugB[1] ? 2 : 1) : 0;
        let diffAvg = Math.abs(avgA - avgB);
        let diffTot = Math.abs(totalA - totalB);
        let avisosParejas = [];
        function checkCompat(a, b) {
            if (a && b) {
                if (a.mano_dominante === "zurdo" && b.mano_dominante === "zurdo") avisosParejas.push("Pareja zurdo-zurdo");
                if (a.posicion === "drive" && b.posicion === "drive") avisosParejas.push("Pareja drive-drive");
                if (a.posicion === "reves" && b.posicion === "reves") avisosParejas.push("Pareja reves-reves");
            }
        }
        if (jugA.length) checkCompat(jugA[0], jugA[1]);
        if (jugB.length) checkCompat(jugB[0], jugB[1]);
        if (diffAvg > 1) avisosParejas.push("Diferencia de medias > 1");
        partidos.push({
            pista: idx + 1,
            teams: [
                jugA.map(j => j.nombre),
                jugB.map(j => j.nombre)
            ],
            totals: [totalA, totalB],
            avgs: [avgA, avgB],
            diffAvg,
            diffTot,
            avisos: avisosParejas
        });
    });
    return { partidos };
}

// === FUNCION PRINCIPAL ===
function generarEmparejamientos(jugadores, numPistas) {
    // 1. Coloca parejas fijas en sus pistas
    const { pistas, usados } = asignaParejasFijas(jugadores, numPistas);
    // 2. Empareja el resto de jugadores
    const { parejas: parejasLibres } = emparejaLibres(jugadores, usados);
    // 3. Rellena el resto de pistas con esas parejas
    asignaParejasLibres(pistas, parejasLibres, numPistas);
    // 4. Devuelve el resultado final
    return resultadoFinal(pistas);
}

// === EXPORTS ===
export {
    generarEmparejamientos,
    asignaParejasFijas,
    emparejaLibres,
    asignaParejasLibres,
    resultadoFinal,
};
