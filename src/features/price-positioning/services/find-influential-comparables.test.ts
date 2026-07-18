import { describe, expect, it } from 'vitest';

import { makeComparable } from '@/features/comparable-analysis/services/test-helpers';
import { findInfluentialComparables } from '@/features/price-positioning/services/find-influential-comparables';

describe('findInfluentialComparables', () => {
  it('returns at most three, closest first', () => {
    const official = [
      makeComparable({ id: 'far', price: 400000, surface_area: 100 }), // 4000 €/m², surface far
      makeComparable({ id: 'near', price: 300000, surface_area: 50 }), // 6000 €/m², surface exact
      makeComparable({ id: 'mid', price: 330000, surface_area: 60 }), // 5500 €/m²
      makeComparable({ id: 'mid2', price: 315000, surface_area: 55 }), // ~5727 €/m²
    ];
    const result = findInfluentialComparables(official, 50, 6000);
    expect(result).toHaveLength(3);
    expect(result[0].comparableId).toBe('near'); // exact surface + on the median
  });

  it('returns fewer than three when fewer are available', () => {
    const official = [makeComparable({ id: 'a', price: 300000, surface_area: 50 })];
    expect(findInfluentialComparables(official, 50, 6000)).toHaveLength(1);
  });

  it('ranks by surface proximity when price/m² is equal', () => {
    const official = [
      makeComparable({ id: 'surface-far', price: 360000, surface_area: 60 }), // 6000 €/m²
      makeComparable({ id: 'surface-near', price: 300000, surface_area: 50 }), // 6000 €/m²
    ];
    const result = findInfluentialComparables(official, 50, 6000);
    expect(result[0].comparableId).toBe('surface-near');
  });

  it('ranks by price/m² proximity when surface is equal', () => {
    const official = [
      makeComparable({ id: 'price-far', price: 400000, surface_area: 50 }), // 8000 €/m²
      makeComparable({ id: 'price-near', price: 305000, surface_area: 50 }), // 6100 €/m²
    ];
    const result = findInfluentialComparables(official, 50, 6000);
    expect(result[0].comparableId).toBe('price-near');
  });

  it('breaks ties deterministically (display_order then id)', () => {
    // Two identical comparables → same score; display_order decides.
    const official = [
      makeComparable({ id: 'b', price: 300000, surface_area: 50, display_order: 2 }),
      makeComparable({ id: 'a', price: 300000, surface_area: 50, display_order: 1 }),
    ];
    const result = findInfluentialComparables(official, 50, 6000);
    expect(result.map((entry) => entry.comparableId)).toEqual(['a', 'b']);
  });

  it('exposes deterministic proximity and deviation percentages (no NaN)', () => {
    const official = [makeComparable({ id: 'a', price: 330000, surface_area: 55 })]; // 6000 €/m²
    const [entry] = findInfluentialComparables(official, 50, 6000);
    expect(entry.surfaceDeviationPercentage).toBe(10); // |55-50|/50
    expect(entry.pricePerSquareMeterDeviationPercentage).toBe(0); // 6000 vs 6000
    expect(Number.isFinite(entry.proximityScore)).toBe(true);
  });
});
