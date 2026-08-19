import { describe, expect, it } from 'vitest';

import { buildComparableWarnings } from '@/features/comparables/services/build-comparable-warnings';
import { calculateComparableSummary } from '@/features/comparables/services/calculate-comparable-summary';
import type { Comparable } from '@/features/comparables/types';

function makeComparable(overrides: Partial<Comparable> = {}): Comparable {
  return {
    id: overrides.id ?? Math.random().toString(36).slice(2),
    agency_id: 'agency',
    project_id: 'project',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    display_order: 0,
    is_selected: true,
    title: 'Bien',
    address: null,
    postal_code: null,
    city: null,
    district: null,
    surface_area: 50,
    land_area: null,
    rooms_count: null,
    bedrooms_count: null,
    bathrooms_count: null,
    energy_rating: null,
    ges_rating: null,
    construction_year: null,
    heating_type: null,
    energy_source: null,
    source: null,
    listing_published_at: null,
    listing_url: null,
    listing_description: null,
    listing_features: [],
    photo_urls: ['https://example.com/a.jpg'],
    portal_price_per_square_meter: null,
    price: 250000,
    days_on_market: null,
    price_drop_amount: null,
    price_drop_percentage: null,
    advisor_notes: null,
    general_condition: null,
    exposure: null,
    outdoor_spaces: [],
    parking_types: [],
    ...overrides,
  };
}

// Convenience: run the full pipeline (calculate → build) and return warning types.
function warningTypesOf(comparables: Comparable[]): string[] {
  return calculateComparableSummary(comparables).warnings.map((warning) => warning.type);
}

describe('buildComparableWarnings — comparable count', () => {
  it('warns when fewer than 3 comparables are retained', () => {
    const types = warningTypesOf([makeComparable(), makeComparable()]);
    expect(types).toContain('too_few_comparables');
  });

  it('does not warn on count for 3 to 8 comparables', () => {
    const types = warningTypesOf(Array.from({ length: 5 }, () => makeComparable()));
    expect(types).not.toContain('too_few_comparables');
    expect(types).not.toContain('too_many_comparables');
  });

  it('warns when more than 8 comparables are retained', () => {
    const types = warningTypesOf(Array.from({ length: 9 }, () => makeComparable()));
    expect(types).toContain('too_many_comparables');
  });
});

describe('buildComparableWarnings — price dispersion', () => {
  it('warns when the price/m² spread exceeds 30% of the median', () => {
    // €/m²: 4000, 5000, 7000 → (7000-4000)/5000 = 0.6 > 0.30
    const comparables = [
      makeComparable({ price: 200000, surface_area: 50 }),
      makeComparable({ price: 250000, surface_area: 50 }),
      makeComparable({ price: 350000, surface_area: 50 }),
    ];
    expect(warningTypesOf(comparables)).toContain('high_price_dispersion');
  });

  it('does not warn when the dispersion is within 30%', () => {
    // €/m²: 5000, 5200, 5400 → (5400-5000)/5200 ≈ 0.077
    const comparables = [
      makeComparable({ price: 250000, surface_area: 50 }),
      makeComparable({ price: 260000, surface_area: 50 }),
      makeComparable({ price: 270000, surface_area: 50 }),
    ];
    expect(warningTypesOf(comparables)).not.toContain('high_price_dispersion');
  });
});

describe('buildComparableWarnings — incomplete comparables', () => {
  it('warns for a retained comparable without a price', () => {
    const warnings = calculateComparableSummary([makeComparable({ price: 0 })]).warnings;
    const incomplete = warnings.find((warning) => warning.type === 'incomplete_comparable');
    expect(incomplete?.message).toContain('prix');
  });

  it('warns for a retained comparable without a surface', () => {
    const warnings = calculateComparableSummary([makeComparable({ surface_area: null })]).warnings;
    const incomplete = warnings.find((warning) => warning.type === 'incomplete_comparable');
    expect(incomplete?.message).toContain('surface');
  });

  it('warns for a retained comparable without a photo', () => {
    const warnings = calculateComparableSummary([makeComparable({ photo_urls: [] })]).warnings;
    const incomplete = warnings.find((warning) => warning.type === 'incomplete_comparable');
    expect(incomplete?.message).toContain('photo');
  });

  it('does not warn for a complete comparable', () => {
    const warnings = calculateComparableSummary([
      makeComparable({ price: 250000, surface_area: 50, photo_urls: ['https://x/a.jpg'] }),
    ]).warnings;
    expect(warnings.some((warning) => warning.type === 'incomplete_comparable')).toBe(false);
  });

  it('attaches the comparable id to the incomplete warning', () => {
    const warnings = calculateComparableSummary([makeComparable({ id: 'c-1', price: 0 })]).warnings;
    const incomplete = warnings.find((warning) => warning.type === 'incomplete_comparable');
    expect(incomplete?.comparableId).toBe('c-1');
  });
});

describe('buildComparableWarnings — direct call', () => {
  it('is a pure function usable without the summary service', () => {
    const selected = [makeComparable(), makeComparable()];
    const warnings = buildComparableWarnings(selected, [5000, 5000], 5000);
    expect(warnings.map((warning) => warning.type)).toContain('too_few_comparables');
  });
});
