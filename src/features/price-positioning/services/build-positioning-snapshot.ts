import type { PricePositioning } from '@/features/price-positioning/types/price-positioning';
import {
  PRICE_POSITIONING_ENGINE_VERSION,
  type PositioningSnapshot,
} from '@/features/price-positioning/types/saved-price-positioning';

// Builds the compact, versioned business snapshot from a READY positioning.
// Returns null when the positioning cannot be persisted (insufficient data).
export function buildPositioningSnapshot(
  positioning: PricePositioning,
): PositioningSnapshot | null {
  if (positioning.status !== 'ready' || positioning.recommendedRange == null) {
    return null;
  }
  return {
    engineVersion: PRICE_POSITIONING_ENGINE_VERSION,
    totalEligible: positioning.dataset.totalEligible,
    usedCount: positioning.dataset.usedCount,
    outlierCount: positioning.dataset.outlierCount,
    excludedOutlierCount: positioning.dataset.excludedOutlierCount,
    outliersReintroduced: positioning.dataset.outliersReintroduced,
    dispersion: positioning.recommendedRange.dispersion,
    widthPercentage: positioning.recommendedRange.widthPercentage,
    confidenceScore: positioning.confidence.score,
    confidenceLevel: positioning.confidence.level,
    influentialComparableIds: positioning.influentialComparables.map(
      (comparable) => comparable.comparableId,
    ),
    reasons: positioning.reasons,
  };
}
