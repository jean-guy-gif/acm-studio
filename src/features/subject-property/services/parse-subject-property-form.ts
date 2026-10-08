import {
  parseTriState,
  type RawSubjectPropertyInput,
} from '@/features/subject-property/services/validate-subject-property';

function textOrNull(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? '').trim();
  return text === '' ? null : text;
}

function numberOrNull(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? '').trim();
  return raw === '' ? null : Number(raw);
}

function integerOrNull(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? '').trim();
  return raw === '' ? null : Number.parseInt(raw, 10);
}

function stringArray(formData: FormData, name: string): string[] {
  return formData.getAll(name).map((value) => String(value));
}

// Reads the seller-property fields of a form: text trimmed, numbers parsed, nothing validated.
export function parseSubjectPropertyForm(formData: FormData): RawSubjectPropertyInput {
  return {
    property_type: textOrNull(formData.get('property_type')),
    surface_area: numberOrNull(formData.get('surface_area')),
    land_area: numberOrNull(formData.get('land_area')),
    rooms_count: integerOrNull(formData.get('rooms_count')),
    bedrooms_count: integerOrNull(formData.get('bedrooms_count')),
    bathrooms_count: integerOrNull(formData.get('bathrooms_count')),
    energy_rating: textOrNull(formData.get('energy_rating')),
    address: textOrNull(formData.get('address')),
    postal_code: textOrNull(formData.get('postal_code')),
    city: textOrNull(formData.get('city')),
    description: textOrNull(formData.get('description')),
    district: textOrNull(formData.get('district')),
    floor: integerOrNull(formData.get('floor')),
    building_floors: integerOrNull(formData.get('building_floors')),
    ges_rating: textOrNull(formData.get('ges_rating')),
    heating_type: textOrNull(formData.get('heating_type')),
    exposure: textOrNull(formData.get('exposure')),
    construction_year: integerOrNull(formData.get('construction_year')),
    general_condition: textOrNull(formData.get('general_condition')),
    has_elevator: parseTriState(textOrNull(formData.get('has_elevator'))),
    has_pool: parseTriState(textOrNull(formData.get('has_pool'))),
    outdoor_spaces: stringArray(formData, 'outdoor_spaces'),
    parking_types: stringArray(formData, 'parking_types'),
    monthly_charges: numberOrNull(formData.get('monthly_charges')),
    property_tax: numberOrNull(formData.get('property_tax')),
    advisor_price_min: numberOrNull(formData.get('advisor_price_min')),
    advisor_price_max: numberOrNull(formData.get('advisor_price_max')),
    strengths: stringArray(formData, 'strengths'),
    watch_points: stringArray(formData, 'watch_points'),
  };
}
