// Mission 128 B — les critères triés après réception et ce que dit la carte quand la donnée
// manque, sans zod : le classement et la liste du Live les lisent dans le navigateur. Pur.

export type FilterName = 'dpe' | 'minFloor' | 'outdoor' | 'minLand' | 'pool';

// Ce que dit la carte d'un bien gardé dont la donnée manque.
export const UNKNOWN_LABELS: Record<FilterName, string> = {
  dpe: 'DPE non indiqué',
  minFloor: 'Étage non indiqué',
  outdoor: 'Extérieur non indiqué',
  minLand: 'Terrain non indiqué',
  pool: 'Piscine non indiquée',
};
