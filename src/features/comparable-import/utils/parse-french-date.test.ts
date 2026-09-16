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

  it('reads the abbreviated months with a trailing point (Bien’ici)', () => {
    expect(parseFrenchDate('8 sept. 2026')).toBe('2026-09-08T00:00:00.000Z');
    expect(parseFrenchDate('9 sept. 2026')).toBe('2026-09-09T00:00:00.000Z');
    expect(parseFrenchDate('1er janv. 2026')).toBe('2026-01-01T00:00:00.000Z');
    expect(parseFrenchDate('3 févr. 2026')).toBe('2026-02-03T00:00:00.000Z');
    expect(parseFrenchDate('15 avr. 2026')).toBe('2026-04-15T00:00:00.000Z');
    expect(parseFrenchDate('20 juil. 2026')).toBe('2026-07-20T00:00:00.000Z');
    expect(parseFrenchDate('4 oct. 2026')).toBe('2026-10-04T00:00:00.000Z');
    expect(parseFrenchDate('11 nov. 2026')).toBe('2026-11-11T00:00:00.000Z');
    expect(parseFrenchDate('25 déc. 2026')).toBe('2026-12-25T00:00:00.000Z');
  });

  it('the months that do NOT abbreviate still read in full', () => {
    expect(parseFrenchDate('3 mars 2026')).toBe('2026-03-03T00:00:00.000Z');
    expect(parseFrenchDate('1er mai 2026')).toBe('2026-05-01T00:00:00.000Z');
    expect(parseFrenchDate('9 juin 2026')).toBe('2026-06-09T00:00:00.000Z');
    expect(parseFrenchDate('13 juillet 2026')).toBe('2026-07-13T00:00:00.000Z');
  });

  it('rejects an impossible date and junk', () => {
    expect(parseFrenchDate('31/02/2026')).toBeNull();
    expect(parseFrenchDate('pas une date')).toBeNull();
    expect(parseFrenchDate('12 foovember 2026')).toBeNull();
  });
});
