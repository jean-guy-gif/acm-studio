import { describe, expect, it } from 'vitest';

import { normalizePropertyList } from '@/features/subject-property/services/normalize-property-arrays';

describe('normalizePropertyList', () => {
  it('trims and collapses multiple spaces', () => {
    expect(normalizePropertyList(['  Proche   des   écoles '])).toEqual(['Proche des écoles']);
  });

  it('drops empty and non-string values', () => {
    expect(normalizePropertyList(['Calme', '', '   ', 42 as unknown as string, null])).toEqual([
      'Calme',
    ]);
  });

  it('de-duplicates ignoring case and accents, keeping the first clean label', () => {
    expect(normalizePropertyList(['Calme', 'CALME', 'calmé', 'Lumineux'])).toEqual([
      'Calme',
      'Lumineux',
    ]);
  });

  it('preserves the first-occurrence order', () => {
    expect(normalizePropertyList(['B', 'A', 'C', 'a', 'b'])).toEqual(['B', 'A', 'C']);
  });
});
