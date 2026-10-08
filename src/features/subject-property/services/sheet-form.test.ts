import { describe, expect, it } from 'vitest';

import { parseCondominiumForm } from '@/features/subject-property-condominium/services/parse-condominium-form';
import { parseDiagnosticsForm } from '@/features/subject-property-diagnostics/services/parse-diagnostics-form';
import { parseSubjectPropertyForm } from '@/features/subject-property/services/parse-subject-property-form';
import {
  buildSheetForm,
  countSheetErrors,
  splitSheetForm,
} from '@/features/subject-property/services/sheet-form';

describe('fiche du bien vendeur — un seul formulaire pour trois parties', () => {
  it('chaque partie retrouve ses champs, même quand deux parties ont un champ du même nom', () => {
    const parts = splitSheetForm(
      buildSheetForm({
        property: [
          ['property_type', 'Maison'],
          ['city', 'Cagnes-sur-Mer'],
          ['floor', ''],
          ['outdoor_spaces', 'garden'],
          ['outdoor_spaces', 'terrace'],
        ],
        diagnostics: [
          ['energy_consumption', '180'],
          ['notes', 'DPE récent'],
        ],
        condominium: [
          ['is_condominium', 'true'],
          ['total_lots', '12'],
          ['notes', 'Syndic bénévole'],
        ],
      }),
    );

    const property = parseSubjectPropertyForm(parts.property);
    expect(property.property_type).toBe('Maison');
    expect(property.city).toBe('Cagnes-sur-Mer');
    expect(property.floor).toBeNull();
    expect(property.outdoor_spaces).toEqual(['garden', 'terrace']);

    expect(parts.diagnostics).not.toBeNull();
    const diagnostics = parseDiagnosticsForm(parts.diagnostics as FormData);
    expect(diagnostics.energy_consumption).toBe(180);
    expect(diagnostics.notes).toBe('DPE récent');

    expect(parts.condominium).not.toBeNull();
    const condominium = parseCondominiumForm(parts.condominium as FormData);
    expect(condominium.is_condominium).toBe(true);
    expect(condominium.total_lots).toBe(12);
    expect(condominium.notes).toBe('Syndic bénévole');
  });

  it('une partie non touchée n’est pas envoyée, donc pas écrite', () => {
    const parts = splitSheetForm(
      buildSheetForm({ property: [['city', 'Nice']], diagnostics: null, condominium: null }),
    );
    expect(parts.diagnostics).toBeNull();
    expect(parts.condominium).toBeNull();
    expect(parseSubjectPropertyForm(parts.property).city).toBe('Nice');
  });

  it('compte les champs à corriger sur les trois parties', () => {
    expect(
      countSheetErrors({
        property: { floor: 'x', advisor_price_max: 'y' },
        diagnostics: { dpe_date: 'z' },
        condominium: {},
      }),
    ).toBe(3);
  });
});
