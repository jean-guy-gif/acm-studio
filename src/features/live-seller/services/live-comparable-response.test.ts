import { describe, expect, it } from 'vitest';

import { normalizeLiveComparableResponse } from '@/features/live-seller/services/normalize-live-comparable-response';
import { validateLiveComparableResponse } from '@/features/live-seller/services/validate-live-comparable-response';

function validate(raw: Parameters<typeof normalizeLiveComparableResponse>[0]) {
  return validateLiveComparableResponse(normalizeLiveComparableResponse(raw));
}

const EMPTY = {
  seller_serious_competitor: null,
  seller_serious_competitor_comment: null,
  seller_estimated_listing_price: null,
  seller_market_duration_reason: null,
  seller_market_duration_comment: null,
};

describe('normalizeLiveComparableResponse', () => {
  it('trims comments to null and lower-cases enums', () => {
    const result = normalizeLiveComparableResponse({
      ...EMPTY,
      seller_serious_competitor: '  YES  ',
      seller_serious_competitor_comment: '   ',
      seller_market_duration_reason: 'Price_Too_High',
    });
    expect(result.seller_serious_competitor).toBe('yes');
    expect(result.seller_serious_competitor_comment).toBeNull();
    expect(result.seller_market_duration_reason).toBe('price_too_high');
  });

  it('nulls a non-finite price', () => {
    expect(
      normalizeLiveComparableResponse({ ...EMPTY, seller_estimated_listing_price: Number.NaN })
        .seller_estimated_listing_price,
    ).toBeNull();
  });

  it('preserves field absence for a partial action patch', () => {
    const result = normalizeLiveComparableResponse({
      seller_estimated_listing_price: 430000,
    });

    expect(result).toEqual({ seller_estimated_listing_price: 430000 });
    expect(result).not.toHaveProperty('seller_serious_competitor');
    expect(result).not.toHaveProperty('seller_market_duration_reason');
  });
});

describe('validateLiveComparableResponse', () => {
  it('accepts an empty (partial) answer', () => {
    expect(validate(EMPTY).ok).toBe(true);
  });

  it('accepts yes/no/unsure with a comment and an estimate', () => {
    for (const value of ['yes', 'no', 'unsure']) {
      expect(
        validate({
          ...EMPTY,
          seller_serious_competitor: value,
          seller_serious_competitor_comment: 'Bien similaire',
          seller_estimated_listing_price: 430000,
          seller_market_duration_reason: 'price_too_high',
        }).ok,
      ).toBe(true);
    }
  });

  it('rejects an invalid serious-competitor value', () => {
    const result = validate({ ...EMPTY, seller_serious_competitor: 'maybe' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors).toHaveProperty('seller_serious_competitor');
  });

  it('rejects a negative estimated price', () => {
    const result = validate({ ...EMPTY, seller_estimated_listing_price: -1 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors).toHaveProperty('seller_estimated_listing_price');
  });

  it('rejects an invalid duration reason', () => {
    const result = validate({ ...EMPTY, seller_market_duration_reason: 'nope' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors).toHaveProperty('seller_market_duration_reason');
  });

  it('accepts whole estimated days and rejects negative or fractional durations', () => {
    expect(validate({ ...EMPTY, seller_estimated_days_on_market: 45 }).ok).toBe(true);
    expect(validate({ ...EMPTY, seller_estimated_days_on_market: null }).ok).toBe(false);
    expect(validate({ ...EMPTY, seller_estimated_days_on_market: -1 }).ok).toBe(false);
    expect(validate({ ...EMPTY, seller_estimated_days_on_market: 1.5 }).ok).toBe(false);
  });

  it('rejects an over-long comment', () => {
    const result = validate({ ...EMPTY, seller_market_duration_comment: 'x'.repeat(2001) });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors).toHaveProperty('seller_market_duration_comment');
  });
});
