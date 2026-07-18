import { describe, expect, it } from 'vitest';

import {
  countCanonical,
  normalizeLabel,
} from '@/features/comparable-analysis/utils/normalize-label';

describe('normalizeLabel', () => {
  it('trims and collapses multiple spaces in the display label', () => {
    expect(normalizeLabel('  Terrasse   plein  sud ')).toEqual({
      key: 'terrasse plein sud',
      label: 'Terrasse plein sud',
    });
  });

  it('lowercases and strips accents for the key, keeps them in the label', () => {
    expect(normalizeLabel('Éxposition Ést')).toEqual({
      key: 'exposition est',
      label: 'Éxposition Ést',
    });
  });

  it('produces the same key for different case/accents/spacing', () => {
    const a = normalizeLabel('Terrasse');
    const b = normalizeLabel(' TERRASSE ');
    const c = normalizeLabel('terrasse');
    expect(a?.key).toBe(b?.key);
    expect(b?.key).toBe(c?.key);
  });

  it('returns null for empty or non-textual values', () => {
    expect(normalizeLabel('')).toBeNull();
    expect(normalizeLabel('   ')).toBeNull();
    expect(normalizeLabel(null)).toBeNull();
    expect(normalizeLabel(42)).toBeNull();
    expect(normalizeLabel(undefined)).toBeNull();
  });
});

describe('countCanonical', () => {
  it('groups by canonical key and keeps the first clean label', () => {
    const result = countCanonical(['Terrasse', ' terrasse ', 'TERRASSE', 'Garage']);
    expect(result).toEqual([
      { label: 'Terrasse', count: 3 },
      { label: 'Garage', count: 1 },
    ]);
  });

  it('ignores empty and non-textual values', () => {
    expect(countCanonical(['', '   ', null, 7, undefined])).toEqual([]);
  });

  it('does not merge distinct business terms', () => {
    const result = countCanonical(['Garage', 'Parking']);
    expect(result.map((entry) => entry.label).sort()).toEqual(['Garage', 'Parking']);
  });
});
