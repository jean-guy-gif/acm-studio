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
    expect(result).not.toHaveProperty('seller_property_confirmed');
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
  });

  // Mission 85 — la note « prêt à lancer » : un entier de 1 à 10, rien d'autre.
  it('accepts a launch readiness score from 1 to 10, with what is still missing', () => {
    for (const score of [1, 7, 10]) {
      expect(validate({ seller_launch_readiness_last: score }).ok).toBe(true);
    }
    const result = validate({
      seller_launch_readiness_first: 7,
      seller_launch_readiness_last: 10,
      seller_launch_readiness_missing: '  le délai  ',
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.seller_launch_readiness_missing).toBe('le délai');
  });

  it('rejects a launch readiness score outside 1 to 10 or not whole', () => {
    for (const score of [0, 11, -3, 7.5, Number.NaN]) {
      const last = validate({ seller_launch_readiness_last: score });
      expect(last.ok).toBe(false);
      if (!last.ok) expect(last.fieldErrors).toHaveProperty('seller_launch_readiness_last');
      expect(validate({ seller_launch_readiness_first: score }).ok).toBe(false);
    }
  });

  it('never requires a launch readiness score', () => {
    const result = validate({
      seller_launch_readiness_last: null,
      seller_launch_readiness_missing: '',
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.seller_launch_readiness_missing).toBeNull();
  });

  it('rejects an answer longer than a Live comment', () => {
    expect(validate({ seller_launch_readiness_missing: 'x'.repeat(2001) }).ok).toBe(false);
  });
});
