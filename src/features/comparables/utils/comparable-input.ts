import { parseOptionalNonNegative } from '@/features/comparables/utils/parse-number';

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
};

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

// Server-side validation of the photo_urls hidden field: parse the JSON array,
// keep only absolute http(s) URLs, de-duplicate, and cap at 20. Never trusts
// the client blindly (the value may come from an import or be forged).
function parsePhotoUrls(raw: FormDataEntryValue | null): string[] {
  const text = String(raw ?? '').trim();
  if (text === '') {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) {
    return [];
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
  { ok: true; input: ComparableInput } | { ok: false; error: string };

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

  for (const name of NUMERIC_FIELDS) {
    if (parseOptionalNonNegative(formData.get(name), INTEGER_FIELDS.has(name)) === 'invalid') {
      return { ok: false, error: 'Les valeurs numériques doivent être positives.' };
    }
  }

  const price = num('price');
  if (price === null) {
    return { ok: false, error: 'Le prix est requis.' };
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
    },
  };
}
