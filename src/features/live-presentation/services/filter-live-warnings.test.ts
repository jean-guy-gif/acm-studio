import { describe, expect, it } from 'vitest';

import { filterLiveWarnings } from '@/features/live-presentation/services/filter-live-warnings';
import type { SellerPresentationWarning } from '@/features/seller-presentation/types/seller-presentation';

function w(
  code: string,
  severity: SellerPresentationWarning['severity'],
): SellerPresentationWarning {
  return { code, severity, message: code };
}

describe('filterLiveWarnings', () => {
  it('keeps only the business codes useful during the meeting', () => {
    const result = filterLiveWarnings([
      w('few_comparables', 'warning'),
      w('high_dispersion', 'info'),
      w('low_confidence', 'info'),
      w('decision_outdated', 'warning'),
      w('outliers_reintroduced', 'info'),
      w('seller_price_missing', 'warning'),
    ]);
    expect(result.map((r) => r.code)).toEqual([
      'few_comparables',
      'high_dispersion',
      'low_confidence',
      'decision_outdated',
      'outliers_reintroduced',
      'seller_price_missing',
    ]);
  });

  it('excludes internal / technical / preparation alerts', () => {
    const result = filterLiveWarnings([
      w('no_property', 'blocking'),
      w('no_seller_surface', 'blocking'),
      w('no_comparable', 'blocking'),
      w('positioning_unavailable', 'blocking'),
      w('decision_not_saved', 'warning'),
      w('property_incomplete', 'warning'),
      w('property_no_photo', 'warning'),
      w('comparables_no_photo', 'warning'),
      w('outliers_excluded', 'info'),
    ]);
    expect(result).toEqual([]);
  });

  it('preserves the input order and de-duplicates by code', () => {
    const result = filterLiveWarnings([
      w('decision_outdated', 'warning'),
      w('few_comparables', 'warning'),
      w('decision_outdated', 'warning'), // duplicate
      w('property_incomplete', 'warning'), // excluded
    ]);
    expect(result.map((r) => r.code)).toEqual(['decision_outdated', 'few_comparables']);
  });

  it('returns an empty list for an empty input', () => {
    expect(filterLiveWarnings([])).toEqual([]);
  });
});
