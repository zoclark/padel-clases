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
  
      /** ───────── Validaciones duras (skip inmediato) ───────── */
      let skip = false;
  
      /* 1. Género mixto */
      if (exigirMixto && tipoPozo === "mixto") {
        const AisMix = A[0].genero !== A[1].genero;
        const BisMix = B[0].genero !== B[1].genero;
        if (esMixtoPerfecto) {
          if (!(AisMix && BisMix)) skip = true;
        } else {
          if (!AisMix || !BisMix) skip = true;
        }
      }
  
      /* 2. Respeto de restricciones (juega con / contra / no juega…) */
      if (!skip) {
        const everyone = [...A, ...B];
        outer: for (const X of everyone) {
          for (const Y of everyone) {
            if (X.id === Y.id) continue;
            // “juega con” debe quedar en misma pareja
            if (
              (X.juega_con || []).includes(Y.id) &&
              !(A.includes(X) && A.includes(Y)) &&
              !(B.includes(X) && B.includes(Y))
            ) {
              skip = true;
              break outer;
            }
            // “juega contra” debe quedar en distinto lado
            if (
              (X.juega_contra || []).includes(Y.id) &&
              !(
                (A.includes(X) && B.includes(Y)) ||
                (B.includes(X) && A.includes(Y))
              )
            ) {
              skip = true;
              break outer;
            }
            // “no juega con”
            if (
              forbiddenSameTeam(X, Y) &&
              ((A.includes(X) && A.includes(Y)) ||
                (B.includes(X) && B.includes(Y)))
            ) {
              skip = true;
              break outer;
            }
            // “no juega contra”
            if (
              forbiddenRivals(X, Y) &&
              ((A.includes(X) && B.includes(Y)) ||
                (B.includes(X) && A.includes(Y)))
            ) {
              skip = true;
              break outer;
            }
          }
        }
      }
  
      if (skip) continue;
  
      /** ───────── Puntuación (métrica) ───────── */
      const stats = calculateMatchStats(A, B);
  
      const diffCouple =
        Math.abs(A[0].nivel - A[1].nivel) +
        Math.abs(B[0].nivel - B[1].nivel);
  
      /* penalización 2 drives o 2 revés */
      let posMan = 0;
      [A, B].forEach((t) => {
        if (t[0].posicion !== "Ambos" && t[0].posicion === t[1].posicion)
          posMan++;
      });
  
      /* penalización zurdo-zurdo */
      let zurdos = 0;
      [A, B].forEach((t) => {
        if (t[0].mano === "zurdo" && t[1].mano === "zurdo") zurdos++;
      });
  
      /* penalización por no ser mixto cuando se exige */
      const mixPenalty =
        exigirMixto && tipoPozo === "mixto" && !esMixtoPerfecto
          ? A[0].genero === A[1].genero || B[0].genero === B[1].genero
            ? MIX_GENDER_W
            : 0
          : 0;
  
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
  
  /* Exponemos los filtros para que matches.js pueda reutilizarlos */
  export { forbiddenSameTeam, forbiddenRivals };
  