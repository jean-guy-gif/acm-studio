import {
  EXCLUSIVE_NONE,
  EXPOSURES,
  GENERAL_CONDITIONS,
  GES_RATINGS,
  HEATING_TYPES,
  MAX_LIST_ITEM_LENGTH,
  MAX_LIST_ITEMS,
  OUTDOOR_SPACES,
  PARKING_TYPES,
} from '@/features/subject-property/constants/property-options';
import { normalizePropertyList } from '@/features/subject-property/services/normalize-property-arrays';

// Parsed but unvalidated seller-property input (numbers already parsed to
// number|null, arrays to string[]). Produced by the action from the FormData.
export type RawSubjectPropertyInput = {
  property_type: string | null;
  surface_area: number | null;
  land_area: number | null;
  rooms_count: number | null;
  bedrooms_count: number | null;
  bathrooms_count: number | null;
  energy_rating: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  description: string | null;
  district: string | null;
  floor: number | null;
  building_floors: number | null;
  ges_rating: string | null;
  heating_type: string | null;
  exposure: string | null;
  construction_year: number | null;
  general_condition: string | null;
  outdoor_spaces: string[];
  parking_types: string[];
  monthly_charges: number | null;
  property_tax: number | null;
  strengths: string[];
  watch_points: string[];
};

export type ValidatedSubjectProperty = RawSubjectPropertyInput;

export type SubjectPropertyValidationResult =
  | { ok: true; value: ValidatedSubjectProperty }
  | { ok: false; fieldErrors: Record<string, string> };

function checkNonNegative(
  value: number | null,
  field: string,
  errors: Record<string, string>,
): void {
  if (value != null && (!Number.isFinite(value) || value < 0)) {
    errors[field] = 'La valeur doit être positive.';
  }
}

function checkInteger(
  value: number | null,
  field: string,
  min: number,
  max: number,
  errors: Record<string, string>,
): void {
  if (value != null && (!Number.isInteger(value) || value < min || value > max)) {
    errors[field] = `La valeur doit être un entier entre ${min} et ${max}.`;
  }
}

function checkEnum(
  value: string | null,
  allowed: readonly string[],
  field: string,
  errors: Record<string, string>,
): void {
  if (value != null && !allowed.includes(value)) {
    errors[field] = 'Valeur non autorisée.';
  }
}

// Validates a controlled multi-value array: every value must be allowed and the
// exclusive "none" must never coexist with another value. Returns the de-duped
// array (order preserved).
function checkControlledArray(
  values: string[],
  allowed: readonly string[],
  field: string,
  errors: Record<string, string>,
): string[] {
  const deduped = [...new Set(values)];
  if (deduped.some((value) => !allowed.includes(value))) {
    errors[field] = 'Une valeur sélectionnée n’est pas autorisée.';
  }
  if (deduped.includes(EXCLUSIVE_NONE) && deduped.length > 1) {
    errors[field] = '« Aucun » ne peut pas être combiné avec une autre valeur.';
  }
  return deduped;
}

// Normalises then validates a free-text list (≤10 items, ≤200 chars each).
function checkList(values: string[], field: string, errors: Record<string, string>): string[] {
  const normalized = normalizePropertyList(values);
  if (normalized.length > MAX_LIST_ITEMS) {
    errors[field] = `Maximum ${MAX_LIST_ITEMS} éléments.`;
  }
  if (normalized.some((item) => item.length > MAX_LIST_ITEM_LENGTH)) {
    errors[field] = `Chaque élément est limité à ${MAX_LIST_ITEM_LENGTH} caractères.`;
  }
  return normalized;
}

// Deterministic, pure validation of the whole seller-property payload. Never
// throws. currentYear is injectable for testing (defaults to the real year).
export function validateSubjectProperty(
  input: RawSubjectPropertyInput,
  options?: { currentYear?: number },
): SubjectPropertyValidationResult {
  const currentYear = options?.currentYear ?? new Date().getFullYear();
  const errors: Record<string, string> = {};

  checkNonNegative(input.surface_area, 'surface_area', errors);
  checkNonNegative(input.land_area, 'land_area', errors);
  checkNonNegative(input.rooms_count, 'rooms_count', errors);
  checkNonNegative(input.bedrooms_count, 'bedrooms_count', errors);
  checkNonNegative(input.bathrooms_count, 'bathrooms_count', errors);
  checkNonNegative(input.monthly_charges, 'monthly_charges', errors);
  checkNonNegative(input.property_tax, 'property_tax', errors);

  checkInteger(input.floor, 'floor', -1, 200, errors);
  checkInteger(input.building_floors, 'building_floors', 0, 200, errors);
  if (
    input.floor != null &&
    input.building_floors != null &&
    errors.floor == null &&
    errors.building_floors == null &&
    input.floor > input.building_floors
  ) {
    errors.floor = 'L’étage ne peut pas dépasser le nombre total d’étages.';
  }
  checkInteger(input.construction_year, 'construction_year', 1500, currentYear + 1, errors);

  checkEnum(input.ges_rating, GES_RATINGS, 'ges_rating', errors);
  checkEnum(input.exposure, EXPOSURES, 'exposure', errors);
  checkEnum(input.general_condition, GENERAL_CONDITIONS, 'general_condition', errors);
  checkEnum(input.heating_type, HEATING_TYPES, 'heating_type', errors);

  const outdoorSpaces = checkControlledArray(
    input.outdoor_spaces,
    OUTDOOR_SPACES,
    'outdoor_spaces',
    errors,
  );
  const parkingTypes = checkControlledArray(
    input.parking_types,
    PARKING_TYPES,
    'parking_types',
    errors,
  );
  const strengths = checkList(input.strengths, 'strengths', errors);
  const watchPoints = checkList(input.watch_points, 'watch_points', errors);

  if (Object.keys(errors).length > 0) {
    return { ok: false, fieldErrors: errors };
  }

  return {
    ok: true,
    value: {
      ...input,
      outdoor_spaces: outdoorSpaces,
      parking_types: parkingTypes,
      strengths,
      watch_points: watchPoints,
    },
  };
}
