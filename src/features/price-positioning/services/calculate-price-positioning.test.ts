import { describe, expect, it } from 'vitest';

import { makeComparable } from '@/features/comparable-analysis/services/test-helpers';
import { calculatePricePositioning } from '@/features/price-positioning/services/calculate-price-positioning';
import type { Comparable } from '@/features/comparables/types';

// Builds a comparable whose price/m² is exactly `ppsm` (price = ppsm × surface).
function comp(id: string, ppsm: number, overrides: Partial<Comparable> = {}): Comparable {
  const surface = (overrides.surface_area as number | undefined) ?? 50;
  return makeComparable({ id, surface_area: surface, price: ppsm * surface, ...overrides });
}

function positioning(
  comparables: Comparable[],
  surfaceArea: number | null,
  advisorPrice?: number | null,
  sellerPrice?: number | null,
) {
  return calculatePricePositioning({
    comparables,
    sellerProperty: { surfaceArea },
    advisorPrice,
    sellerPrice,
  });
}

describe('calculatePricePositioning — preconditions', () => {
  it('is insufficient without a seller surface', () => {
    const result = positioning([comp('a', 6000)], null);
    expect(result.status).toBe('insufficient_data');
    expect(result.recommendedRange).toBeNull();
    expect(result.reasons.some((r) => r.includes('surface du bien vendeur'))).toBe(true);
  });

  it('is insufficient when no comparable is eligible', () => {
    const result = positioning([comp('a', 6000, { is_selected: false })], 50);
    expect(result.status).toBe('insufficient_data');
    expect(result.reasons.some((r) => r.includes('prix et une surface'))).toBe(true);
  });

  it('is ready with a single eligible comparable', () => {
    const result = positioning([comp('a', 6000)], 50);
    expect(result.status).toBe('ready');
    expect(result.dataset.usedCount).toBe(1);
    expect(result.recommendedRange?.central).toBe(300000);
  });
});

describe('calculatePricePositioning — central value', () => {
  it('uses the median price/m² × seller surface (odd median)', () => {
    const result = positioning([comp('a', 5000), comp('b', 6000), comp('c', 7000)], 50);
    expect(result.recommendedRange?.central).toBe(300000); // 6000 × 50
  });

  it('handles an even median', () => {
    const result = positioning(
      [comp('a', 5000), comp('b', 5800), comp('c', 6200), comp('d', 7000)],
      50,
    );
    expect(result.recommendedRange?.central).toBe(300000); // median 6000 × 50
  });

  it('multiplies by the seller surface and rounds to the nearest euro', () => {
    const result = positioning([comp('a', 5000), comp('b', 6000), comp('c', 7000)], 55);
    expect(result.recommendedRange?.central).toBe(330000); // 6000 × 55
  });

  it('recomputes the median after excluding outliers', () => {
    // 4 normal (median of the four = 5075) + 1 far outlier.
    const result = positioning(
      [comp('a', 5000), comp('b', 5050), comp('c', 5100), comp('d', 5150), comp('x', 9000)],
      50,
    );
    expect(result.dataset.excludedOutlierCount).toBe(1);
    expect(result.recommendedRange?.central).toBe(253750); // 5075 × 50, not 5100 × 50
  });
});

describe('calculatePricePositioning — range widths', () => {
  it('applies ±3% for low dispersion', () => {
    const result = positioning([comp('a', 5000), comp('b', 5100), comp('c', 5200)], 50);
    expect(result.recommendedRange?.dispersion).toBe('low');
    expect(result.recommendedRange?.widthPercentage).toBe(3);
    expect(result.recommendedRange).toMatchObject({ central: 255000, low: 247350, high: 262650 });
  });

  it('applies ±6% for medium dispersion', () => {
    const result = positioning([comp('a', 5000), comp('b', 5500), comp('c', 6000)], 50);
    expect(result.recommendedRange?.dispersion).toBe('medium');
    expect(result.recommendedRange?.widthPercentage).toBe(6);
    expect(result.recommendedRange).toMatchObject({ central: 275000, low: 258500, high: 291500 });
  });

  it('applies ±10% for high dispersion', () => {
    const result = positioning(
      [comp('a', 5000), comp('b', 5500), comp('c', 6000), comp('d', 6500), comp('e', 7000)],
      50,
    );
    expect(result.recommendedRange?.dispersion).toBe('high');
    expect(result.recommendedRange?.widthPercentage).toBe(10);
    expect(result.recommendedRange).toMatchObject({ central: 300000, low: 270000, high: 330000 });
  });

  it('always keeps low ≤ central ≤ high', () => {
    const result = positioning(
      [comp('a', 5000), comp('b', 5500), comp('c', 6000), comp('d', 6500), comp('e', 7000)],
      50,
    );
    const range = result.recommendedRange!;
    expect(range.low).toBeLessThanOrEqual(range.central);
    expect(range.central).toBeLessThanOrEqual(range.high);
  });
});

describe('calculatePricePositioning — outlier handling', () => {
  it('reports no outlier for a homogeneous set', () => {
    const result = positioning([comp('a', 5000), comp('b', 5100), comp('c', 5200)], 50);
    expect(result.dataset).toMatchObject({
      outlierCount: 0,
      excludedOutlierCount: 0,
      outliersReintroduced: false,
      usedCount: 3,
    });
  });

  it('excludes one outlier when at least three remain', () => {
    const result = positioning(
      [comp('a', 5000), comp('b', 5050), comp('c', 5100), comp('d', 5150), comp('x', 9000)],
      50,
    );
    expect(result.dataset).toMatchObject({
      outlierCount: 1,
      excludedOutlierCount: 1,
      outliersReintroduced: false,
      usedCount: 4,
    });
    expect(result.reasons).toContain('Un comparable atypique a été exclu du calcul.');
    expect(result.influentialComparables.map((c) => c.comparableId)).not.toContain('x');
  });

  it('excludes several outliers when at least three remain', () => {
    const result = positioning(
      [
        comp('a', 5000),
        comp('b', 5050),
        comp('c', 5100),
        comp('d', 5150),
        comp('e', 5200),
        comp('x', 9000),
        comp('y', 9500),
      ],
      50,
    );
    expect(result.dataset.excludedOutlierCount).toBe(2);
    expect(result.dataset.usedCount).toBe(5);
    expect(result.reasons).toContain('2 comparables atypiques ont été exclus du calcul.');
  });

  it('reintroduces outliers when exclusion would leave fewer than three', () => {
    const result = positioning([comp('a', 5000), comp('b', 5100), comp('x', 9000)], 50);
    expect(result.dataset).toMatchObject({
      outlierCount: 1,
      excludedOutlierCount: 0,
      outliersReintroduced: true,
      usedCount: 3,
    });
    expect(result.reasons).toContain(
      'Les comparables atypiques ont été réintégrés afin de conserver un échantillon suffisant.',
    );
    // A reintroduced outlier belongs to the official set → eligible for influence.
    expect(result.influentialComparables.map((c) => c.comparableId)).toContain('x');
  });

  it('strongly lowers confidence after reintroduction', () => {
    const withReintroduction = positioning([comp('a', 5000), comp('b', 5100), comp('x', 9000)], 50);
    const homogeneous = positioning([comp('a', 5000), comp('b', 5100), comp('c', 5200)], 50);
    expect(withReintroduction.confidence.score).toBeLessThan(homogeneous.confidence.score);
    expect(withReintroduction.confidence.warningFactors.some((f) => f.includes('réintégrés'))).toBe(
      true,
    );
  });
});

describe('calculatePricePositioning — advisor price', () => {
  const comps = [comp('a', 5000), comp('b', 5100), comp('c', 5200)]; // central 255000, range 247350..262650

  it('defaults the advisor price to the central value', () => {
    const result = positioning(comps, 50);
    expect(result.defaultAdvisorPrice).toBe(255000);
    expect(result.advisorPrice).toBe(255000);
    expect(result.advisorDeviationFromCentral).toEqual({ absolute: 0, percentage: 0 });
    expect(result.advisorMarketPosition).toBe('within_observed_market');
  });

  it('positions an advisor price below, within and above the range', () => {
    expect(positioning(comps, 50, 240000).advisorMarketPosition).toBe('below_observed_market');
    expect(positioning(comps, 50, 255000).advisorMarketPosition).toBe('within_observed_market');
    expect(positioning(comps, 50, 300000).advisorMarketPosition).toBe('above_observed_market');
  });

  it('computes the advisor deviation from the central value', () => {
    const result = positioning(comps, 50, 280500); // +25500 / 255000 = +10%
    expect(result.advisorDeviationFromCentral).toEqual({ absolute: 25500, percentage: 10 });
  });
});

describe('calculatePricePositioning — seller price', () => {
  const comps = [comp('a', 5000), comp('b', 5100), comp('c', 5200)]; // central 255000

  it('returns neutral (null) values when no seller price is given', () => {
    const result = positioning(comps, 50, 255000, null);
    expect(result.sellerPrice).toBeNull();
    expect(result.sellerDeviationFromCentral).toBeNull();
    expect(result.sellerDeviationFromAdvisor).toBeNull();
    expect(result.sellerMarketPosition).toBeNull();
  });

  it('computes seller deviations from central and from advisor', () => {
    const result = positioning(comps, 50, 260000, 280500); // seller vs central and vs advisor
    expect(result.sellerDeviationFromCentral).toEqual({ absolute: 25500, percentage: 10 });
    expect(result.sellerDeviationFromAdvisor).toMatchObject({ absolute: 20500 });
    expect(result.sellerMarketPosition).toBe('above_observed_market');
  });

  it('positions a seller price under and within the range', () => {
    expect(positioning(comps, 50, 255000, 240000).sellerMarketPosition).toBe(
      'below_observed_market',
    );
    expect(positioning(comps, 50, 255000, 255000).sellerMarketPosition).toBe(
      'within_observed_market',
    );
  });
});

describe('calculatePricePositioning — reasons and safety', () => {
  it('produces deterministic, duplicate-free reasons', () => {
    const result = positioning([comp('a', 5000), comp('b', 5100)], 50);
    expect(result.reasons.length).toBe(new Set(result.reasons).size);
    expect(result.reasons.some((r) => r.includes('Peu de comparables'))).toBe(true);
  });

  it('mentions strong dispersion and geographic dispersion when relevant', () => {
    const result = positioning(
      [
        comp('a', 5000, { city: 'Antibes' }),
        comp('b', 5500, { city: 'Nice' }),
        comp('c', 6000, { city: 'Cannes' }),
        comp('d', 6500, { city: 'Grasse' }),
        comp('e', 7000, { city: 'Vence' }),
      ],
      50,
    );
    expect(result.reasons).toContain(
      'Le marché observé présente une forte dispersion des prix au m².',
    );
    expect(result.reasons).toContain('Les données disponibles sont géographiquement dispersées.');
  });

  it('never produces NaN or Infinity in a ready result', () => {
    const result = positioning(
      [comp('a', 5000), comp('b', 6000), comp('c', 7000)],
      50,
      280000,
      320000,
    );
    const numbers = [
      result.recommendedRange!.low,
      result.recommendedRange!.central,
      result.recommendedRange!.high,
      result.confidence.score,
      result.defaultAdvisorPrice!,
      result.advisorPrice!,
      result.sellerPrice!,
      result.advisorDeviationFromCentral!.absolute,
      result.advisorDeviationFromCentral!.percentage!,
      result.sellerDeviationFromCentral!.absolute,
      result.sellerDeviationFromCentral!.percentage!,
      ...result.influentialComparables.flatMap((c) => [
        c.proximityScore,
        c.surfaceDeviationPercentage,
        c.pricePerSquareMeterDeviationPercentage,
      ]),
    ];
    for (const value of numbers) {
      expect(Number.isFinite(value)).toBe(true);
    }
  });
});
