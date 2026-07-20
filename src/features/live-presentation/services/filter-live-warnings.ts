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
  // Diagnostics / condominium business alerts (Mission 22).
  'dpe_not_done',
  'electricity_anomaly',
  'gas_anomaly',
  'asbestos_positive',
  'lead_positive',
  'termites_positive',
  'erp_unknown',
  'diagnostics_in_progress',
  'diagnostics_validity_near',
  'condo_ongoing_procedures',
  'condo_voted_works',
  'condo_unpaid_charges',
  'condo_missing_annual_charges',
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
