import {
  DANGEROUS_REASONS,
  MAX_LIVE_COMMENT_LENGTH,
  MAX_LIVE_PRICE,
  PROPERTY_CONFIRMED_VALUES,
  type DangerousReason,
  type PropertyConfirmed,
} from '@/features/live-seller/constants';
import type { LiveSellerSummaryPatch } from '@/features/live-seller/types';

export type LiveSellerSummaryValidation =
  { ok: true; value: LiveSellerSummaryPatch } | { ok: false; fieldErrors: Record<string, string> };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function checkPrice(
  value: number | null | undefined,
  field: string,
  errors: Record<string, string>,
): void {
  if (value != null && (!Number.isFinite(value) || value < 0 || value > MAX_LIVE_PRICE)) {
    errors[field] = 'Le prix doit être un montant positif.';
  }
}

// Deterministic, pure. Expects the already-normalised input. The comparable id is
// only syntactically checked here; the server action verifies it belongs to the
// project (ownership is never trusted from the client).
export function validateLiveSellerSummary(
  input: LiveSellerSummaryPatch,
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

  if (
    input.seller_most_dangerous_comparable_id == null &&
    input.seller_most_dangerous_reason != null
  ) {
    errors.seller_most_dangerous_reason = 'Sélectionnez d’abord un concurrent.';
  }
  if (
    input.seller_most_dangerous_comparable_id == null &&
    input.seller_most_dangerous_comment != null
  ) {
    errors.seller_most_dangerous_comment = 'Sélectionnez d’abord un concurrent.';
  }

  checkPrice(input.seller_perceived_property_price, 'seller_perceived_property_price', errors);
  checkPrice(input.advisor_comparative_market_price, 'advisor_comparative_market_price', errors);

  if (
    input.seller_property_confirmed != null &&
    !PROPERTY_CONFIRMED_VALUES.includes(input.seller_property_confirmed as PropertyConfirmed)
  ) {
    errors.seller_property_confirmed = 'Réponse invalide.';
  }
  if (
    input.seller_property_comment != null &&
    input.seller_property_comment.length > MAX_LIVE_COMMENT_LENGTH
  ) {
    errors.seller_property_comment = `Limité à ${MAX_LIVE_COMMENT_LENGTH} caractères.`;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, fieldErrors: errors };
  }
  return { ok: true, value: input };
}
