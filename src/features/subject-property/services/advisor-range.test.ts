import { describe, expect, it } from 'vitest';

import {
  completeAdvisorRange,
  hasLoneRangeBound,
  LONE_BOUND_ERROR,
  missingRangeBound,
} from '@/features/subject-property/services/advisor-range';

describe('la fourchette du conseiller a deux bornes, ou n’existe pas (mission 93)', () => {
  it('refuse une borne seule, et désigne celle qui manque', () => {
    expect(hasLoneRangeBound(300_000, null)).toBe(true);
    expect(missingRangeBound(300_000, null)).toBe('advisor_price_max');
    expect(hasLoneRangeBound(null, 350_000)).toBe(true);
    expect(missingRangeBound(null, 350_000)).toBe('advisor_price_min');
    expect(LONE_BOUND_ERROR).toBe('Indiquez les deux montants');
  });

  it('accepte deux bornes, ou aucune', () => {
    expect(hasLoneRangeBound(300_000, 350_000)).toBe(false);
    expect(hasLoneRangeBound(null, null)).toBe(false);
    expect(missingRangeBound(null, null)).toBeNull();
    expect(missingRangeBound(300_000, 350_000)).toBeNull();
  });

  it('ne donne jamais une borne seule à la recherche', () => {
    expect(completeAdvisorRange(300_000, 350_000)).toEqual({ min: 300_000, max: 350_000 });
    expect(completeAdvisorRange(300_000, null)).toEqual({ min: null, max: null });
    expect(completeAdvisorRange(null, 350_000)).toEqual({ min: null, max: null });
    expect(completeAdvisorRange(undefined, undefined)).toEqual({ min: null, max: null });
  });
});
