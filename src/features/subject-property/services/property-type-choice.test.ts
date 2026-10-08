import { describe, expect, it } from 'vitest';

import { normalizePropertyType } from '@/features/competitor-search/utils/normalize-property-type';
import {
  PROPERTY_TYPE_LABELS,
  PROPERTY_TYPES,
} from '@/features/subject-property/constants/property-options';
import {
  propertyTypeLabel,
  propertyTypeOptions,
} from '@/features/subject-property/services/property-type-choice';

describe('propertyTypeLabel', () => {
  it('range un texte libre dans le bon choix', () => {
    expect(propertyTypeLabel('appartement T3')).toBe('Appartement');
    expect(propertyTypeLabel('Villa')).toBe('Maison');
    expect(propertyTypeLabel('house')).toBe('Maison');
    expect(propertyTypeLabel('Fonds de commerce')).toBe('Local commercial');
  });

  it('ne devine rien : vide ou inconnu → null', () => {
    expect(propertyTypeLabel(null)).toBeNull();
    expect(propertyTypeLabel('')).toBeNull();
    expect(propertyTypeLabel('Péniche')).toBeNull();
  });

  // Le libellé enregistré est relu par la recherche de concurrents (filtre dur, M54).
  it.each(PROPERTY_TYPES)('le libellé de « %s » se relit comme ce type', (type) => {
    expect(normalizePropertyType(PROPERTY_TYPE_LABELS[type])).toBe(type);
    expect(propertyTypeLabel(PROPERTY_TYPE_LABELS[type])).toBe(PROPERTY_TYPE_LABELS[type]);
  });
});

describe('propertyTypeOptions', () => {
  it('propose les six choix, dans l’ordre', () => {
    expect(propertyTypeOptions('').map((option) => option.label)).toEqual([
      'Appartement',
      'Maison',
      'Terrain',
      'Immeuble',
      'Local commercial',
      'Parking',
    ]);
    expect(propertyTypeOptions('Maison')).toHaveLength(6);
  });

  it('garde une valeur enregistrée qui ne se reconnaît pas', () => {
    const options = propertyTypeOptions('Péniche');
    expect(options).toHaveLength(7);
    expect(options[6]).toEqual({ value: 'Péniche', label: 'Péniche' });
  });
});
