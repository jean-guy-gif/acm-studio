import { describe, expect, it } from 'vitest';

import { normalizePrice } from '@/features/comparable-import/utils/normalize-price';

describe('normalizePrice', () => {
  it('normalises French/EU price formats to 300000', () => {
    expect(normalizePrice('300 000 €')).toBe(300000);
    expect(normalizePrice('300.000 €')).toBe(300000);
    expect(normalizePrice('300000')).toBe(300000);
    expect(normalizePrice('300 000 EUR')).toBe(300000);
    expect(normalizePrice('300 000 €')).toBe(300000);
  });

  it('accepts plain numbers', () => {
    expect(normalizePrice(450000)).toBe(450000);
  });

  it('rejects empty, non-numeric, negative and extreme values', () => {
    expect(normalizePrice('')).toBeNull();
    expect(normalizePrice('   ')).toBeNull();
    expect(normalizePrice('abc')).toBeNull();
    expect(normalizePrice('-5')).toBeNull();
    expect(normalizePrice(-1)).toBeNull();
    expect(normalizePrice('999999999999999')).toBeNull();
    expect(normalizePrice(null)).toBeNull();
    expect(normalizePrice(undefined)).toBeNull();
  });
});
