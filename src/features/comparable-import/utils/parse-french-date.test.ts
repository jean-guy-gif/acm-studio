import { describe, expect, it } from 'vitest';

import { parseFrenchDate } from '@/features/comparable-import/utils/parse-french-date';

describe('parseFrenchDate', () => {
  it('reads DD/MM/YYYY', () => {
    expect(parseFrenchDate('23/07/2026')).toBe('2026-07-23T00:00:00.000Z');
  });

  it('reads the day on ONE digit (the sondage bug: 3/07 must be the 3rd, not the 30th)', () => {
    expect(parseFrenchDate('3/07/2026')).toBe('2026-07-03T00:00:00.000Z');
  });

  it('reads the long form "29 août 2026"', () => {
    expect(parseFrenchDate('29 août 2026')).toBe('2026-08-29T00:00:00.000Z');
  });

  it('accepts accents dropped and "1er"', () => {
    expect(parseFrenchDate('1er septembre 2026')).toBe('2026-09-01T00:00:00.000Z');
    expect(parseFrenchDate('29 aout 2026')).toBe('2026-08-29T00:00:00.000Z');
  });

  it('rejects an impossible date and junk', () => {
    expect(parseFrenchDate('31/02/2026')).toBeNull();
    expect(parseFrenchDate('pas une date')).toBeNull();
    expect(parseFrenchDate('12 foovember 2026')).toBeNull();
  });
});
