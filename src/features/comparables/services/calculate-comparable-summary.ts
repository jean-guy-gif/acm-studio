import { buildComparableWarnings } from '@/features/comparables/services/build-comparable-warnings';
import type { Comparable } from '@/features/comparables/types';
import type { ComparableSelectionSummary } from '@/features/comparables/types/comparable-selection-summary';

// ACM's own price/m². Null unless BOTH price and surface are strictly positive.
export function pricePerSquareMeter(
  price: number | null,
  surfaceArea: number | null,
): number | null {
  if (price != null && price > 0 && surfaceArea != null && surfaceArea > 0) {
    return Math.round(price / surfaceArea);
  }
  return null;
}

// Exact arithmetic mean, or null for an empty list.
export function mean(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sum = values.reduce((total, value) => total + value, 0);
  return sum / values.length;
}

// Pure median: middle value (odd count) or mean of the two middle values (even
// count). Null for an empty list. Does not mutate the input.
export function median(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

// Surface comparison against the subject property. Null when the subject surface
// is unknown (nothing must be shown then) or the comparable surface is unknown.
export function surfaceComparison(
  comparableSurface: number | null,
  subjectSurface: number | null,
): { deltaSquareMeters: number; deltaPercent: number } | null {
  if (subjectSurface == null || subjectSurface <= 0 || comparableSurface == null) {
    return null;
  }
  const deltaSquareMeters = comparableSurface - subjectSurface;
  const deltaPercent = (deltaSquareMeters / subjectSurface) * 100;
  return { deltaSquareMeters, deltaPercent };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

// Deterministic summary of the RETAINED comparables. Invalid data (null/zero
// price or surface) is ignored per metric. Reusable as-is in the Live module.
export function calculateComparableSummary(comparables: Comparable[]): ComparableSelectionSummary {
  const selected = comparables.filter((comparable) => comparable.is_selected);

  const prices = selected
    .map((comparable) => comparable.price)
    .filter((price): price is number => typeof price === 'number' && price > 0);

  const surfaces = selected
    .map((comparable) => comparable.surface_area)
    .filter((surface): surface is number => typeof surface === 'number' && surface > 0);

  const pricesPerSquareMeter = selected
    .map((comparable) => pricePerSquareMeter(comparable.price, comparable.surface_area))
    .filter((value): value is number => value != null);

  const averagePrice = mean(prices);
  const averagePricePerSquareMeter = mean(pricesPerSquareMeter);
  const averageSurfaceArea = mean(surfaces);
  const medianPricePerSquareMeter = median(pricesPerSquareMeter);

  const warnings = buildComparableWarnings(
    selected,
    pricesPerSquareMeter,
    medianPricePerSquareMeter,
  );

  return {
    selectedCount: selected.length,
    averagePrice: averagePrice == null ? null : Math.round(averagePrice),
    medianPrice: median(prices),
    averagePricePerSquareMeter:
      averagePricePerSquareMeter == null ? null : Math.round(averagePricePerSquareMeter),
    medianPricePerSquareMeter,
    averageSurfaceArea: averageSurfaceArea == null ? null : round1(averageSurfaceArea),
    minimumPrice: prices.length > 0 ? Math.min(...prices) : null,
    maximumPrice: prices.length > 0 ? Math.max(...prices) : null,
    warnings,
  };
}
