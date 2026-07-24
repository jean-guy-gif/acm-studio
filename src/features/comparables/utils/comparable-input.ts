import { parseOptionalNonNegative } from '@/features/comparables/utils/parse-number';
import {
  EXCLUSIVE_NONE,
  EXPOSURES,
  GENERAL_CONDITIONS,
  OUTDOOR_SPACES,
  PARKING_TYPES,
} from '@/features/subject-property/constants/property-options';

// Parsed, validated comparable fields (excludes agency_id, project_id,
// display_order and is_selected, which are set server-side, never by the client).
export type ComparableInput = {
  title: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  surface_area: number | null;
  land_area: number | null;
  rooms_count: number | null;
  bedrooms_count: number | null;
  bathrooms_count: number | null;
  energy_rating: string | null;
  ges_rating: string | null;
  construction_year: number | null;
  heating_type: string | null;
  energy_source: string | null;
  district: string | null;
  portal_price_per_square_meter: number | null;
  listing_url: string | null;
  source: string | null;
  price: number;
  days_on_market: number | null;
  price_drop_amount: number | null;
  price_drop_percentage: number | null;
  advisor_notes: string | null;
  photo_urls: string[];
  listing_description: string | null;
  listing_features: string[];
  // Mission 24 — structured competitive characteristics (mirror subject_property).
  general_condition: string | null;
  exposure: string | null;
  outdoor_spaces: string[];
  parking_types: string[];
};

// Multi-select array: keep only allowed, de-duplicated values (order preserved).
function parseSelectArray(values: FormDataEntryValue[], allowed: readonly string[]): string[] {
  const set = new Set(allowed);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const item = String(value).trim();
    if (item === '' || !set.has(item) || seen.has(item)) {
      continue;
    }
    seen.add(item);
    result.push(item);
  }
  return result;
}

const MAX_PHOTO_URLS = 20;
const MAX_FEATURES = 60;

// Textarea (one feature per line) -> trimmed string array, empties removed.
function parseFeatures(raw: FormDataEntryValue | null): string[] {
  const text = String(raw ?? '');
  if (text.trim() === '') {
    return [];
  }
  const seen = new Set<string>();
  const result: string[] = [];
  for (const line of text.split('\n')) {
    const feature = line.trim();
    if (feature === '' || seen.has(feature)) {
      continue;
    }
    seen.add(feature);
    result.push(feature);
    if (result.length >= MAX_FEATURES) {
      break;
    }
  }
  return result;
}

// Server-side validation of the photo_urls field. Accepts either a JSON array
// (from the URL import) OR a manually entered list (one URL per line / comma-
// separated). Keeps only absolute http(s) URLs, de-duplicates, and caps at 20.
// Never trusts the client blindly (the value may come from an import or be forged).
function parsePhotoUrls(raw: FormDataEntryValue | null): string[] {
  const text = String(raw ?? '').trim();
  if (text === '') {
    return [];
  }
  let parsed: unknown[];
  try {
    const json = JSON.parse(text);
    parsed = Array.isArray(json) ? json : [json];
  } catch {
    // Manual entry: split on newlines / commas.
    parsed = text.split(/[\n,]+/);
  }
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of parsed) {
    if (typeof item !== 'string') {
      continue;
    }
    let url: URL;
    try {
      url = new URL(item.trim());
    } catch {
      continue;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      continue;
    }
    const key = url.toString();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(key);
    if (result.length >= MAX_PHOTO_URLS) {
      break;
    }
  }
  return result;
}

export type ComparableFormResult =
  | { ok: true; input: ComparableInput }
  | { ok: false; error: string; fieldErrors: Record<string, string> };

const INTEGER_FIELDS = new Set([
  'rooms_count',
  'bedrooms_count',
  'bathrooms_count',
  'construction_year',
  'days_on_market',
]);

const NUMERIC_FIELDS = [
  'surface_area',
  'land_area',
  'rooms_count',
  'bedrooms_count',
  'bathrooms_count',
  'construction_year',
  'portal_price_per_square_meter',
  'price',
  'days_on_market',
  'price_drop_amount',
  'price_drop_percentage',
];

export function parseComparableForm(formData: FormData): ComparableFormResult {
  const text = (name: string): string | null => {
    const value = String(formData.get(name) ?? '').trim();
    return value === '' ? null : value;
  };
  const num = (name: string): number | null => {
    const value = String(formData.get(name) ?? '').trim();
    if (value === '') {
      return null;
    }
    return INTEGER_FIELDS.has(name) ? Number.parseInt(value, 10) : Number(value);
  };

  // Field-attributed validation errors: each invalid field is reported next to
  // itself. A general summary message is derived from the first error so the
  // callers that only read `error` (e.g. the edit action) keep a clear message.
  const fieldErrors: Record<string, string> = {};
  for (const name of NUMERIC_FIELDS) {
    if (parseOptionalNonNegative(formData.get(name), INTEGER_FIELDS.has(name)) === 'invalid') {
      fieldErrors[name] = 'La valeur doit être un nombre positif.';
    }
  }

  const price = num('price');
  if (price === null && fieldErrors.price == null) {
    fieldErrors.price = 'Le prix est requis.';
  }

  // Structured competitive characteristics (Mission 24).
  const generalCondition = text('general_condition');
  if (
    generalCondition != null &&
    !(GENERAL_CONDITIONS as readonly string[]).includes(generalCondition)
  ) {
    fieldErrors.general_condition = 'État invalide.';
  }
  const exposure = text('exposure');
  if (exposure != null && !(EXPOSURES as readonly string[]).includes(exposure)) {
    fieldErrors.exposure = 'Exposition invalide.';
  }
  const outdoorSpaces = parseSelectArray(formData.getAll('outdoor_spaces'), OUTDOOR_SPACES);
  if (outdoorSpaces.includes(EXCLUSIVE_NONE) && outdoorSpaces.length > 1) {
    fieldErrors.outdoor_spaces = '« Aucun » ne peut pas être combiné avec un autre choix.';
  }
  const parkingTypes = parseSelectArray(formData.getAll('parking_types'), PARKING_TYPES);
  if (parkingTypes.includes(EXCLUSIVE_NONE) && parkingTypes.length > 1) {
    fieldErrors.parking_types = '« Aucun » ne peut pas être combiné avec un autre choix.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    const summary = fieldErrors.price ?? Object.values(fieldErrors)[0];
    return { ok: false, error: summary, fieldErrors };
  }

  if (price === null) {
    // Unreachable: a null price is already reported above. Narrows the type.
    return {
      ok: false,
      error: 'Le prix est requis.',
      fieldErrors: { price: 'Le prix est requis.' },
    };
  }

  return {
    ok: true,
    input: {
      title: text('title'),
      address: text('address'),
      postal_code: text('postal_code'),
      city: text('city'),
      surface_area: num('surface_area'),
      land_area: num('land_area'),
      rooms_count: num('rooms_count'),
      bedrooms_count: num('bedrooms_count'),
      bathrooms_count: num('bathrooms_count'),
      energy_rating: text('energy_rating'),
      ges_rating: text('ges_rating'),
      construction_year: num('construction_year'),
      heating_type: text('heating_type'),
      energy_source: text('energy_source'),
      district: text('district'),
      portal_price_per_square_meter: num('portal_price_per_square_meter'),
      listing_url: text('listing_url'),
      source: text('source'),
      price,
      days_on_market: num('days_on_market'),
      price_drop_amount: num('price_drop_amount'),
      price_drop_percentage: num('price_drop_percentage'),
      advisor_notes: text('advisor_notes'),
      photo_urls: parsePhotoUrls(formData.get('photo_urls')),
      listing_description: text('listing_description'),
      listing_features: parseFeatures(formData.get('listing_features')),
      general_condition: generalCondition,
      exposure,
      outdoor_spaces: outdoorSpaces,
      parking_types: parkingTypes,
    },
  };
}
