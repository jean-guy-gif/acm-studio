import { describe, expect, it } from 'vitest';

import {
  validateSubjectProperty,
  type RawSubjectPropertyInput,
} from '@/features/subject-property/services/validate-subject-property';

function input(overrides: Partial<RawSubjectPropertyInput> = {}): RawSubjectPropertyInput {
  return {
    property_type: 'appartement',
    surface_area: 52,
    land_area: null,
    rooms_count: 3,
    bedrooms_count: 2,
    bathrooms_count: 1,
    energy_rating: 'C',
    address: null,
    postal_code: null,
    city: 'Antibes',
    description: null,
    district: null,
    floor: null,
    building_floors: null,
    ges_rating: null,
    heating_type: null,
    exposure: null,
    construction_year: null,
    general_condition: null,
    outdoor_spaces: [],
    parking_types: [],
    monthly_charges: null,
    property_tax: null,
    strengths: [],
    watch_points: [],
    ...overrides,
  };
}

const YEAR = { currentYear: 2026 };

function errorsOf(overrides: Partial<RawSubjectPropertyInput>) {
  const result = validateSubjectProperty(input(overrides), YEAR);
  return result.ok ? {} : result.fieldErrors;
}

describe('validateSubjectProperty — floors', () => {
  it('accepts a valid floor and building_floors', () => {
    expect(validateSubjectProperty(input({ floor: 2, building_floors: 5 }), YEAR).ok).toBe(true);
  });
  it('accepts floor -1 (basement) and 0 building floors', () => {
    expect(validateSubjectProperty(input({ floor: -1, building_floors: 0 }), YEAR).ok).toBe(true);
  });
  it('rejects a floor above the building total', () => {
    expect(errorsOf({ floor: 6, building_floors: 5 })).toHaveProperty('floor');
  });
  it('rejects out-of-range floor / building floors', () => {
    expect(errorsOf({ floor: 201 })).toHaveProperty('floor');
    expect(errorsOf({ building_floors: 201 })).toHaveProperty('building_floors');
    expect(errorsOf({ floor: -2 })).toHaveProperty('floor');
  });
});

describe('validateSubjectProperty — construction year', () => {
  it('accepts a valid year', () => {
    expect(validateSubjectProperty(input({ construction_year: 1990 }), YEAR).ok).toBe(true);
  });
  it('accepts current year + 1', () => {
    expect(validateSubjectProperty(input({ construction_year: 2027 }), YEAR).ok).toBe(true);
  });
  it('rejects a year that is too old', () => {
    expect(errorsOf({ construction_year: 1499 })).toHaveProperty('construction_year');
  });
  it('rejects an excessively future year', () => {
    expect(errorsOf({ construction_year: 2028 })).toHaveProperty('construction_year');
  });
});

describe('validateSubjectProperty — financials', () => {
  it('accepts zero and positive amounts', () => {
    expect(
      validateSubjectProperty(input({ monthly_charges: 0, property_tax: 1200 }), YEAR).ok,
    ).toBe(true);
  });
  it('rejects negative charges and property tax', () => {
    expect(errorsOf({ monthly_charges: -1 })).toHaveProperty('monthly_charges');
    expect(errorsOf({ property_tax: -5 })).toHaveProperty('property_tax');
  });
});

describe('validateSubjectProperty — controlled scalars', () => {
  it('rejects invalid GES / exposure / condition / heating', () => {
    expect(errorsOf({ ges_rating: 'H' })).toHaveProperty('ges_rating');
    expect(errorsOf({ exposure: 'up' })).toHaveProperty('exposure');
    expect(errorsOf({ general_condition: 'perfect' })).toHaveProperty('general_condition');
    expect(errorsOf({ heating_type: 'solar' })).toHaveProperty('heating_type');
  });
  it('accepts valid controlled scalars', () => {
    expect(
      validateSubjectProperty(
        input({
          ges_rating: 'B',
          exposure: 'south_west',
          general_condition: 'good',
          heating_type: 'individual_heat_pump',
        }),
        YEAR,
      ).ok,
    ).toBe(true);
  });
});

describe('validateSubjectProperty — controlled arrays', () => {
  it('accepts a single and multiple outdoor spaces / parking types', () => {
    expect(validateSubjectProperty(input({ outdoor_spaces: ['balcony'] }), YEAR).ok).toBe(true);
    expect(validateSubjectProperty(input({ outdoor_spaces: ['balcony', 'garden'] }), YEAR).ok).toBe(
      true,
    );
    expect(
      validateSubjectProperty(input({ parking_types: ['garage', 'outdoor_parking'] }), YEAR).ok,
    ).toBe(true);
  });

  it('accepts "none" alone', () => {
    expect(validateSubjectProperty(input({ outdoor_spaces: ['none'] }), YEAR).ok).toBe(true);
    expect(validateSubjectProperty(input({ parking_types: ['none'] }), YEAR).ok).toBe(true);
  });

  it('rejects "none" combined with another value', () => {
    expect(errorsOf({ outdoor_spaces: ['none', 'balcony'] })).toHaveProperty('outdoor_spaces');
    expect(errorsOf({ parking_types: ['garage', 'none'] })).toHaveProperty('parking_types');
  });

  it('rejects an unknown array value', () => {
    expect(errorsOf({ outdoor_spaces: ['pool'] })).toHaveProperty('outdoor_spaces');
    expect(errorsOf({ parking_types: ['helipad'] })).toHaveProperty('parking_types');
  });

  it('de-duplicates repeated array values', () => {
    const result = validateSubjectProperty(input({ outdoor_spaces: ['balcony', 'balcony'] }), YEAR);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.outdoor_spaces).toEqual(['balcony']);
    }
  });
});

describe('validateSubjectProperty — argument lists', () => {
  it('normalises strengths (trim, spaces, empties, accent/case dedup, order)', () => {
    const result = validateSubjectProperty(
      input({ strengths: ['  Calme ', 'CALME', 'calmé', '', 'Lumineux'] }),
      YEAR,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.strengths).toEqual(['Calme', 'Lumineux']);
    }
  });

  it('rejects more than 10 items', () => {
    const eleven = Array.from({ length: 11 }, (_, i) => `Atout ${i}`);
    expect(errorsOf({ strengths: eleven })).toHaveProperty('strengths');
  });

  it('rejects an item longer than 200 characters', () => {
    expect(errorsOf({ watch_points: ['x'.repeat(201)] })).toHaveProperty('watch_points');
  });
});

describe('validateSubjectProperty — valid full payload', () => {
  it('returns the normalised value', () => {
    const result = validateSubjectProperty(
      input({
        district: 'Estagnol',
        floor: 1,
        building_floors: 3,
        ges_rating: 'C',
        exposure: 'south',
        construction_year: 1985,
        general_condition: 'good',
        heating_type: 'individual_gas',
        outdoor_spaces: ['balcony', 'garden'],
        parking_types: ['garage'],
        monthly_charges: 120,
        property_tax: 1400,
        strengths: ['Calme'],
        watch_points: ['Étage sans ascenseur'],
      }),
      YEAR,
    );
    expect(result.ok).toBe(true);
  });
});
