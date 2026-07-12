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
  listing_url: string | null;
  source: string | null;
  price: number;
  days_on_market: number | null;
  price_drop_amount: number | null;
  price_drop_percentage: number | null;
  advisor_notes: string | null;
};

export type ComparableFormResult =
  { ok: true; input: ComparableInput } | { ok: false; error: string };

const INTEGER_FIELDS = new Set([
  'rooms_count',
  'bedrooms_count',
  'bathrooms_count',
  'days_on_market',
]);

const NUMERIC_FIELDS = [
  'surface_area',
  'land_area',
  'rooms_count',
  'bedrooms_count',
  'bathrooms_count',
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
      listing_url: text('listing_url'),
      source: text('source'),
      price,
      days_on_market: num('days_on_market'),
      price_drop_amount: num('price_drop_amount'),
      price_drop_percentage: num('price_drop_percentage'),
      advisor_notes: text('advisor_notes'),
    },
  };
}
