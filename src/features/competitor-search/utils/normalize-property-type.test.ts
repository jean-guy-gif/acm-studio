import { describe, expect, it } from 'vitest';

import { normalizePropertyType } from '@/features/competitor-search/utils/normalize-property-type';

describe('normalizePropertyType', () => {
  it('reconnaît le français libre du bien vendeur', () => {
    expect(normalizePropertyType('appartement')).toBe('apartment');
    expect(normalizePropertyType('Appartement 3 pièces')).toBe('apartment');
    expect(normalizePropertyType('Maison')).toBe('house');
    expect(normalizePropertyType('villa')).toBe('house');
    expect(normalizePropertyType('Terrain')).toBe('land');
    expect(normalizePropertyType('box')).toBe('parking');
  });

  it('est idempotent sur le vocabulaire canonique anglais (import / démo)', () => {
    expect(normalizePropertyType('apartment')).toBe('apartment');
    expect(normalizePropertyType('house')).toBe('house');
    expect(normalizePropertyType('parking')).toBe('parking');
  });

  it('type absent ou inconnu → null (on n’exclut jamais pour une absence)', () => {
    expect(normalizePropertyType(null)).toBeNull();
    expect(normalizePropertyType('')).toBeNull();
    expect(normalizePropertyType('bien atypique')).toBeNull();
  });
});
