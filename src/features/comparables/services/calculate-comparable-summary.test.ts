import { describe, expect, it } from 'vitest';

import {
  calculateComparableSummary,
  mean,
  median,
  pricePerSquareMeter,
  surfaceComparison,
} from '@/features/comparables/services/calculate-comparable-summary';
import type { Comparable } from '@/features/comparables/types';

// Minimal Comparable factory — only the fields the summary reads matter.
function makeComparable(overrides: Partial<Comparable> = {}): Comparable {
  return {
    id: overrides.id ?? Math.random().toString(36).slice(2),
    agency_id: 'agency',
    project_id: 'project',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    display_order: 0,
    is_selected: true,
    title: null,
    address: null,
    postal_code: null,
    city: null,
    district: null,
    surface_area: null,
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
    photo_urls: [],
    portal_price_per_square_meter: null,
    price: 0,
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

describe('pricePerSquareMeter', () => {
  it('rounds price / surface when both are positive', () => {
    expect(pricePerSquareMeter(303000, 52)).toBe(5827);
  });
  it('returns null when price or surface is missing or zero', () => {
    expect(pricePerSquareMeter(0, 52)).toBeNull();
    expect(pricePerSquareMeter(300000, 0)).toBeNull();
    expect(pricePerSquareMeter(null, 52)).toBeNull();
    expect(pricePerSquareMeter(300000, null)).toBeNull();
  });
});

describe('mean', () => {
  it('returns null for an empty list', () => {
    expect(mean([])).toBeNull();
  });
  it('computes the exact average', () => {
    expect(mean([100, 200, 300])).toBe(200);
  });
});

describe('median', () => {
  it('returns null for an empty list', () => {
    expect(median([])).toBeNull();
  });
  it('returns the central value for an odd count', () => {
    expect(median([30, 10, 20])).toBe(20);
  });
  it('returns the mean of the two central values for an even count', () => {
    expect(median([10, 20, 30, 40])).toBe(25);
  });
  it('does not mutate the input array', () => {
    const input = [3, 1, 2];
    median(input);
    expect(input).toEqual([3, 1, 2]);
  });
});

describe('surfaceComparison', () => {
  it('returns null when the subject surface is unknown or zero', () => {
    expect(surfaceComparison(60, null)).toBeNull();
    expect(surfaceComparison(60, 0)).toBeNull();
  });
  it('returns null when the comparable surface is unknown', () => {
    expect(surfaceComparison(null, 50)).toBeNull();
  });
  it('computes the gap in m² and in %', () => {
    expect(surfaceComparison(60, 50)).toEqual({ deltaSquareMeters: 10, deltaPercent: 20 });
    expect(surfaceComparison(40, 50)).toEqual({ deltaSquareMeters: -10, deltaPercent: -20 });
  });
});

describe('calculateComparableSummary', () => {
  it('returns a fully null/zero summary for zero comparables', () => {
    const summary = calculateComparableSummary([]);
    expect(summary.selectedCount).toBe(0);
    expect(summary.averagePrice).toBeNull();
    expect(summary.medianPrice).toBeNull();
    expect(summary.averagePricePerSquareMeter).toBeNull();
    expect(summary.medianPricePerSquareMeter).toBeNull();
    expect(summary.averageSurfaceArea).toBeNull();
    expect(summary.minimumPrice).toBeNull();
    expect(summary.maximumPrice).toBeNull();
  });

  it('only counts retained comparables (ignores is_selected = false)', () => {
    const summary = calculateComparableSummary([
      makeComparable({ price: 300000, surface_area: 50, is_selected: true }),
      makeComparable({ price: 999999, surface_area: 10, is_selected: false }),
    ]);
    expect(summary.selectedCount).toBe(1);
    expect(summary.averagePrice).toBe(300000);
  });

  it('computes stats for a single comparable', () => {
    const summary = calculateComparableSummary([
      makeComparable({ price: 300000, surface_area: 60 }),
    ]);
    expect(summary.selectedCount).toBe(1);
    expect(summary.averagePrice).toBe(300000);
    expect(summary.medianPrice).toBe(300000);
    expect(summary.minimumPrice).toBe(300000);
    expect(summary.maximumPrice).toBe(300000);
    expect(summary.averageSurfaceArea).toBe(60);
    expect(summary.averagePricePerSquareMeter).toBe(5000);
    expect(summary.medianPricePerSquareMeter).toBe(5000);
  });

  it('ignores null/zero prices and surfaces per metric', () => {
    const summary = calculateComparableSummary([
      makeComparable({ price: 200000, surface_area: 40 }), // 5000 €/m²
      makeComparable({ price: 0, surface_area: 50 }), // no price → ignored in price stats
      makeComparable({ price: 400000, surface_area: 0 }), // no surface → no €/m²
    ]);
    // Prices used: 200000, 400000
    expect(summary.minimumPrice).toBe(200000);
    expect(summary.maximumPrice).toBe(400000);
    expect(summary.averagePrice).toBe(300000);
    // Surfaces used: 40 only (50 belongs to a zero-price row but surface is valid → included)
    expect(summary.averageSurfaceArea).toBe(45); // (40 + 50) / 2
    // €/m² used: only the first row (5000)
    expect(summary.averagePricePerSquareMeter).toBe(5000);
    expect(summary.medianPricePerSquareMeter).toBe(5000);
  });

  it('computes average and median price/m² across several comparables', () => {
    const summary = calculateComparableSummary([
      makeComparable({ price: 200000, surface_area: 40 }), // 5000
      makeComparable({ price: 300000, surface_area: 50 }), // 6000
      makeComparable({ price: 350000, surface_area: 50 }), // 7000
    ]);
    expect(summary.averagePricePerSquareMeter).toBe(6000);
    expect(summary.medianPricePerSquareMeter).toBe(6000);
    expect(summary.medianPrice).toBe(300000);
    expect(summary.averagePrice).toBe(283333); // round(850000/3)
  });
});
