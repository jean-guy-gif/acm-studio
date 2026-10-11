import { describe, expect, it } from 'vitest';

import {
  errorsInComplements,
  hasComplements,
} from '@/features/subject-property/services/complements';
import { NO_SHEET_ERRORS } from '@/features/subject-property/services/sheet-form';

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
