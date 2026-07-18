import { describe, expect, it } from 'vitest';

import { detectOutliers } from '@/features/comparable-analysis/services/detect-outliers';
import type { AnalyzedComparable } from '@/features/comparable-analysis/types/comparable-analysis';

function analyzed(id: string, ppsm: number): AnalyzedComparable {
  return {
    id,
    title: id,
    city: null,
    price: ppsm * 50,
    surfaceArea: 50,
    pricePerSquareMeter: ppsm,
  };
}

describe('detectOutliers', () => {
  it('returns no outlier when every price/m² is within 20% of the median', () => {
    // median 6000; 5000 (-16.7%), 6000 (0%), 6900 (+15%)
    const result = detectOutliers(
      [analyzed('a', 5000), analyzed('b', 6000), analyzed('c', 6900)],
      6000,
    );
    expect(result).toEqual([]);
  });

  it('flags a single outlier beyond 20%', () => {
    // median 6000; 8000 is +33% → atypique
    const result = detectOutliers(
      [analyzed('a', 5000), analyzed('b', 6000), analyzed('c', 8000)],
      6000,
    );
    expect(result.map((o) => o.id)).toEqual(['c']);
    expect(result[0].deviationPercent).toBe(33);
  });

  it('flags several outliers (both directions)', () => {
    // median 6000; 4000 (-33%) and 9000 (+50%) are atypical, 6000 is not
    const result = detectOutliers(
      [analyzed('low', 4000), analyzed('mid', 6000), analyzed('high', 9000)],
      6000,
    );
    expect(result.map((o) => o.id).sort()).toEqual(['high', 'low']);
  });

  it('returns nothing when the median is unavailable', () => {
    expect(detectOutliers([analyzed('a', 5000)], null)).toEqual([]);
  });
});
