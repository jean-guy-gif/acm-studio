import { describe, expect, it } from 'vitest';

import { normalizeCount } from '@/features/comparable-import/utils/normalize-count';

describe('normalizeCount', () => {
  it('parses integer counts', () => {
    expect(normalizeCount('3')).toBe(3);
    expect(normalizeCount('3 pièces')).toBe(3);
    expect(normalizeCount(4)).toBe(4);
  });

  it('rejects decimals and invalid values', () => {
    expect(normalizeCount('3.5')).toBeNull();
    expect(normalizeCount('3,5 pièces')).toBeNull();
    expect(normalizeCount(2.5)).toBeNull();
    expect(normalizeCount('')).toBeNull();
    expect(normalizeCount('abc')).toBeNull();
    expect(normalizeCount('-1')).toBeNull();
  });
});
