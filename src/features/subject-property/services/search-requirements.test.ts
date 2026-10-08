import { describe, expect, it } from 'vitest';

import {
  missingForSearch,
  missingForSearchMessage,
  propertyFieldId,
} from '@/features/subject-property/services/search-requirements';

describe('missingForSearch', () => {
  it('rien ne manque avec un type reconnu et une ville', () => {
    expect(missingForSearch({ property_type: 'Maison', city: 'Cagnes-sur-Mer' })).toEqual([]);
    expect(missingForSearch({ property_type: 'appartement T3', city: 'Nice' })).toEqual([]);
  });

  it('nomme le type, la ville, ou les deux', () => {
    expect(missingForSearch({ property_type: null, city: 'Nice' })).toEqual(['property_type']);
    expect(missingForSearch({ property_type: 'Maison', city: '  ' })).toEqual(['city']);
    expect(missingForSearch({ property_type: undefined, city: undefined })).toEqual([
      'property_type',
      'city',
    ]);
  });

  it('un type qui ne se reconnaît pas compte comme manquant', () => {
    expect(missingForSearch({ property_type: 'Péniche', city: 'Nice' })).toEqual(['property_type']);
  });
});

describe('missingForSearchMessage', () => {
  it('dit ce qui manque', () => {
    expect(missingForSearchMessage(['property_type'])).toBe('Il manque : type de bien');
    expect(missingForSearchMessage(['property_type', 'city'])).toBe(
      'Il manque : type de bien, ville',
    );
  });
});

describe('propertyFieldId', () => {
  it('donne l’ancre du champ', () => {
    expect(propertyFieldId('city')).toBe('champ-city');
  });
});
