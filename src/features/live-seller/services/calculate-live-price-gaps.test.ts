import { describe, expect, it } from 'vitest';

import { calculateLivePriceGaps } from '@/features/live-seller/services/calculate-live-price-gaps';

describe('calculateLivePriceGaps', () => {
  it('computes the three gaps in euros and percentage', () => {
    const gaps = calculateLivePriceGaps({
      sellerPerceivedPrice: 435000,
      competitiveMarketCentral: 417000,
      advisorComparativePrice: 420000,
    });
    expect(gaps.sellerVsMarket).toEqual({ amount: 18000, percentage: 4.3 });
    expect(gaps.sellerVsAdvisor).toEqual({ amount: 15000, percentage: 3.6 });
    expect(gaps.marketVsAdvisor).toEqual({ amount: -3000, percentage: -0.7 });
  });

  it('returns null gaps when a value is missing', () => {
    const gaps = calculateLivePriceGaps({
      sellerPerceivedPrice: 435000,
      competitiveMarketCentral: null,
      advisorComparativePrice: null,
    });
    expect(gaps.sellerVsMarket).toEqual({ amount: null, percentage: null });
    expect(gaps.sellerVsAdvisor).toEqual({ amount: null, percentage: null });
    expect(gaps.marketVsAdvisor).toEqual({ amount: null, percentage: null });
  });

  it('guards division by zero (percentage null, amount still computed)', () => {
    const gaps = calculateLivePriceGaps({
      sellerPerceivedPrice: 435000,
      competitiveMarketCentral: 0,
      advisorComparativePrice: 0,
    });
    expect(gaps.sellerVsMarket).toEqual({ amount: 435000, percentage: null });
    expect(gaps.marketVsAdvisor).toEqual({ amount: 0, percentage: null });
  });

  it('carries the reference prices through unchanged', () => {
    const gaps = calculateLivePriceGaps({
      sellerPerceivedPrice: 1,
      competitiveMarketCentral: 2,
      advisorComparativePrice: 3,
    });
    expect(gaps.sellerPerceivedPrice).toBe(1);
    expect(gaps.competitiveMarketCentral).toBe(2);
    expect(gaps.advisorComparativePrice).toBe(3);
  });
});
