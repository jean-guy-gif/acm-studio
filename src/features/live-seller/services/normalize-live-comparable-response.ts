import type { LiveComparableResponseInput } from '@/features/live-seller/types';

// Raw values as read from the form (before validation). Enum-like fields arrive
// as free strings; the price as a nullable number.
export type RawLiveComparableResponse = {
  seller_serious_competitor: string | null;
  seller_serious_competitor_comment: string | null;
  seller_estimated_listing_price: number | null;
  seller_market_duration_reason: string | null;
  seller_market_duration_comment: string | null;
};

function trimToNull(value: string | null): string | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

// Deterministic, pure. Trims comments to null when empty and lower-cases the
// enum-like fields. Never invents a value.
export function normalizeLiveComparableResponse(
  raw: RawLiveComparableResponse,
): LiveComparableResponseInput {
  const enumValue = (value: string | null): string | null => {
    const trimmed = trimToNull(value);
    return trimmed == null ? null : trimmed.toLowerCase();
  };
  return {
    seller_serious_competitor: enumValue(
      raw.seller_serious_competitor,
    ) as LiveComparableResponseInput['seller_serious_competitor'],
    seller_serious_competitor_comment: trimToNull(raw.seller_serious_competitor_comment),
    seller_estimated_listing_price:
      raw.seller_estimated_listing_price == null ||
      !Number.isFinite(raw.seller_estimated_listing_price)
        ? null
        : raw.seller_estimated_listing_price,
    seller_market_duration_reason: enumValue(
      raw.seller_market_duration_reason,
    ) as LiveComparableResponseInput['seller_market_duration_reason'],
    seller_market_duration_comment: trimToNull(raw.seller_market_duration_comment),
  };
}
