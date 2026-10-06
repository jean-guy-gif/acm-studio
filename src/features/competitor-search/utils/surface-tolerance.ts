// Mission 68 — plancher de la tolérance de surface : ±5 % (puis ±10 % au plus) d'un petit bien
// ne laisse presque rien passer (±1 m² pour 20 m²). La tolérance n'est donc jamais inférieure à
// ±3 m² : 17–23 m² pour 20 m². Dès 60 m², ±5 % vaut déjà 3 m² — pour 80 m², rien ne change.
export const SURFACE_FLOOR_SQM = 3;
// Mission 69 — la tolérance de surface envoyée aux portails = le DERNIER cran de surface (±10 %).
// La lecture garde ensuite ses crans (5 → 7,5 → 10 %) sur ce que le portail a renvoyé.
export const WIDEST_SURFACE_TOLERANCE = 0.1;

// Mission 71 — la tolérance « identique » de surface (portails et cran 1 de Stream Estate) : ±10 %,
// jamais moins de ±3 m².
export function identicalSurfaceTolerance(surface: number): number {
  return Math.max(surface * WIDEST_SURFACE_TOLERANCE, SURFACE_FLOOR_SQM);
}
