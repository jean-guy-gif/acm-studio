import type { Comparable } from '@/features/comparables/types';

// Shared Comparable factory for the analysis tests. Retained + priced + surfaced
// by default; override any field per scenario.
export function makeComparable(overrides: Partial<Comparable> = {}): Comparable {
  return {
    id: overrides.id ?? Math.random().toString(36).slice(2),
    agency_id: 'agency',
    project_id: 'project',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    display_order: 0,
    is_selected: true,
    title: 'Bien',
    address: null,
    postal_code: null,
    city: 'Antibes',
    district: null,
    surface_area: 50,
    land_area: null,
    rooms_count: null,
    bedrooms_count: null,
    bathrooms_count: null,
    energy_rating: null,
    ges_rating: null,
    construction_year: null,
    heating_type: null,
    energy_source: null,
    source: null,
    listing_url: null,
    listing_description: null,
    listing_features: [],
    photo_urls: [],
    portal_price_per_square_meter: null,
    price: 250000,
    days_on_market: null,
    price_drop_amount: null,
    price_drop_percentage: null,
    advisor_notes: null,
    ...overrides,
  };
}
