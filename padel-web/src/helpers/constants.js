/*  constants.js
 *  ────────────
 *  Pesos, umbrales y banderas de configuración usadas por el algoritmo.
 *  Si quieres reajustar criterios (peso de zurdos, diferencia
 *  aceptada como “empate”, etc.) SOLO tocas este archivo.
 */

export const PARTNER_DIFF_W   = 0.5;   // peso de la diferencia interna de pareja
export const POSMAN_W         = 0.15;  // penaliza 2 drives o 2 revés en la misma pareja
export const ZURDO_ZURDO_W    = 0.50;  // penaliza pareja zurda‐zurda
export const MIX_GENDER_W     = 1.00;  // penalización si no se logra mixto (cuando aplica)

export const EPSILON_BUILD    = 0.01;  // margen para considerar métrica “casi igual”
export const AVG_TIE_THRESHOLD= 0.5;   // ← **nueva regla**: si diffAvg ≤ 0.5 se trata como empate
