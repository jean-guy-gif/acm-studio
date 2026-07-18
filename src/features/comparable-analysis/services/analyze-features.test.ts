import { describe, expect, it } from 'vitest';

import { analyzeFeatures } from '@/features/comparable-analysis/services/analyze-features';
import { makeComparable } from '@/features/comparable-analysis/services/test-helpers';

describe('analyzeFeatures', () => {
  it('counts feature frequency, sorted by count then label', () => {
    const result = analyzeFeatures([
      makeComparable({ listing_features: ['Terrasse', 'Garage', 'Ascenseur'] }),
      makeComparable({ listing_features: ['Terrasse', 'Garage'] }),
      makeComparable({ listing_features: ['Terrasse'] }),
    ]);
    expect(result.total).toBe(3);
    expect(result.features).toEqual([
      { label: 'Terrasse', count: 3 },
      { label: 'Garage', count: 2 },
      { label: 'Ascenseur', count: 1 },
    ]);
  });

  it('returns no feature when none are present', () => {
    const result = analyzeFeatures([
      makeComparable({ listing_features: [] }),
      makeComparable({ listing_features: [] }),
    ]);
    expect(result.total).toBe(2);
    expect(result.features).toEqual([]);
  });

  it('de-duplicates a feature repeated within the same comparable', () => {
    const result = analyzeFeatures([
      makeComparable({ listing_features: ['Terrasse', 'Terrasse', ' Terrasse '] }),
    ]);
    expect(result.features).toEqual([{ label: 'Terrasse', count: 1 }]);
  });

  it('ignores non-array or non-string feature values', () => {
    const result = analyzeFeatures([
      makeComparable({ listing_features: 'not-an-array' as unknown as string[] }),
      makeComparable({ listing_features: [1, 2, ''] as unknown as string[] }),
    ]);
    expect(result.features).toEqual([]);
  });

  it('groups "Terrasse", "terrasse" and " TERRASSE " across comparables', () => {
    const result = analyzeFeatures([
      makeComparable({ listing_features: ['Terrasse'] }),
      makeComparable({ listing_features: ['terrasse'] }),
      makeComparable({ listing_features: [' TERRASSE '] }),
    ]);
    expect(result.features).toEqual([{ label: 'Terrasse', count: 3 }]);
  });

  it('groups labels differing only by accents or extra spaces', () => {
    const result = analyzeFeatures([
      makeComparable({ listing_features: ['Exposition Ouest'] }),
      makeComparable({ listing_features: ['exposition  ouest'] }),
      makeComparable({ listing_features: ['Éxposition Ouést'] }),
    ]);
    expect(result.features).toEqual([{ label: 'Exposition Ouest', count: 3 }]);
  });

  it('counts a comparable once even if it repeats the feature with variants', () => {
    const result = analyzeFeatures([
      makeComparable({ listing_features: ['Terrasse', 'terrasse', ' TERRASSE '] }),
    ]);
    expect(result.features).toEqual([{ label: 'Terrasse', count: 1 }]);
  });

  it('does not merge distinct business terms (garage vs parking)', () => {
    const result = analyzeFeatures([
      makeComparable({ listing_features: ['Garage'] }),
      makeComparable({ listing_features: ['Parking'] }),
    ]);
    expect(result.features.map((feature) => feature.label).sort()).toEqual(['Garage', 'Parking']);
  });
});
