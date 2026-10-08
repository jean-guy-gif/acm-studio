import { describe, expect, it } from 'vitest';

import { missingForSearch } from '@/features/subject-property/services/search-requirements';
import {
  validateSubjectProperty,
  type RawSubjectPropertyInput,
} from '@/features/subject-property/services/validate-subject-property';
import { applyDpe, dpeMention } from '@/features/subject-property-dpe/services/apply-dpe';
import type { DpeReading } from '@/features/subject-property-dpe/types';

// Mission 79 — the DPE comes last: advisor > PDF sheet > listing > DPE.

const empty = { heating_type: '', energy_rating: '', ges_rating: '' };
const reading: DpeReading = {
  heating_type: { value: 'individual_fuel', date: '2025-04-27' },
  energy_rating: { value: 'E', date: '2025-04-27' },
  ges_rating: { value: 'E', date: '2025-04-27' },
};

describe('applyDpe', () => {
  it('fills the empty fields, each with its mention', () => {
    expect(applyDpe(empty, reading, new Set())).toEqual({
      values: { heating_type: 'individual_fuel', energy_rating: 'E', ges_rating: 'E' },
      mentions: {
        heating_type: 'd’après le DPE du 27/04/2025',
        energy_rating: 'd’après le DPE du 27/04/2025',
        ges_rating: 'd’après le DPE du 27/04/2025',
      },
    });
  });

  it('never writes over a value already there (advisor, PDF sheet or listing)', () => {
    const result = applyDpe(
      { ...empty, heating_type: 'collective_gas', energy_rating: 'C' },
      reading,
      new Set(),
    );
    expect(result.values).toEqual({
      heating_type: 'collective_gas',
      energy_rating: 'C',
      ges_rating: 'E',
    });
    expect(result.mentions).toEqual({ ges_rating: 'd’après le DPE du 27/04/2025' });
  });

  it('leaves empty a field the advisor emptied himself', () => {
    const result = applyDpe(empty, reading, new Set(['heating_type']));
    expect(result.values.heating_type).toBe('');
    expect(result.mentions.heating_type).toBeUndefined();
  });

  it('changes nothing without a DPE, and keeps the other fields of the sheet', () => {
    const sheet = { ...empty, city: 'Nice' };
    expect(applyDpe(sheet, {}, new Set())).toEqual({ values: sheet, mentions: {} });
  });

  it('writes the date the French way', () => {
    expect(dpeMention('2023-04-02')).toBe('d’après le DPE du 02/04/2023');
  });
});

// Critère 6 — chauffage, classe DPE et classe GES ne bloquent ni « Enregistrer » ni « Trouver des
// concurrents ».
describe('heating, DPE class and GES class never block', () => {
  const sheet: RawSubjectPropertyInput = {
    advisor_price_min: null,
    advisor_price_max: null,
    property_type: 'Appartement',
    surface_area: null,
    land_area: null,
    rooms_count: null,
    bedrooms_count: null,
    bathrooms_count: null,
    energy_rating: null,
    address: null,
    postal_code: null,
    city: 'Nice',
    description: null,
    district: null,
    floor: null,
    building_floors: null,
    ges_rating: null,
    heating_type: null,
    exposure: null,
    construction_year: null,
    general_condition: null,
    has_elevator: null,
    has_pool: null,
    outdoor_spaces: [],
    parking_types: [],
    monthly_charges: null,
    property_tax: null,
    strengths: [],
    watch_points: [],
  };

  it('« Enregistrer » passes with the three fields empty', () => {
    expect(validateSubjectProperty(sheet, { currentYear: 2026 }).ok).toBe(true);
  });

  it('« Enregistrer » passes with every value the DPE can write', () => {
    for (const heating_type of [
      'individual_electric',
      'individual_heat_pump',
      'mixed',
      'collective_heat_network',
    ]) {
      const filled = { ...sheet, heating_type, energy_rating: 'G', ges_rating: 'A' };
      expect(validateSubjectProperty(filled, { currentYear: 2026 }).ok).toBe(true);
    }
  });

  it('« Trouver des concurrents » asks for the type and the city only', () => {
    expect(missingForSearch(sheet)).toEqual([]);
  });
});
