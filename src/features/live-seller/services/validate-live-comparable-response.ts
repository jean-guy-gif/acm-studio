import {
  MARKET_DURATION_REASONS,
  MAX_LIVE_COMMENT_LENGTH,
  MAX_LIVE_PRICE,
  SERIOUS_COMPETITOR_VALUES,
  type MarketDurationReason,
  type SeriousCompetitor,
} from '@/features/live-seller/constants';
import type { LiveComparableResponseInput } from '@/features/live-seller/types';

export type LiveComparableResponseValidation =
  | { ok: true; value: LiveComparableResponseInput }
  | { ok: false; fieldErrors: Record<string, string> };

// Deterministic, pure. Expects the already-normalised input. All fields optional
// (partial answers are accepted); only present values are constrained.
export function validateLiveComparableResponse(
  input: LiveComparableResponseInput,
): LiveComparableResponseValidation {
  const errors: Record<string, string> = {};

  if (
    input.seller_serious_competitor != null &&
    !SERIOUS_COMPETITOR_VALUES.includes(input.seller_serious_competitor as SeriousCompetitor)
  ) {
    errors.seller_serious_competitor = 'Réponse invalide.';
  }

  if (
    input.seller_serious_competitor_comment != null &&
    input.seller_serious_competitor_comment.length > MAX_LIVE_COMMENT_LENGTH
  ) {
    errors.seller_serious_competitor_comment = `Limité à ${MAX_LIVE_COMMENT_LENGTH} caractères.`;
  }

  if (input.seller_estimated_listing_price != null) {
    const price = input.seller_estimated_listing_price;
    if (!Number.isFinite(price) || price < 0 || price > MAX_LIVE_PRICE) {
      errors.seller_estimated_listing_price = 'Le prix doit être un montant positif.';
    }
  }

  if (
    input.seller_market_duration_reason != null &&
    !MARKET_DURATION_REASONS.includes(input.seller_market_duration_reason as MarketDurationReason)
  ) {
    errors.seller_market_duration_reason = 'Raison invalide.';
  }

  if (
    input.seller_market_duration_comment != null &&
    input.seller_market_duration_comment.length > MAX_LIVE_COMMENT_LENGTH
  ) {
    errors.seller_market_duration_comment = `Limité à ${MAX_LIVE_COMMENT_LENGTH} caractères.`;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, fieldErrors: errors };
  }
  return { ok: true, value: input };
}
