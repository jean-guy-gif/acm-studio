import type {
  LiveComparableResponseInput,
  LiveComparableResponsePatch,
} from '@/features/live-seller/types';

// Raw values as read from the form (before validation). Enum-like fields arrive
// as free strings; the price as a nullable number.
export type RawLiveComparableResponse = {
  seller_serious_competitor?: string | null;
  seller_serious_competitor_comment?: string | null;
  seller_estimated_listing_price?: number | null;
  seller_estimated_days_on_market?: number | null;
  seller_market_duration_reason?: string | null;
  seller_market_duration_comment?: string | null;
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
): LiveComparableResponsePatch {
  const enumValue = (value: string | null): string | null => {
    const trimmed = trimToNull(value);
    return trimmed == null ? null : trimmed.toLowerCase();
  };
  const result: LiveComparableResponsePatch = {};
  if ('seller_serious_competitor' in raw) {
    result.seller_serious_competitor = enumValue(
      raw.seller_serious_competitor ?? null,
    ) as LiveComparableResponseInput['seller_serious_competitor'];
  }
  if ('seller_serious_competitor_comment' in raw) {
    result.seller_serious_competitor_comment = trimToNull(
      raw.seller_serious_competitor_comment ?? null,
    );
  }
  if ('seller_estimated_listing_price' in raw) {
    result.seller_estimated_listing_price = finiteOrNull(raw.seller_estimated_listing_price);
  }
  if ('seller_estimated_days_on_market' in raw) {
    result.seller_estimated_days_on_market = finiteOrNull(raw.seller_estimated_days_on_market);
  }
  if ('seller_market_duration_reason' in raw) {
    result.seller_market_duration_reason = enumValue(
      raw.seller_market_duration_reason ?? null,
    ) as LiveComparableResponseInput['seller_market_duration_reason'];
  }
  if ('seller_market_duration_comment' in raw) {
    result.seller_market_duration_comment = trimToNull(raw.seller_market_duration_comment ?? null);
  }
  return result;
}

function finiteOrNull(value: number | null | undefined): number | null {
  return value == null || !Number.isFinite(value) ? null : value;
}
