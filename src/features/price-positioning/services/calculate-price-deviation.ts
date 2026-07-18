import type {
  MarketPosition,
  PriceDeviation,
} from '@/features/price-positioning/types/price-positioning';

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

// Single shared deviation rule. Reusable by the client component for light
// recomputation when the advisor/seller price changes.
//
// absolute = value - reference
// percentage = ((value - reference) / reference) * 100, rounded to 1 decimal
//
// Returns null when either operand is missing/non-finite. Never produces NaN or
// Infinity: percentage is null when the reference is 0.
export function calculatePriceDeviation(
  value: number | null | undefined,
  reference: number | null | undefined,
): PriceDeviation | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  if (reference == null || !Number.isFinite(reference)) {
    return null;
  }
  const absolute = value - reference;
  const percentage = reference === 0 ? null : round1(((value - reference) / reference) * 100);
  return { absolute, percentage };
}

// Position of a price relative to the recommended range (bounds included).
export function resolveMarketPosition(
  price: number | null | undefined,
  low: number,
  high: number,
): MarketPosition | null {
  if (price == null || !Number.isFinite(price)) {
    return null;
  }
  if (price < low) {
    return 'below_observed_market';
  }
  if (price > high) {
    return 'above_observed_market';
  }
  return 'within_observed_market';
}
