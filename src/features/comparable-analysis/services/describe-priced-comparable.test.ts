import { describe, expect, it } from 'vitest';

import { describePricedComparable } from '@/features/comparable-analysis/services/describe-priced-comparable';

const plain = (value: string): string => value.replace(/[  ]/g, ' ');

const BASE = {
  roomsCount: 3,
  surfaceArea: 64.7,
  district: 'Les Vespins',
  city: 'Saint-Laurent-du-Var',
  price: 306600,
  pricePerSquareMeter: 4738.794435857805,
};

describe('describePricedComparable', () => {
  it('décrit le bien par ses champs : pièces, surface, quartier, prix, prix au m²', () => {
    expect(plain(describePricedComparable(BASE))).toBe(
      '3 pièces · 64,7 m² · Les Vespins — 306 600 € (4 739 €/m²)',
    );
  });

  it('retombe sur la commune sans quartier', () => {
    expect(plain(describePricedComparable({ ...BASE, district: '  ' }))).toBe(
      '3 pièces · 64,7 m² · Saint-Laurent-du-Var — 306 600 € (4 739 €/m²)',
    );
  });

  it('omet un champ absent, sans tiret ni titre d’annonce', () => {
    expect(
      plain(describePricedComparable({ ...BASE, roomsCount: null, district: null, city: null })),
    ).toBe('64,7 m² — 306 600 € (4 739 €/m²)');
    expect(plain(describePricedComparable({ ...BASE, roomsCount: 1 }))).toContain('1 pièce ·');
  });
});
