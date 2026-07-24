import {
  DANGEROUS_REASONS,
  MAX_LIVE_COMMENT_LENGTH,
  MAX_LIVE_PRICE,
  type DangerousReason,
} from '@/features/live-seller/constants';
import type { LiveSellerSummaryInput } from '@/features/live-seller/types';

export type LiveSellerSummaryValidation =
  { ok: true; value: LiveSellerSummaryInput } | { ok: false; fieldErrors: Record<string, string> };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function checkPrice(value: number | null, field: string, errors: Record<string, string>): void {
  if (value != null && (!Number.isFinite(value) || value < 0 || value > MAX_LIVE_PRICE)) {
    errors[field] = 'Le prix doit être un montant positif.';
  }
}

// Deterministic, pure. Expects the already-normalised input. The comparable id is
// only syntactically checked here; the server action verifies it belongs to the
// project (ownership is never trusted from the client).
export function validateLiveSellerSummary(
  input: LiveSellerSummaryInput,
): LiveSellerSummaryValidation {
  const errors: Record<string, string> = {};

  if (
    input.seller_most_dangerous_comparable_id != null &&
    !UUID_PATTERN.test(input.seller_most_dangerous_comparable_id)
  ) {
    errors.seller_most_dangerous_comparable_id = 'Concurrent invalide.';
  }

  if (
    input.seller_most_dangerous_reason != null &&
    !DANGEROUS_REASONS.includes(input.seller_most_dangerous_reason as DangerousReason)
  ) {
    errors.seller_most_dangerous_reason = 'Raison invalide.';
  }

  if (
    input.seller_most_dangerous_comment != null &&
    input.seller_most_dangerous_comment.length > MAX_LIVE_COMMENT_LENGTH
  ) {
    errors.seller_most_dangerous_comment = `Limité à ${MAX_LIVE_COMMENT_LENGTH} caractères.`;
  }

  checkPrice(input.seller_perceived_property_price, 'seller_perceived_property_price', errors);
  checkPrice(input.advisor_comparative_market_price, 'advisor_comparative_market_price', errors);

  if (Object.keys(errors).length > 0) {
    return { ok: false, fieldErrors: errors };
  }
  return { ok: true, value: input };
}
