import type { FeatureAnalysis } from '@/features/comparable-analysis/types/comparable-analysis';
import {
  countCanonical,
  normalizeLabel,
} from '@/features/comparable-analysis/utils/normalize-label';
import type { Comparable } from '@/features/comparables/types';

// Unique features of a single comparable, grouped by canonical key so a feature
// repeated with a different case/accents/spacing counts once. Keeps the first
// clean label seen within the comparable.
function uniqueFeatureLabels(comparable: Comparable): string[] {
  const raw = comparable.listing_features;
  if (!Array.isArray(raw)) {
    return [];
  }
  const seen = new Map<string, string>();
  for (const item of raw) {
    const normalized = normalizeLabel(item);
    if (normalized && !seen.has(normalized.key)) {
      seen.set(normalized.key, normalized.label);
    }
  }
  return [...seen.values()];
}

// Frequency of each listing feature across the analyzed comparables. The count is
// the NUMBER OF COMPARABLES that have the feature (deduped per comparable), never
// the raw number of occurrences. Business synonyms (garage vs parking) are NOT
// merged — only case/accents/spacing are normalised. Pure counting, no
// interpretation. Called only by calculateComparableAnalysis().
export function analyzeFeatures(analyzed: Comparable[]): FeatureAnalysis {
  const perComparableLabels = analyzed.flatMap(uniqueFeatureLabels);
  return { total: analyzed.length, features: countCanonical(perComparableLabels) };
}
