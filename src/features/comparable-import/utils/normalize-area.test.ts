import { describe, expect, it } from 'vitest';

import { normalizeArea } from '@/features/comparable-import/utils/normalize-area';

describe('normalizeArea', () => {
  it('normalises surface formats', () => {
    expect(normalizeArea('60 m²')).toBe(60);
    expect(normalizeArea('60 m2')).toBe(60);
    expect(normalizeArea('60,5 m²')).toBe(60.5);
    expect(normalizeArea('60.5')).toBe(60.5);
    expect(normalizeArea('82,5 m2')).toBe(82.5);
    expect(normalizeArea(82)).toBe(82);
  });

  it('rejects invalid values', () => {
    expect(normalizeArea('')).toBeNull();
    expect(normalizeArea('abc')).toBeNull();
    expect(normalizeArea('-3')).toBeNull();
    expect(normalizeArea(null)).toBeNull();
  });
});
