// Mission 93 — la fourchette du conseiller a deux bornes, ou n'existe pas. Une borne seule
// figeait la recherche Stream Estate sur un prix exact (la borne servait de minimum ET de
// maximum) : elle ne s'enregistre plus, et la recherche ne la lit plus.

export const LONE_BOUND_ERROR = 'Indiquez les deux montants';

type Bound = number | null | undefined;

export function hasLoneRangeBound(min: Bound, max: Bound): boolean {
  return (min == null) !== (max == null);
}

// La borne qui manque : c'est elle que l'écran désigne.
export function missingRangeBound(
  min: Bound,
  max: Bound,
): 'advisor_price_min' | 'advisor_price_max' | null {
  if (!hasLoneRangeBound(min, max)) {
    return null;
  }
  return min == null ? 'advisor_price_min' : 'advisor_price_max';
}

// Ce que la recherche a le droit de lire : les deux bornes, ou rien.
export function completeAdvisorRange(
  min: Bound,
  max: Bound,
): { min: number | null; max: number | null } {
  return min != null && max != null ? { min, max } : { min: null, max: null };
}
