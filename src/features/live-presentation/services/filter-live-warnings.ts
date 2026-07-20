import type { SellerPresentationWarning } from '@/features/seller-presentation/types/seller-presentation';

// Only business alerts that are useful during the seller meeting are shown in
// Live. Internal / preparation / technical alerts (missing property, unsaved
// decision, incomplete data, missing visuals, excluded outliers…) are excluded —
// they belong to Builder preparation, not to the seller discussion.
const LIVE_WARNING_CODES = new Set<string>([
  'few_comparables',
  'high_dispersion',
  'low_confidence',
  'decision_outdated',
  'outliers_reintroduced',
  'seller_price_missing',
]);

// Deterministic filter: keeps only the allow-listed business codes, preserves the
// input order (already blocking → warning → info) and de-duplicates by code.
export function filterLiveWarnings(
  warnings: SellerPresentationWarning[],
): SellerPresentationWarning[] {
  const seen = new Set<string>();
  const result: SellerPresentationWarning[] = [];
  for (const warning of warnings) {
    if (LIVE_WARNING_CODES.has(warning.code) && !seen.has(warning.code)) {
      seen.add(warning.code);
      result.push(warning);
    }
  }
  return result;
}
