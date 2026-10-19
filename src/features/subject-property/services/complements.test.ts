import { describe, expect, it } from 'vitest';

import {
  complementsSummary,
  countFilledRecordFields,
  countPropertyComplements,
  errorsInComplements,
} from '@/features/subject-property/services/complements';
import { NO_SHEET_ERRORS } from '@/features/subject-property/services/sheet-form';
import { readFileSync } from 'node:fs';
import {
  COMPLEMENT_PROPERTY_FIELDS,
  ESSENTIAL_PROPERTY_FIELDS,
} from '@/features/subject-property/services/complements';

// Mission 110 — le bloc reste fermé, même rempli (remplace M91) : une ligne le résume.
describe('la ligne de résumé des compléments', () => {
  it('compte les champs renseignés, jamais un champ vide', () => {
    expect(
      countPropertyComplements(
        {
          monthly_charges: null,
          property_tax: '',
          strengths: [],
          watch_points: ['Toiture'],
          has_elevator: '',
          has_pool: 'no',
          floor: '3',
        },
        [],
      ),
    ).toEqual({ filled: 3, toVerify: 0 });
    // Un champ essentiel n'est pas un complément.
    const essentials: Record<string, unknown> = { surface_area: '70', city: 'Vence' };
    expect(countPropertyComplements(essentials, []).filled).toBe(0);
  });

  it('dit « à vérifier » pour les seuls compléments renseignés qui portent la pastille', () => {
    expect(
      countPropertyComplements({ floor: '3', heating_type: 'gas_individual', bedrooms_count: '' }, [
        'floor',
        'surface_area',
        'bedrooms_count',
      ]),
    ).toEqual({ filled: 2, toVerify: 1 });
  });

  it('compte diagnostics et copropriété champ par champ, colonnes techniques à part', () => {
    expect(countFilledRecordFields(null)).toBe(0);
    expect(
      countFilledRecordFields({
        id: 'x',
        agency_id: 'a',
        subject_property_id: 's',
        created_at: 'c',
        updated_at: 'u',
        energy_consumption: 210,
        ges_emissions: null,
        notes: ' ',
      }),
    ).toBe(1);
  });

  it('écrit la ligne', () => {
    expect(complementsSummary({ filled: 0, toVerify: 0 })).toBe('Compléments : aucun renseigné');
    expect(complementsSummary({ filled: 1, toVerify: 0 })).toBe('Compléments : 1 renseigné');
    expect(complementsSummary({ filled: 9, toVerify: 2 })).toBe(
      'Compléments : 9 renseignés, dont 2 à vérifier',
    );
  });

  it('le bloc ne s’ouvre plus seul : ni rempli, ni après un import', () => {
    const form = readFileSync(
      'src/features/subject-property-import/components/subject-property-import-form.tsx',
      'utf8',
    );
    expect(form).toContain('useState(false)');
    expect(form.match(/setComplementsOpen\(true\)/g)).toHaveLength(1);
  });
});

describe('errorsInComplements', () => {
  it('ne s’ouvre pas pour une erreur sur un champ essentiel', () => {
    expect(errorsInComplements(NO_SHEET_ERRORS)).toBe(false);
    expect(
      errorsInComplements({ ...NO_SHEET_ERRORS, property: { surface_area: 'Invalide' } }),
    ).toBe(false);
  });

  it('s’ouvre pour une erreur dans un complément', () => {
    expect(
      errorsInComplements({ ...NO_SHEET_ERRORS, property: { property_tax: 'Invalide' } }),
    ).toBe(true);
    expect(errorsInComplements({ ...NO_SHEET_ERRORS, diagnostics: { dpe_date: 'Invalide' } })).toBe(
      true,
    );
    expect(
      errorsInComplements({ ...NO_SHEET_ERRORS, condominium: { total_lots: 'Invalide' } }),
    ).toBe(true);
  });
});

// Mission 110 — une fiche courte : 8 champs au plus au premier affichage.
describe('la fiche courte', () => {
  it('8 champs : la fourchette à la place du prix affiché, commune et code postal pour un', () => {
    expect(ESSENTIAL_PROPERTY_FIELDS).toEqual([
      'property_type',
      'surface_area',
      'rooms_count',
      'city',
      'address',
      'advisor_price',
      'energy_rating',
      'outdoor_spaces',
    ]);
    expect((ESSENTIAL_PROPERTY_FIELDS as readonly string[]).includes('price')).toBe(false);
  });
  it('l’essentiel ne porte que ces champs ; les autres sont dans les compléments', () => {
    const form = readFileSync(
      'src/features/subject-property/components/subject-property-form.tsx',
      'utf8',
    );
    const essential = form.slice(
      form.indexOf('data-testid="essential-fields"'),
      form.indexOf('</section>', form.indexOf('data-testid="essential-fields"')),
    );
    const fields = [...essential.matchAll(/field="([a-z_]+)"/g)].map((match) => match[1]).sort();
    expect(fields).toEqual(
      [
        'address',
        'city',
        'energy_rating',
        'outdoor_spaces',
        'postal_code',
        'property_type',
        'rooms_count',
        'surface_area',
      ].sort(),
    );
    for (const moved of [
      'land_area',
      'bedrooms_count',
      'district',
      'floor',
      'exposure',
      'parking_types',
    ]) {
      expect(COMPLEMENT_PROPERTY_FIELDS).toContain(moved);
    }
  });
});
