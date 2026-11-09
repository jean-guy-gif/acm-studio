import { describe, expect, it } from 'vitest';

import { buildPriceReveal } from '@/features/live-seller/services/build-price-reveal';
import { storedFieldsPriceHistoryProvider } from '@/features/live-seller/services/price-history-provider';

describe('buildPriceReveal', () => {
  it('computes price/m² and relative position (the guess gap is guessGap, M148)', () => {
    const reveal = buildPriceReveal({
      price: 465000,
      surfaceArea: 80,
      sellerEstimate: 430000,
      retainedPricesPerSquareMeter: [5000, 5813, 6000],
      thisPricePerSquareMeter: 5813,
    });
    expect(reveal.pricePerSquareMeter).toBe(5813);
    expect(reveal.relativePosition).toEqual({ rank: 2, total: 3 });
  });

  it('handles a missing seller estimate and a zero surface without NaN', () => {
    const reveal = buildPriceReveal({
      price: 400000,
      surfaceArea: 0,
      sellerEstimate: null,
      retainedPricesPerSquareMeter: [],
      thisPricePerSquareMeter: null,
    });
    expect(reveal.pricePerSquareMeter).toBeNull();
    expect(reveal.relativePosition).toBeNull();
  });
});

describe('storedFieldsPriceHistoryProvider', () => {
  it('derives a minimal history only from a real price drop', () => {
    const history = storedFieldsPriceHistoryProvider.getPriceHistory({
      currentPrice: 450000,
      priceDropAmount: 20000,
      priceDropPercentage: 4.2,
      source: 'SeLoger',
      daysOnMarket: 90,
    });
    expect(history.available).toBe(true);
    expect(history.initialPrice).toBe(470000);
    expect(history.currentPrice).toBe(450000);
    expect(history.totalDropAmount).toBe(20000);
  });

  it('reports unavailable history when no drop is stored', () => {
    const history = storedFieldsPriceHistoryProvider.getPriceHistory({
      currentPrice: 450000,
      priceDropAmount: null,
      priceDropPercentage: null,
      source: null,
      daysOnMarket: null,
    });
    expect(history.available).toBe(false);
    expect(history.entries).toEqual([]);
  });

  it('uses days_on_market for duration and never invents a date', () => {
    const duration = storedFieldsPriceHistoryProvider.getMarketDuration(
      {
        currentPrice: 1,
        priceDropAmount: null,
        priceDropPercentage: null,
        source: null,
        daysOnMarket: 120,
      },
      '2026-07-24T00:00:00Z',
    );
    expect(duration.available).toBe(true);
    expect(duration.days).toBe(120);
    expect(duration.firstSeenAt).toBeNull();
    expect(duration.label).toBe('Observé sur le marché depuis 120 jours');
  });

  it('reports unavailable duration when nothing is known', () => {
    const duration = storedFieldsPriceHistoryProvider.getMarketDuration(
      {
        currentPrice: 1,
        priceDropAmount: null,
        priceDropPercentage: null,
        source: null,
        daysOnMarket: null,
      },
      '2026-07-24T00:00:00Z',
    );
    expect(duration.available).toBe(false);
    expect(duration.label).toBeNull();
  });
});
