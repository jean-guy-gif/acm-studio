import type { MarketDuration, PriceHistory } from '@/features/live-seller/types';

// Future-proof abstraction for price history + market duration. No Castorus / no
// scraping here: the default provider derives ONLY from fields already stored on
// the comparable. A real provider (V2) can implement the same interface without
// touching callers. Nothing is invented — absent data yields `available: false`.

export type PriceHistorySource = {
  currentPrice: number;
  priceDropAmount: number | null;
  priceDropPercentage: number | null;
  source: string | null;
  daysOnMarket: number | null;
  // Not stored today; reserved for a real provider. Never fabricated.
  firstSeenAt?: string | null;
};

export type PriceHistoryProvider = {
  getPriceHistory(source: PriceHistorySource): PriceHistory;
  getMarketDuration(source: PriceHistorySource, generatedAt: string): MarketDuration;
};

const UNAVAILABLE_HISTORY: PriceHistory = {
  available: false,
  initialPrice: null,
  currentPrice: null,
  dropCount: null,
  totalDropAmount: null,
  totalDropPercentage: null,
  source: null,
  entries: [],
};

function daysBetween(fromIso: string, toIso: string): number | null {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) {
    return null;
  }
  return Math.max(0, Math.floor((to - from) / 86_400_000));
}

// Default provider: only the stored drop fields are trustworthy today.
export const storedFieldsPriceHistoryProvider: PriceHistoryProvider = {
  getPriceHistory(source) {
    const drop = source.priceDropAmount;
    if (drop == null || drop <= 0) {
      return UNAVAILABLE_HISTORY;
    }
    return {
      available: true,
      currentPrice: source.currentPrice,
      initialPrice: source.currentPrice + drop,
      dropCount: null, // unknown without a dated series
      totalDropAmount: drop,
      totalDropPercentage: source.priceDropPercentage,
      source: source.source,
      entries: [], // no dated entries available without a real provider
    };
  },

  getMarketDuration(source, generatedAt) {
    // Prefer a real first-seen date when a provider supplies one; otherwise fall
    // back to the stored `days_on_market` (a real, advisor-entered field).
    if (source.firstSeenAt) {
      const days = daysBetween(source.firstSeenAt, generatedAt);
      if (days != null) {
        return {
          available: true,
          days,
          firstSeenAt: source.firstSeenAt,
          label: `Observé sur le marché depuis ${days} jours`,
        };
      }
    }
    if (source.daysOnMarket != null && source.daysOnMarket >= 0) {
      return {
        available: true,
        days: source.daysOnMarket,
        firstSeenAt: null,
        label: `Observé sur le marché depuis ${source.daysOnMarket} jours`,
      };
    }
    return { available: false, days: null, firstSeenAt: null, label: null };
  },
};
