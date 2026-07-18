import { describe, expect, it } from 'vitest';

import { comparePositioningFreshness } from '@/features/price-positioning/services/compare-positioning-snapshots';
import type { PositioningComparisonKey } from '@/features/price-positioning/types/saved-price-positioning';

function key(overrides: Partial<PositioningComparisonKey> = {}): PositioningComparisonKey {
  return {
    rangeLow: 270000,
    rangeCentral: 300000,
    rangeHigh: 330000,
    confidenceScore: 70,
    confidenceLevel: 'high',
    usedCount: 3,
    influentialComparableIds: ['a', 'b', 'c'],
    ...overrides,
  };
}

describe('comparePositioningFreshness', () => {
  it('is up_to_date for identical criteria', () => {
    expect(comparePositioningFreshness(key(), key())).toBe('up_to_date');
  });

  it('is outdated when a range bound differs', () => {
    expect(comparePositioningFreshness(key(), key({ rangeLow: 260000 }))).toBe('outdated');
    expect(comparePositioningFreshness(key(), key({ rangeCentral: 305000 }))).toBe('outdated');
    expect(comparePositioningFreshness(key(), key({ rangeHigh: 340000 }))).toBe('outdated');
  });

  it('is outdated when the confidence score or level differs', () => {
    expect(comparePositioningFreshness(key(), key({ confidenceScore: 65 }))).toBe('outdated');
    expect(comparePositioningFreshness(key(), key({ confidenceLevel: 'medium' }))).toBe('outdated');
  });

  it('is outdated when the used comparable count differs', () => {
    expect(comparePositioningFreshness(key(), key({ usedCount: 4 }))).toBe('outdated');
  });

  it('is outdated when the influential comparables differ', () => {
    expect(
      comparePositioningFreshness(key(), key({ influentialComparableIds: ['a', 'b', 'd'] })),
    ).toBe('outdated');
    expect(comparePositioningFreshness(key(), key({ influentialComparableIds: ['a', 'b'] }))).toBe(
      'outdated',
    );
  });

  it('ignores reason texts entirely (never part of the key)', () => {
    // The comparison key does not carry reasons, so two decisions differing only
    // by reason text produce identical keys → up_to_date.
    expect(comparePositioningFreshness(key(), key())).toBe('up_to_date');
  });
});
