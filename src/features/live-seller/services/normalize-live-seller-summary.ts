import type { LiveSellerSummaryInput, LiveSellerSummaryPatch } from '@/features/live-seller/types';

export type RawLiveSellerSummary = {
  seller_most_dangerous_comparable_id?: string | null;
  seller_most_dangerous_reason?: string | null;
  seller_most_dangerous_comment?: string | null;
  seller_perceived_property_price?: number | null;
  advisor_comparative_market_price?: number | null;
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
export function normalizeLiveSellerSummary(raw: RawLiveSellerSummary): LiveSellerSummaryPatch {
  const result: LiveSellerSummaryPatch = {};
  const price = (value: number | null): number | null =>
    value == null || !Number.isFinite(value) ? null : value;

  if ('seller_most_dangerous_comparable_id' in raw) {
    const comparableId = trimToNull(raw.seller_most_dangerous_comparable_id ?? null);
    result.seller_most_dangerous_comparable_id = comparableId;
    result.seller_most_dangerous_reason =
      comparableId == null
        ? null
        : ((trimToNull(raw.seller_most_dangerous_reason ?? null)?.toLowerCase() ??
            null) as LiveSellerSummaryInput['seller_most_dangerous_reason']);
    result.seller_most_dangerous_comment =
      comparableId == null ? null : trimToNull(raw.seller_most_dangerous_comment ?? null);
  } else {
    if ('seller_most_dangerous_reason' in raw) {
      result.seller_most_dangerous_reason = (trimToNull(
        raw.seller_most_dangerous_reason ?? null,
      )?.toLowerCase() ?? null) as LiveSellerSummaryInput['seller_most_dangerous_reason'];
    }
    if ('seller_most_dangerous_comment' in raw) {
      result.seller_most_dangerous_comment = trimToNull(raw.seller_most_dangerous_comment ?? null);
    }
  }
  if ('seller_perceived_property_price' in raw) {
    result.seller_perceived_property_price = price(raw.seller_perceived_property_price ?? null);
  }
  if ('advisor_comparative_market_price' in raw) {
    result.advisor_comparative_market_price = price(raw.advisor_comparative_market_price ?? null);
  }
  return result;
}
