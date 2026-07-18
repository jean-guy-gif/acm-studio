import { pricePerSquareMeter } from '@/features/comparables/services/calculate-comparable-summary';
import type { Comparable } from '@/features/comparables/types';
import type { InfluentialComparable } from '@/features/price-positioning/types/price-positioning';

const MAX_INFLUENTIAL = 3;

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

type Scored = InfluentialComparable & {
  surfaceDeviation: number;
  pricePerSquareMeterDeviation: number;
  displayOrder: number;
};

// Ranks the official comparables by proximity to the seller property. Proximity
// score = relative surface deviation + relative price/m² deviation (lower is
// closer). Deterministic tie-breaks: surface deviation, then price/m² deviation,
// then display_order, then id. Only the official set is considered. Called only
// by calculatePricePositioning().
export function findInfluentialComparables(
  official: Comparable[],
  sellerSurface: number,
  officialMedianPricePerSquareMeter: number,
): InfluentialComparable[] {
  if (sellerSurface <= 0) {
    return [];
  }

  const scored: Scored[] = official.map((comparable) => {
    const ppsm = pricePerSquareMeter(comparable.price, comparable.surface_area) ?? 0;
    const surface = comparable.surface_area ?? 0;
    const surfaceDeviation = Math.abs(surface - sellerSurface) / sellerSurface;
    const pricePerSquareMeterDeviation =
      officialMedianPricePerSquareMeter > 0
        ? Math.abs(ppsm - officialMedianPricePerSquareMeter) / officialMedianPricePerSquareMeter
        : 0;
    const proximityScore = round4(surfaceDeviation + pricePerSquareMeterDeviation);
    return {
      comparableId: comparable.id,
      proximityScore,
      surfaceDeviationPercentage: round1(surfaceDeviation * 100),
      pricePerSquareMeterDeviationPercentage: round1(pricePerSquareMeterDeviation * 100),
      surfaceDeviation,
      pricePerSquareMeterDeviation,
      displayOrder: comparable.display_order,
    };
  });

  scored.sort(
    (a, b) =>
      a.proximityScore - b.proximityScore ||
      a.surfaceDeviation - b.surfaceDeviation ||
      a.pricePerSquareMeterDeviation - b.pricePerSquareMeterDeviation ||
      a.displayOrder - b.displayOrder ||
      a.comparableId.localeCompare(b.comparableId),
  );

  return scored.slice(0, MAX_INFLUENTIAL).map((entry) => ({
    comparableId: entry.comparableId,
    proximityScore: entry.proximityScore,
    surfaceDeviationPercentage: entry.surfaceDeviationPercentage,
    pricePerSquareMeterDeviationPercentage: entry.pricePerSquareMeterDeviationPercentage,
  }));
}
