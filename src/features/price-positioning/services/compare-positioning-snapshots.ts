import type { PricePositioning } from '@/features/price-positioning/types/price-positioning';
import type {
  PositioningComparisonKey,
  PositioningFreshness,
  SavedPricePositioning,
} from '@/features/price-positioning/types/saved-price-positioning';

// Comparison key of the CURRENT calculation. Null when it is not ready.
export function currentComparisonKey(
  positioning: PricePositioning,
): PositioningComparisonKey | null {
  if (positioning.status !== 'ready' || positioning.recommendedRange == null) {
    return null;
  }
  return {
    rangeLow: positioning.recommendedRange.low,
    rangeCentral: positioning.recommendedRange.central,
    rangeHigh: positioning.recommendedRange.high,
    confidenceScore: positioning.confidence.score,
    confidenceLevel: positioning.confidence.level,
    usedCount: positioning.dataset.usedCount,
    influentialComparableIds: positioning.influentialComparables.map(
      (comparable) => comparable.comparableId,
    ),
  };
}

// Comparison key of the SAVED decision.
export function savedComparisonKey(saved: SavedPricePositioning): PositioningComparisonKey {
  return {
    rangeLow: saved.rangeLow,
    rangeCentral: saved.rangeCentral,
    rangeHigh: saved.rangeHigh,
    confidenceScore: saved.confidenceScore,
    confidenceLevel: saved.confidenceLevel,
    usedCount: saved.snapshot.usedCount,
    influentialComparableIds: saved.snapshot.influentialComparableIds,
  };
}

function sameIds(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

// Deterministic freshness. `outdated` when any compared criterion differs. Reason
// texts are never compared (editorial-only changes must not mark outdated).
export function comparePositioningFreshness(
  current: PositioningComparisonKey,
  saved: PositioningComparisonKey,
): PositioningFreshness {
  const identical =
    current.rangeLow === saved.rangeLow &&
    current.rangeCentral === saved.rangeCentral &&
    current.rangeHigh === saved.rangeHigh &&
    current.confidenceScore === saved.confidenceScore &&
    current.confidenceLevel === saved.confidenceLevel &&
    current.usedCount === saved.usedCount &&
    sameIds(current.influentialComparableIds, saved.influentialComparableIds);
  return identical ? 'up_to_date' : 'outdated';
}
