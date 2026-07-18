import { describe, expect, it } from 'vitest';

import { makeComparable } from '@/features/comparable-analysis/services/test-helpers';
import { buildPositioningSnapshot } from '@/features/price-positioning/services/build-positioning-snapshot';
import { calculatePricePositioning } from '@/features/price-positioning/services/calculate-price-positioning';
import type { Comparable } from '@/features/comparables/types';
import { PRICE_POSITIONING_ENGINE_VERSION } from '@/features/price-positioning/types/saved-price-positioning';

function comp(id: string, ppsm: number, overrides: Partial<Comparable> = {}): Comparable {
  const surface = (overrides.surface_area as number | undefined) ?? 50;
  return makeComparable({ id, surface_area: surface, price: ppsm * surface, ...overrides });
}

describe('buildPositioningSnapshot', () => {
  it('builds a complete, versioned snapshot from a ready positioning', () => {
    const positioning = calculatePricePositioning({
      comparables: [comp('a', 5000), comp('b', 6000), comp('c', 7000)],
      sellerProperty: { surfaceArea: 50 },
    });
    const snapshot = buildPositioningSnapshot(positioning);
    expect(snapshot).not.toBeNull();
    expect(snapshot?.engineVersion).toBe(PRICE_POSITIONING_ENGINE_VERSION);
    expect(snapshot?.usedCount).toBe(3);
    expect(snapshot?.dispersion).toBe('high');
    expect(snapshot?.widthPercentage).toBe(10);
    expect(snapshot?.confidenceScore).toBe(positioning.confidence.score);
    expect(snapshot?.influentialComparableIds.length).toBeGreaterThan(0);
    expect(Array.isArray(snapshot?.reasons)).toBe(true);
  });

  it('does not store a full copy of the comparables', () => {
    const positioning = calculatePricePositioning({
      comparables: [comp('a', 5000), comp('b', 6000), comp('c', 7000)],
      sellerProperty: { surfaceArea: 50 },
    });
    const snapshot = buildPositioningSnapshot(positioning)!;
    // Only ids are stored, never the comparable objects.
    expect(snapshot.influentialComparableIds.every((id) => typeof id === 'string')).toBe(true);
    expect(Object.keys(snapshot).sort()).toEqual(
      [
        'confidenceLevel',
        'confidenceScore',
        'dispersion',
        'engineVersion',
        'excludedOutlierCount',
        'influentialComparableIds',
        'outlierCount',
        'outliersReintroduced',
        'reasons',
        'totalEligible',
        'usedCount',
        'widthPercentage',
      ].sort(),
    );
  });

  it('returns null when the positioning is not ready', () => {
    const positioning = calculatePricePositioning({
      comparables: [],
      sellerProperty: { surfaceArea: null },
    });
    expect(buildPositioningSnapshot(positioning)).toBeNull();
  });
});
