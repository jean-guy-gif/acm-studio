import type { LivePriceGaps, PriceGap } from '@/features/live-seller/types';

// Pure. Compares three reference prices and returns euro + percentage gaps. No
// judgement, no automatic conclusion. Percentage is null when the reference is
// missing or zero (never NaN / Infinity).
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function gap(value: number | null, reference: number | null): PriceGap {
  if (value == null || reference == null) {
    return { amount: null, percentage: null };
  }
  const amount = Math.round(value - reference);
  const percentage = reference === 0 ? null : round1(((value - reference) / reference) * 100);
  return { amount, percentage };
}

export function calculateLivePriceGaps(input: {
  sellerPerceivedPrice: number | null;
  competitiveMarketCentral: number | null;
  advisorComparativePrice: number | null;
}): LivePriceGaps {
  const { sellerPerceivedPrice, competitiveMarketCentral, advisorComparativePrice } = input;
  return {
    sellerPerceivedPrice,
    competitiveMarketCentral,
    advisorComparativePrice,
    sellerVsMarket: gap(sellerPerceivedPrice, competitiveMarketCentral),
    sellerVsAdvisor: gap(sellerPerceivedPrice, advisorComparativePrice),
    marketVsAdvisor: gap(competitiveMarketCentral, advisorComparativePrice),
  };
}
