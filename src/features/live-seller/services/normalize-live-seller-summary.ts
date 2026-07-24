import type { LiveSellerSummaryInput } from '@/features/live-seller/types';

export type RawLiveSellerSummary = {
  seller_most_dangerous_comparable_id: string | null;
  seller_most_dangerous_reason: string | null;
  seller_most_dangerous_comment: string | null;
  seller_perceived_property_price: number | null;
  advisor_comparative_market_price: number | null;
};

function trimToNull(value: string | null): string | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

// Deterministic, pure. If no dangerous competitor is selected, its reason and
// comment are neutralised (they only qualify a selected competitor).
export function normalizeLiveSellerSummary(raw: RawLiveSellerSummary): LiveSellerSummaryInput {
  const comparableId = trimToNull(raw.seller_most_dangerous_comparable_id);
  const reason =
    comparableId == null
      ? null
      : (trimToNull(raw.seller_most_dangerous_reason)?.toLowerCase() ?? null);
  const comment = comparableId == null ? null : trimToNull(raw.seller_most_dangerous_comment);
  const price = (value: number | null): number | null =>
    value == null || !Number.isFinite(value) ? null : value;
  return {
    seller_most_dangerous_comparable_id: comparableId,
    seller_most_dangerous_reason: reason as LiveSellerSummaryInput['seller_most_dangerous_reason'],
    seller_most_dangerous_comment: comment,
    seller_perceived_property_price: price(raw.seller_perceived_property_price),
    advisor_comparative_market_price: price(raw.advisor_comparative_market_price),
  };
}
