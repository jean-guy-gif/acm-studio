import { pricePerSquareMeter } from '@/features/comparables/services/calculate-comparable-summary';
import type { PriceReveal } from '@/features/live-seller/types';

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

// Pure. Builds the Page-2 reveal for a single comparable. The gap is relative to
// the seller's own estimate (never NaN); the relative position ranks this
// comparable among the retained set by price/m² (1 = cheapest).
export function buildPriceReveal(input: {
  price: number;
  surfaceArea: number | null;
  sellerEstimate: number | null;
  retainedPricesPerSquareMeter: number[]; // all retained (incl. this one), unsorted
  thisPricePerSquareMeter: number | null;
}): PriceReveal {
  const ppsm = pricePerSquareMeter(input.price, input.surfaceArea);
  const gapAmount =
    input.sellerEstimate == null ? null : Math.round(input.price - input.sellerEstimate);
  const gapPercentage =
    input.sellerEstimate == null || input.sellerEstimate === 0
      ? null
      : round1(((input.price - input.sellerEstimate) / input.sellerEstimate) * 100);

  let relativePosition: PriceReveal['relativePosition'] = null;
  const values = input.retainedPricesPerSquareMeter.filter((v) => Number.isFinite(v));
  if (input.thisPricePerSquareMeter != null && values.length > 0) {
    const sorted = [...values].sort((a, b) => a - b);
    const rank = sorted.filter((v) => v < (input.thisPricePerSquareMeter as number)).length + 1;
    relativePosition = { rank, total: values.length };
  }

  return {
    currentPrice: input.price,
    pricePerSquareMeter: ppsm,
    sellerEstimate: input.sellerEstimate,
    gapAmount,
    gapPercentage,
    relativePosition,
  };
}
