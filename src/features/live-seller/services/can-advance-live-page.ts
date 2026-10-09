import type { LiveSellerSummary } from '@/features/live-seller/types';
import type {
  LiveNavComparable,
  LivePageType,
} from '@/features/live-seller/services/build-live-pages';

// Reveal gates use persisted answers only. Local form values must never let the
// global navigation skip ahead before the server has accepted the answer.
// La garde ne lit que la réponse persistée du concurrent : elle se type sur ce
// minimum, donc la donnée projetée (sans prix) la satisfait comme la donnée complète.
export function canAdvanceLivePage(
  pageType: LivePageType,
  entry: LiveNavComparable | null,
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
  // MISSION 82 — le vendeur dit son prix avant de voir un concurrent : on ne quitte la
  // page qu'une fois ce prix PERSISTÉ (aucun concurrent atteignable avant, même par l'URL).
  if (pageType === 'seller_perceived_price') {
    return summary?.seller_perceived_property_price != null;
  }
  return true;
}
