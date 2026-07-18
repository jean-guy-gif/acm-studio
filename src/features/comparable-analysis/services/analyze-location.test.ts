import { describe, expect, it } from 'vitest';

import { analyzeLocation } from '@/features/comparable-analysis/services/analyze-location';
import { makeComparable } from '@/features/comparable-analysis/services/test-helpers';

describe('analyzeLocation', () => {
  it('counts a single city', () => {
    const result = analyzeLocation([
      makeComparable({ city: 'Antibes' }),
      makeComparable({ city: 'Antibes' }),
    ]);
    expect(result.byCity).toEqual([{ label: 'Antibes', count: 2 }]);
  });

  it('counts several cities and several districts', () => {
    const result = analyzeLocation([
      makeComparable({ city: 'Nice', district: 'Musiciens' }),
      makeComparable({ city: 'Nice', district: 'Cimiez' }),
      makeComparable({ city: 'Antibes', district: 'Estagnol' }),
    ]);
    expect(result.byCity).toEqual([
      { label: 'Nice', count: 2 },
      { label: 'Antibes', count: 1 },
    ]);
    expect(result.byDistrict).toHaveLength(3);
  });

  it('ignores empty city and district labels', () => {
    const result = analyzeLocation([
      makeComparable({ city: null, district: '  ' }),
      makeComparable({ city: 'Nice', district: null }),
    ]);
    expect(result.byCity).toEqual([{ label: 'Nice', count: 1 }]);
    expect(result.byDistrict).toEqual([]);
  });

  it('splits sources between manual and URL import', () => {
    const result = analyzeLocation([
      makeComparable({ listing_url: 'https://x/1' }),
      makeComparable({ listing_url: '   ' }),
      makeComparable({ listing_url: null }),
    ]);
    expect(result.sources).toEqual({ manual: 2, url: 1 });
  });

  it('groups "Antibes", "ANTIBES" and " antibes " into a single city', () => {
    const result = analyzeLocation([
      makeComparable({ city: 'Antibes' }),
      makeComparable({ city: 'ANTIBES' }),
      makeComparable({ city: ' antibes ' }),
    ]);
    expect(result.byCity).toEqual([{ label: 'Antibes', count: 3 }]);
  });

  it('groups districts differing only by case or accents', () => {
    const result = analyzeLocation([
      makeComparable({ district: "L'Estagnol" }),
      makeComparable({ district: "l'estagnol" }),
      makeComparable({ district: "L'ESTAGNOL" }),
    ]);
    expect(result.byDistrict).toEqual([{ label: "L'Estagnol", count: 3 }]);
  });
});
