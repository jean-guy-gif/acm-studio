import { describe, expect, it } from 'vitest';

import {
  COMPETITOR_VERIFIABLE_FIELDS,
  SUBJECT_VERIFIABLE_FIELDS,
  addImportedFields,
  countFieldsToVerify,
  importedFields,
  importedToVerifyLabel,
  sanitizeFieldsToVerify,
  withoutField,
} from '@/features/imported-fields/services/fields-to-verify';
import {
  COMPLEMENT_PROPERTY_FIELDS,
  hasComplements,
} from '@/features/subject-property/services/complements';

describe('ce qui vient d’un import se vérifie (mission 97)', () => {
  it('l’import pose la pastille sur chaque champ qu’il remplit, et sur eux seuls', () => {
    const imported = {
      property_type: 'Appartement',
      surface_area: 68,
      rooms_count: null,
      city: '  ',
      outdoor_spaces: ['balcony'],
      parking_types: [],
      description: 'Bel appartement',
    };
    expect(importedFields(imported, SUBJECT_VERIFIABLE_FIELDS)).toEqual([
      'property_type',
      'surface_area',
      'description',
      'outdoor_spaces',
    ]);
    expect(importedFields(null, SUBJECT_VERIFIABLE_FIELDS)).toEqual([]);
  });

  it('jamais sur la fourchette du conseiller ni sur les points de vigilance : aucun import ne les écrit', () => {
    const filled = {
      advisor_price_min: 1,
      advisor_price_max: 2,
      watch_points: ['x'],
      has_pool: true,
    };
    expect(importedFields(filled, SUBJECT_VERIFIABLE_FIELDS)).toEqual([]);
  });

  it('un nouvel import s’ajoute à ce qui restait à vérifier, sans doublon', () => {
    expect(
      addImportedFields(
        ['city', 'surface_area'],
        ['surface_area', 'floor'],
        SUBJECT_VERIFIABLE_FIELDS,
      ),
    ).toEqual(['surface_area', 'city', 'floor']);
  });

  it('modifier un champ retire sa pastille, et elle seule', () => {
    expect(withoutField(['surface_area', 'city', 'floor'], 'city')).toEqual([
      'surface_area',
      'floor',
    ]);
    expect(withoutField(['surface_area'], 'rooms_count')).toEqual(['surface_area']);
  });

  it('« Tout est juste » : plus rien à vérifier', () => {
    expect(sanitizeFieldsToVerify([], SUBJECT_VERIFIABLE_FIELDS)).toEqual([]);
    expect(importedToVerifyLabel(0)).toBeNull();
  });

  it('ce que le navigateur envoie est ramené à la liste d’autorisation', () => {
    expect(
      sanitizeFieldsToVerify(
        ['city', 'agency_id', 'city', ' surface_area ', 'advisor_price_min', '<script>'],
        SUBJECT_VERIFIABLE_FIELDS,
      ),
    ).toEqual(['surface_area', 'city']);
    expect(sanitizeFieldsToVerify('price,title,project_id', COMPETITOR_VERIFIABLE_FIELDS)).toEqual([
      'title',
      'price',
    ]);
    expect(sanitizeFieldsToVerify(null, COMPETITOR_VERIFIABLE_FIELDS)).toEqual([]);
    expect(sanitizeFieldsToVerify(42, COMPETITOR_VERIFIABLE_FIELDS)).toEqual([]);
  });

  it('un concurrent importé depuis la recherche : tout ce qui est rempli est à vérifier', () => {
    const input = {
      title: 'Appartement T3',
      price: 312000,
      surface_area: 70,
      rooms_count: 3,
      city: 'Antibes',
      energy_rating: null,
      listing_url: 'https://exemple.test/annonce',
      photo_urls: ['https://exemple.test/photo.jpg'],
    };
    expect(importedFields(input, COMPETITOR_VERIFIABLE_FIELDS)).toEqual([
      'title',
      'city',
      'surface_area',
      'rooms_count',
      'price',
    ]);
  });
});

describe('« Avant le rendez-vous » compte ce qui reste à vérifier', () => {
  it('« 3 informations importées à vérifier »', () => {
    expect(importedToVerifyLabel(3)).toBe('3 informations importées à vérifier');
    expect(importedToVerifyLabel(1)).toBe('1 information importée à vérifier');
  });

  it('additionne le bien vendeur et les seuls concurrents retenus', () => {
    const count = countFieldsToVerify({ fields_to_verify: ['city', 'surface_area'] }, [
      { is_selected: true, fields_to_verify: ['price'] },
      { is_selected: false, fields_to_verify: ['price', 'title', 'city'] },
      { is_selected: true, fields_to_verify: [] },
    ]);
    expect(count).toBe(3);
  });

  it('sans bien ni concurrent, ou d’avant la mission : rien à dire', () => {
    expect(countFieldsToVerify(null, [])).toBe(0);
    expect(countFieldsToVerify({}, [{ is_selected: true }])).toBe(0);
  });

  it('un nom hors liste resté en base ne se compte pas', () => {
    expect(countFieldsToVerify({ fields_to_verify: ['city', 'colonne_disparue'] }, [])).toBe(1);
  });
});

describe('« Salles de bains » vit dans les compléments (mission 97)', () => {
  it('le champ est rangé avec les compléments, et les ouvre s’il est rempli', () => {
    expect(COMPLEMENT_PROPERTY_FIELDS).toContain('bathrooms_count');
    expect(
      hasComplements({
        property: { bathrooms_count: 2 },
        hasDiagnostics: false,
        hasCondominium: false,
      }),
    ).toBe(true);
    expect(
      hasComplements({
        property: { bathrooms_count: null },
        hasDiagnostics: false,
        hasCondominium: false,
      }),
    ).toBe(false);
  });
});
