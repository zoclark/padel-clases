/*  couples.js
 *  ───────────
 *  Funciones que generan, puntúan y filtran combinaciones de 4 jugadores
 *  (pareja A vs pareja B). Se usan en las fases de “buildTrials”.
 */

import {
    PARTNER_DIFF_W,
    POSMAN_W,
    ZURDO_ZURDO_W,
    MIX_GENDER_W,
} from "./constants.js";
import { combinations, calculateMatchStats } from "./utils.js";

/* true si X NO puede estar en el mismo equipo que Y */
function forbiddenSameTeam(x, y) {
    return (
        (x.no_juega_con || []).includes(y.id) ||
        (y.no_juega_con || []).includes(x.id)
    );
}

/* true si X NO puede ser rival de Y */
function forbiddenRivals(x, y) {
    return (
        (x.no_juega_contra || []).includes(y.id) ||
        (y.no_juega_contra || []).includes(x.id)
    );
}

/* Devuelve lista de trials válidos y puntuados */
export function buildTrials(groupOfFour, opciones) {
    const { tipoPozo, esMixtoPerfecto, exigirMixto = true } = opciones;

    const perms = [
        [0, 1, 2, 3],
        [0, 2, 1, 3],
        [0, 3, 1, 2],
    ];
    const trials = [];

    for (const [i1, i2, j1, j2] of perms) {
        const A = [groupOfFour[i1], groupOfFour[i2]];
        const B = [groupOfFour[j1], groupOfFour[j2]];

        let skip = false;

        /** ───────── Validaciones duras (skip inmediato) ───────── */

        // 1) “juega_contra” → deben quedar en lados opuestos
        for (const X of [...A, ...B]) {
            for (const Y of [...A, ...B]) {
                if (X.id === Y.id) continue;
                if ((X.juega_contra || []).includes(Y.id)) {
                    const inOpposite = (A.includes(X) && B.includes(Y)) || (B.includes(X) && A.includes(Y));
                    if (!inOpposite) { skip = true; break; }
                }
            }
            if (skip) break;
        }
        if (skip) continue;

        // 2) “juega_con” debe quedar en la misma pareja
        for (const X of [...A, ...B]) {
            for (const Yid of X.juega_con || []) {
                const Y = groupOfFour.find(p => p.id === Yid);
                if (Y && !((A.includes(X) && A.includes(Y)) || (B.includes(X) && B.includes(Y)))) {
                    skip = true;
                    break;
                }
            }
            if (skip) break;
        }
        if (skip) continue;

        // 3) “no_juega_con” y “no_juega_contra”
        for (const X of [...A, ...B]) {
            for (const Y of [...A, ...B]) {
                if (X.id === Y.id) continue;
                // no juega con: no en mismo equipo
                if (forbiddenSameTeam(X, Y) && ((A.includes(X) && A.includes(Y)) || (B.includes(X) && B.includes(Y)))) {
                    skip = true; break;
                }
                // no juega contra: no en bandos opuestos
                if (forbiddenRivals(X, Y) && ((A.includes(X) && B.includes(Y)) || (B.includes(X) && A.includes(Y)))) {
                    skip = true; break;
                }
            }
            if (skip) break;
        }
        if (skip) continue;

        // 4) Mezcla (si se exige mixto) o parejas forzadas
        if (exigirMixto && tipoPozo === "mixto") {
            const isAForced = A[0].juega_con.includes(A[1].id);
            const isBForced = B[0].juega_con.includes(B[1].id);
            const AisMix = A[0].genero !== A[1].genero;
            const BisMix = B[0].genero !== B[1].genero;
            if (!AisMix && !isAForced) skip = true;
            if (!BisMix && !isBForced) skip = true;
        }
        if (skip) continue;

        /** ───────── Puntuación (métrica) ───────── */
        const stats = calculateMatchStats(A, B);
        const diffCouple =
            Math.abs(A[0].nivel - A[1].nivel) +
            Math.abs(B[0].nivel - B[1].nivel);

        let posMan = 0;
        [A, B].forEach(t => {
            if (t.length === 2 &&
                t[0].posicion !== "Ambos" &&
                t[1].posicion !== "Ambos" &&
                t[0].posicion === t[1].posicion) {
                posMan++;
            }
        });

        let zurdos = 0;
        [A, B].forEach(t => {
            if (t.length === 2 &&
                t[0].mano === "zurdo" &&
                t[1].mano === "zurdo") {
                zurdos++;
            }
        });

        let mixPenalty = 0;
        if (exigirMixto && tipoPozo === "mixto") {
            const isAForced = A[0].juega_con.includes(A[1].id);
            const isBForced = B[0].juega_con.includes(B[1].id);
            const AisMix = A[0].genero !== A[1].genero;
            const BisMix = B[0].genero !== B[1].genero;
            if (!AisMix && !isAForced) mixPenalty += MIX_GENDER_W / 2;
            if (!BisMix && !isBForced) mixPenalty += MIX_GENDER_W / 2;
        }

        const metric =
            stats.diffAvg * 2 +
            diffCouple * PARTNER_DIFF_W +
            posMan * POSMAN_W +
            zurdos * ZURDO_ZURDO_W +
            mixPenalty;

        trials.push({
            A,
            B,
            metric,
            ...stats,
        });
    }

    return trials;
}

export { forbiddenSameTeam, forbiddenRivals };
