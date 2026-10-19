import { describe, expect, it } from 'vitest';

import {
  errorsInComplements,
  hasComplements,
} from '@/features/subject-property/services/complements';
import { NO_SHEET_ERRORS } from '@/features/subject-property/services/sheet-form';
import { readFileSync } from 'node:fs';
import {
  COMPLEMENT_PROPERTY_FIELDS,
  ESSENTIAL_PROPERTY_FIELDS,
} from '@/features/subject-property/services/complements';

const none = { property: null, hasDiagnostics: false, hasCondominium: false };

describe('hasComplements', () => {
  it('laisse le bloc replié quand rien n’y est rempli', () => {
    expect(hasComplements(none)).toBe(false);
    expect(
      hasComplements({
        ...none,
        property: { monthly_charges: null, property_tax: null, strengths: [], watch_points: null },
      }),
    ).toBe(false);
  });

  it('ouvre le bloc dès qu’un de ses champs est rempli', () => {
    expect(hasComplements({ ...none, property: { property_tax: 1200 } })).toBe(true);
    expect(hasComplements({ ...none, property: { monthly_charges: 0 } })).toBe(true);
    expect(hasComplements({ ...none, property: { strengths: ['Vue mer'] } })).toBe(true);
    expect(hasComplements({ ...none, property: { watch_points: ['Toiture'] } })).toBe(true);
    expect(hasComplements({ ...none, hasDiagnostics: true })).toBe(true);
    expect(hasComplements({ ...none, hasCondominium: true })).toBe(true);
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
