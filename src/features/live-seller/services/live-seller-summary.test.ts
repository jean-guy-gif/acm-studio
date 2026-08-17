import { describe, expect, it } from 'vitest';

import { normalizeLiveSellerSummary } from '@/features/live-seller/services/normalize-live-seller-summary';
import { validateLiveSellerSummary } from '@/features/live-seller/services/validate-live-seller-summary';

function validate(raw: Parameters<typeof normalizeLiveSellerSummary>[0]) {
  return validateLiveSellerSummary(normalizeLiveSellerSummary(raw));
}

const ID = '00000000-0000-0000-0000-000000000001';
const EMPTY = {
  seller_most_dangerous_comparable_id: null,
  seller_most_dangerous_reason: null,
  seller_most_dangerous_comment: null,
  seller_perceived_property_price: null,
  advisor_comparative_market_price: null,
};

describe('normalizeLiveSellerSummary', () => {
  it('neutralises reason and comment when no dangerous competitor is selected', () => {
    const result = normalizeLiveSellerSummary({
      ...EMPTY,
      seller_most_dangerous_comparable_id: null,
      seller_most_dangerous_reason: 'better_value',
      seller_most_dangerous_comment: 'x',
    });
    expect(result.seller_most_dangerous_reason).toBeNull();
    expect(result.seller_most_dangerous_comment).toBeNull();
  });

  it('keeps reason/comment when a competitor is selected', () => {
    const result = normalizeLiveSellerSummary({
      ...EMPTY,
      seller_most_dangerous_comparable_id: ID,
      seller_most_dangerous_reason: 'Better_Value',
      seller_most_dangerous_comment: '  agressif  ',
    });
    expect(result.seller_most_dangerous_reason).toBe('better_value');
    expect(result.seller_most_dangerous_comment).toBe('agressif');
  });

  it('preserves field absence for a partial action patch', () => {
    const result = normalizeLiveSellerSummary({ seller_perceived_property_price: 435000 });

    expect(result).toEqual({ seller_perceived_property_price: 435000 });
    expect(result).not.toHaveProperty('advisor_comparative_market_price');
    expect(result).not.toHaveProperty('seller_most_dangerous_comparable_id');
  });
});

describe('validateLiveSellerSummary', () => {
  it('accepts an empty summary', () => {
    expect(validate(EMPTY).ok).toBe(true);
  });

  it('accepts a full valid summary', () => {
    expect(
      validate({
        seller_most_dangerous_comparable_id: ID,
        seller_most_dangerous_reason: 'more_attractive_price',
        seller_most_dangerous_comment: 'Moins cher au m²',
        seller_perceived_property_price: 435000,
        advisor_comparative_market_price: 420000,
      }).ok,
    ).toBe(true);
  });

  it('rejects an invalid comparable id', () => {
    const result = validate({ ...EMPTY, seller_most_dangerous_comparable_id: 'not-a-uuid' });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.fieldErrors).toHaveProperty('seller_most_dangerous_comparable_id');
  });

  it('rejects an invalid dangerous reason', () => {
    const result = validate({
      ...EMPTY,
      seller_most_dangerous_comparable_id: ID,
      seller_most_dangerous_reason: 'because',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors).toHaveProperty('seller_most_dangerous_reason');
  });

  it('rejects a dangerous reason or comment without a selected comparable', () => {
    const reason = validate({ seller_most_dangerous_reason: 'better_value' });
    const comment = validate({ seller_most_dangerous_comment: 'Très proche' });

    expect(reason.ok).toBe(false);
    expect(comment.ok).toBe(false);
  });

  it('rejects negative prices', () => {
    expect(validate({ ...EMPTY, seller_perceived_property_price: -5 }).ok).toBe(false);
    expect(validate({ ...EMPTY, advisor_comparative_market_price: -5 }).ok).toBe(false);
  });
});
