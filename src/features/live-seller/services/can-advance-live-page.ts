import type { LiveSellerSummary } from '@/features/live-seller/types';
import type { LivePageType } from '@/features/live-seller/services/build-live-pages';
import type { LiveComparableEntry } from '@/features/seller-presentation/types/seller-presentation';

// Reveal gates use persisted answers only. Local form values must never let the
// global navigation skip ahead before the server has accepted the answer.
export function canAdvanceLivePage(
  pageType: LivePageType,
  entry: LiveComparableEntry | null,
  summary: LiveSellerSummary | null,
): boolean {
  if (pageType === 'subject_property') {
    return summary?.seller_property_confirmed != null;
  }
  if (pageType === 'comparable_competition') {
    return entry?.response?.seller_serious_competitor != null;
  }
  // THE REVEAL LOCK (Mission 41). "À quel prix ?" is the guess screen; the price
  // is revealed only on the NEXT screen ("comparable_price_reveal"). Gating the
  // guess screen on the persisted estimate is what keeps the reveal unreachable
  // until the seller has committed a guess — the core ACM invariant. Do not relax.
  if (pageType === 'comparable_price') {
    return entry?.response?.seller_estimated_listing_price != null;
  }
  // The reveal screen itself carries no mandatory pre-reveal input (the seller's
  // reaction/coherence is captured but optional, like the duration reason), so it
  // is not re-gated here — reaching it already required the guess above.
  if (pageType === 'comparable_duration') {
    return entry?.response?.seller_estimated_days_on_market != null;
  }
  return true;
}
