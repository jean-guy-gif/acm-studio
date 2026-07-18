import type {
  AnalyzedComparable,
  ComparableOutlier,
} from '@/features/comparable-analysis/types/comparable-analysis';

// MVP rule: a comparable whose price/m² deviates by more than 20% from the
// median price/m² is flagged ATYPIQUE. Deterministic, no removal — only a flag.
// Called only by calculateComparableAnalysis().
const OUTLIER_THRESHOLD = 0.2;

export function detectOutliers(
  analyzed: AnalyzedComparable[],
  medianPricePerSquareMeter: number | null,
): ComparableOutlier[] {
  if (medianPricePerSquareMeter == null || medianPricePerSquareMeter <= 0) {
    return [];
  }

  const outliers: ComparableOutlier[] = [];
  for (const comparable of analyzed) {
    const deviation =
      (comparable.pricePerSquareMeter - medianPricePerSquareMeter) / medianPricePerSquareMeter;
    if (Math.abs(deviation) > OUTLIER_THRESHOLD) {
      outliers.push({
        id: comparable.id,
        title: comparable.title,
        pricePerSquareMeter: comparable.pricePerSquareMeter,
        medianPricePerSquareMeter,
        deviationPercent: Math.round(deviation * 100),
      });
    }
  }
  return outliers;
}
