import { describe, expect, it } from 'vitest';

import { parseDecisionInput } from '@/features/price-positioning/actions/parse-decision-input';

function form(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    fd.set(key, value);
  }
  return fd;
}

describe('parseDecisionInput', () => {
  it('accepts advisorPrice, sellerPrice and justification', () => {
    const result = parseDecisionInput(
      form({ advisorPrice: '300000', sellerPrice: '320000', justification: 'Marché tendu' }),
    );
    expect(result).toEqual({
      ok: true,
      input: { advisorPrice: 300000, sellerPrice: 320000, justification: 'Marché tendu' },
    });
  });

  it('treats an empty seller price and justification as null', () => {
    const result = parseDecisionInput(form({ advisorPrice: '300000' }));
    expect(result).toEqual({
      ok: true,
      input: { advisorPrice: 300000, sellerPrice: null, justification: null },
    });
  });

  it('rejects a missing or non-positive advisor price', () => {
    expect(parseDecisionInput(form({ advisorPrice: '' })).ok).toBe(false);
    expect(parseDecisionInput(form({ advisorPrice: '0' })).ok).toBe(false);
    expect(parseDecisionInput(form({ advisorPrice: '-5' })).ok).toBe(false);
    expect(parseDecisionInput(form({ advisorPrice: 'abc' })).ok).toBe(false);
  });

  it('rejects a non-positive seller price', () => {
    expect(parseDecisionInput(form({ advisorPrice: '300000', sellerPrice: '0' })).ok).toBe(false);
    expect(parseDecisionInput(form({ advisorPrice: '300000', sellerPrice: '-1' })).ok).toBe(false);
  });

  it('rejects a justification longer than 1000 characters', () => {
    const result = parseDecisionInput(
      form({ advisorPrice: '300000', justification: 'x'.repeat(1001) }),
    );
    expect(result.ok).toBe(false);
  });

  it('NEVER reads forged business fields from the client', () => {
    const result = parseDecisionInput(
      form({
        advisorPrice: '300000',
        // Forged values a malicious client might try to inject:
        range_low: '1',
        range_central: '1',
        range_high: '1',
        confidence_score: '100',
        confidence_level: 'very_high',
        agency_id: 'other-agency',
        validated_by: 'someone-else',
        calculation_snapshot: '{"engineVersion":999}',
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      // Only the three permitted fields are ever present.
      expect(Object.keys(result.input).sort()).toEqual(
        ['advisorPrice', 'justification', 'sellerPrice'].sort(),
      );
    }
  });
});
