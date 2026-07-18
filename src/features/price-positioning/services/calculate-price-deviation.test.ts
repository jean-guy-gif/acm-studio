import { describe, expect, it } from 'vitest';

import {
  calculatePriceDeviation,
  resolveMarketPosition,
} from '@/features/price-positioning/services/calculate-price-deviation';

describe('calculatePriceDeviation', () => {
  it('computes absolute and percentage deviation', () => {
    expect(calculatePriceDeviation(330000, 300000)).toEqual({ absolute: 30000, percentage: 10 });
    expect(calculatePriceDeviation(270000, 300000)).toEqual({ absolute: -30000, percentage: -10 });
  });

  it('rounds the percentage to one decimal', () => {
    expect(calculatePriceDeviation(310000, 300000)?.percentage).toBe(3.3);
  });

  it('returns null when either operand is missing or non-finite', () => {
    expect(calculatePriceDeviation(null, 300000)).toBeNull();
    expect(calculatePriceDeviation(300000, null)).toBeNull();
    expect(calculatePriceDeviation(300000, undefined)).toBeNull();
    expect(calculatePriceDeviation(Number.NaN, 300000)).toBeNull();
  });

  it('returns a null percentage (never Infinity) when the reference is zero', () => {
    const result = calculatePriceDeviation(300000, 0);
    expect(result).toEqual({ absolute: 300000, percentage: null });
    expect(Number.isFinite(result?.absolute)).toBe(true);
  });
});

describe('resolveMarketPosition', () => {
  it('classifies below / within / above the range (bounds included)', () => {
    expect(resolveMarketPosition(240000, 250000, 350000)).toBe('below_observed_market');
    expect(resolveMarketPosition(250000, 250000, 350000)).toBe('within_observed_market');
    expect(resolveMarketPosition(300000, 250000, 350000)).toBe('within_observed_market');
    expect(resolveMarketPosition(350000, 250000, 350000)).toBe('within_observed_market');
    expect(resolveMarketPosition(360000, 250000, 350000)).toBe('above_observed_market');
  });

  it('returns null for a missing or non-finite price', () => {
    expect(resolveMarketPosition(null, 1, 2)).toBeNull();
    expect(resolveMarketPosition(Number.POSITIVE_INFINITY, 1, 2)).toBeNull();
  });
});
