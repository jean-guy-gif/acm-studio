import { describe, expect, it } from 'vitest';

import { calculateComparableAnalysis } from '@/features/comparable-analysis/services/calculate-comparable-analysis';
import { makeComparable } from '@/features/comparable-analysis/services/test-helpers';
import { calculateComparableSummary } from '@/features/comparables/services/calculate-comparable-summary';

describe('calculateComparableAnalysis — statistics', () => {
  const comparables = [
    makeComparable({ price: 200000, surface_area: 40 }), // 5000 €/m²
    makeComparable({ price: 300000, surface_area: 50 }), // 6000 €/m²
    makeComparable({ price: 400000, surface_area: 50 }), // 8000 €/m²
  ];

  it('computes count, mean, median, minimum and maximum', () => {
    const { statistics } = calculateComparableAnalysis(comparables, null);
    expect(statistics.count).toBe(3);
    expect(statistics.averagePrice).toBe(300000);
    expect(statistics.medianPrice).toBe(300000);
    expect(statistics.minimumPrice).toBe(200000);
    expect(statistics.maximumPrice).toBe(400000);
  });

  it('computes price/m² and surface statistics (incl. median surface)', () => {
    const { statistics } = calculateComparableAnalysis(comparables, null);
    expect(statistics.averagePricePerSquareMeter).toBe(6333); // round(19000/3)
    expect(statistics.medianPricePerSquareMeter).toBe(6000);
    expect(statistics.averageSurfaceArea).toBe(46.7); // round1(140/3)
    expect(statistics.medianSurfaceArea).toBe(50);
  });

  it('reuses the Mission 15 summary (no divergent recomputation)', () => {
    const analysis = calculateComparableAnalysis(comparables, null);
    const summary = calculateComparableSummary(comparables);
    expect(analysis.statistics.averagePrice).toBe(summary.averagePrice);
    expect(analysis.statistics.medianPrice).toBe(summary.medianPrice);
    expect(analysis.statistics.averagePricePerSquareMeter).toBe(summary.averagePricePerSquareMeter);
    expect(analysis.statistics.medianPricePerSquareMeter).toBe(summary.medianPricePerSquareMeter);
  });
});

describe('calculateComparableAnalysis — empty and incomplete data', () => {
  it('returns a safe empty analysis when there is no data', () => {
    const analysis = calculateComparableAnalysis([], null);
    expect(analysis.statistics.count).toBe(0);
    expect(analysis.statistics.averagePrice).toBeNull();
    expect(analysis.statistics.medianSurfaceArea).toBeNull();
    expect(analysis.priceAnalysis.cheapest).toBeNull();
    expect(analysis.surfaceAnalysis.largest).toBeNull();
    expect(analysis.outliers).toEqual([]);
    expect(analysis.priceAnalysis.dispersion).toBeNull();
  });

  it('ignores rejected comparables and those without price or surface', () => {
    const analysis = calculateComparableAnalysis(
      [
        makeComparable({ price: 300000, surface_area: 50, is_selected: true }),
        makeComparable({ price: 999999, surface_area: 10, is_selected: false }), // rejected
        makeComparable({ price: 0, surface_area: 50 }), // no price
        makeComparable({ price: 300000, surface_area: null }), // no surface
      ],
      null,
    );
    expect(analysis.statistics.count).toBe(1);
    expect(analysis.statistics.averagePrice).toBe(300000);
  });
});

describe('calculateComparableAnalysis — seller positioning', () => {
  it('is empty when the seller surface is unknown', () => {
    const { sellerComparison } = calculateComparableAnalysis([makeComparable()], null);
    expect(sellerComparison.hasSellerSurface).toBe(false);
    expect(sellerComparison.smallerCount).toBe(0);
    expect(sellerComparison.largerCount).toBe(0);
  });

  it('counts smaller/larger and average/median surface difference', () => {
    const analysis = calculateComparableAnalysis(
      [
        makeComparable({ surface_area: 40, price: 200000 }),
        makeComparable({ surface_area: 60, price: 300000 }),
        makeComparable({ surface_area: 70, price: 350000 }),
      ],
      50, // seller surface
    );
    const s = analysis.sellerComparison;
    expect(s.hasSellerSurface).toBe(true);
    expect(s.smallerCount).toBe(1); // 40 < 50
    expect(s.largerCount).toBe(2); // 60, 70 > 50
    expect(s.averageSurfaceDifference).toBe(6.7); // round1(((-10)+10+20)/3)
    expect(s.medianSurfaceDifference).toBe(10); // deltas -10,10,20 → median 10
  });
});

describe('calculateComparableAnalysis — price and surface analysis', () => {
  const comparables = [
    makeComparable({ id: 'cheap', price: 200000, surface_area: 40 }),
    makeComparable({ id: 'mid', price: 300000, surface_area: 50 }),
    makeComparable({ id: 'exp', price: 400000, surface_area: 50 }),
  ];

  it('identifies cheapest, most expensive and price dispersion', () => {
    const { priceAnalysis } = calculateComparableAnalysis(comparables, null);
    expect(priceAnalysis.cheapest?.id).toBe('cheap');
    expect(priceAnalysis.mostExpensive?.id).toBe('exp');
    expect(priceAnalysis.priceRange).toBe(200000);
    // €/m² 5000/6000/8000, median 6000 → spread 50% → forte
    expect(priceAnalysis.dispersion).toBe('forte');
  });

  it('identifies smallest, largest and surfaces near the seller (±10%)', () => {
    const { surfaceAnalysis } = calculateComparableAnalysis(comparables, 50);
    expect(surfaceAnalysis.smallest?.surfaceArea).toBe(40);
    expect(surfaceAnalysis.largest?.surfaceArea).toBe(50);
    // near 50 ±10% => [45..55] => the two 50s, not the 40
    expect(surfaceAnalysis.nearSellerSurface.map((c) => c.surfaceArea)).toEqual([50, 50]);
  });

  it('reports low dispersion when values are close', () => {
    const tight = [
      makeComparable({ price: 250000, surface_area: 50 }), // 5000
      makeComparable({ price: 255000, surface_area: 50 }), // 5100
      makeComparable({ price: 260000, surface_area: 50 }), // 5200
    ];
    // median 5100, spread (5200-5000)/5100 ≈ 3.9% → faible
    expect(calculateComparableAnalysis(tight, null).priceAnalysis.dispersion).toBe('faible');
  });
});

describe('calculateComparableAnalysis — DPE and GES distribution', () => {
  it('counts every class when all are present', () => {
    const comparables = (['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const).map((rating) =>
      makeComparable({ energy_rating: rating, ges_rating: rating }),
    );
    const { dpeAnalysis, gesAnalysis } = calculateComparableAnalysis(comparables, null);
    for (const rating of ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const) {
      expect(dpeAnalysis.distribution[rating]).toBe(1);
      expect(gesAnalysis.distribution[rating]).toBe(1);
    }
    expect(dpeAnalysis.unknown).toBe(0);
    expect(dpeAnalysis.total).toBe(7);
  });

  it('counts unknown when no rating is present', () => {
    const comparables = [makeComparable({ energy_rating: null, ges_rating: null })];
    const { dpeAnalysis, gesAnalysis } = calculateComparableAnalysis(comparables, null);
    expect(dpeAnalysis.unknown).toBe(1);
    expect(Object.values(dpeAnalysis.distribution).every((n) => n === 0)).toBe(true);
    expect(gesAnalysis.unknown).toBe(1);
  });

  it('normalises lowercase and space-padded classes (trim + uppercase)', () => {
    const comparables = [
      makeComparable({ energy_rating: 'c', ges_rating: ' d ' }),
      makeComparable({ energy_rating: ' C ', ges_rating: 'D' }),
    ];
    const { dpeAnalysis, gesAnalysis } = calculateComparableAnalysis(comparables, null);
    expect(dpeAnalysis.distribution.C).toBe(2);
    expect(gesAnalysis.distribution.D).toBe(2);
    expect(dpeAnalysis.unknown).toBe(0);
    expect(gesAnalysis.unknown).toBe(0);
  });

  it('ignores invalid energy classes (counted as unknown)', () => {
    const comparables = [
      makeComparable({ energy_rating: 'H', ges_rating: 'Z' }),
      makeComparable({ energy_rating: '3', ges_rating: 'AA' }),
    ];
    const { dpeAnalysis, gesAnalysis } = calculateComparableAnalysis(comparables, null);
    expect(Object.values(dpeAnalysis.distribution).every((n) => n === 0)).toBe(true);
    expect(dpeAnalysis.unknown).toBe(2);
    expect(gesAnalysis.unknown).toBe(2);
  });
});

describe('calculateComparableAnalysis — location and features', () => {
  it('counts one city', () => {
    const analysis = calculateComparableAnalysis(
      [makeComparable({ city: 'Antibes' }), makeComparable({ city: 'Antibes' })],
      null,
    );
    expect(analysis.locationAnalysis.byCity).toEqual([{ label: 'Antibes', count: 2 }]);
  });

  it('counts several cities and districts, and sources', () => {
    const analysis = calculateComparableAnalysis(
      [
        makeComparable({ city: 'Antibes', district: 'Estagnol', listing_url: 'https://x/1' }),
        makeComparable({ city: 'Nice', district: 'Musiciens', listing_url: null }),
        makeComparable({ city: 'Nice', district: 'Cimiez', listing_url: 'https://x/2' }),
      ],
      null,
    );
    expect(analysis.locationAnalysis.byCity).toEqual([
      { label: 'Nice', count: 2 },
      { label: 'Antibes', count: 1 },
    ]);
    expect(analysis.locationAnalysis.byDistrict.length).toBe(3);
    expect(analysis.locationAnalysis.sources).toEqual({ manual: 1, url: 2 });
  });

  it('counts feature frequency and ignores absent features', () => {
    const analysis = calculateComparableAnalysis(
      [
        makeComparable({ listing_features: ['Terrasse', 'Garage'] }),
        makeComparable({ listing_features: ['Terrasse'] }),
        makeComparable({ listing_features: [] }),
      ],
      null,
    );
    expect(analysis.featureAnalysis.total).toBe(3);
    expect(analysis.featureAnalysis.features).toEqual([
      { label: 'Terrasse', count: 2 },
      { label: 'Garage', count: 1 },
    ]);
  });
});
