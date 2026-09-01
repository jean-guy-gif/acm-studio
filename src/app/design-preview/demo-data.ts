import { makeComparable } from '@/features/comparable-analysis/services/test-helpers';
import type { LiveComparableResponse, LiveSellerSummary } from '@/features/live-seller/types';
import type { SavedPricePositioning } from '@/features/price-positioning/types/saved-price-positioning';
import type { Project } from '@/features/projects/types';
import type { SubjectProperty } from '@/features/subject-property/types';

// ---------------------------------------------------------------------------
// Données de démonstration des aperçus design (« /design-preview »).
// 100 % fictives et clairement identifiées comme telles (« Démo ») : aucune
// donnée métier réelle. Partagées entre l'aperçu du Live vendeur et l'aperçu
// du shell applicatif.
// ---------------------------------------------------------------------------

export const DEMO_AT = '2026-08-01T10:00:00.000Z';

export const demoProject: Project = {
  id: 'design-preview',
  agency_id: 'demo',
  advisor_id: 'demo',
  seller_name: 'M. et Mme Démo',
  seller_email: null,
  seller_phone: null,
  status: 'draft',
  created_at: DEMO_AT,
  updated_at: DEMO_AT,
};

export const demoProperty: SubjectProperty = {
  id: 'sp-demo',
  agency_id: 'demo',
  project_id: 'design-preview',
  address: '12 avenue des Mimosas',
  city: 'Nice',
  postal_code: '06000',
  advisor_price_min: null,
  advisor_price_max: null,
  property_type: 'apartment',
  surface_area: 72,
  land_area: null,
  rooms_count: 3,
  bedrooms_count: 2,
  bathrooms_count: 1,
  energy_rating: 'C',
  ges_rating: 'C',
  description: null,
  strengths: ['Traversant', 'Balcon sud'],
  weaknesses: null,
  photo_urls: [],
  district: 'Libération',
  floor: 3,
  building_floors: 5,
  heating_type: null,
  exposure: 'south',
  construction_year: 1975,
  general_condition: 'good',
  outdoor_spaces: ['balcony'],
  parking_types: [],
  monthly_charges: null,
  property_tax: null,
  watch_points: [],
  created_at: DEMO_AT,
  updated_at: DEMO_AT,
};

const photos = (indices: number[]) => indices.map((i) => `/design-preview/photo-${i}.jpg`);

export const demoComparables = [
  makeComparable({
    id: 'demo-a',
    title: 'Appartement 3 pièces — Démo A',
    city: 'Nice',
    district: 'Cimiez',
    surface_area: 70,
    rooms_count: 3,
    bedrooms_count: 2,
    price: 385000,
    energy_rating: 'B',
    ges_rating: 'B',
    general_condition: 'excellent',
    exposure: 'south_west',
    outdoor_spaces: ['terrace'],
    parking_types: ['garage'],
    days_on_market: 112,
    price_drop_amount: 20000,
    price_drop_percentage: 4.9,
    photo_urls: photos([1, 2, 3, 4, 5]),
  }),
  makeComparable({
    id: 'demo-b',
    title: 'Appartement 3 pièces — Démo B',
    city: 'Nice',
    district: 'Libération',
    surface_area: 74,
    rooms_count: 3,
    bedrooms_count: 2,
    price: 349000,
    energy_rating: 'D',
    ges_rating: 'D',
    general_condition: 'to_refresh',
    exposure: 'north',
    outdoor_spaces: [],
    parking_types: [],
    days_on_market: 47,
    photo_urls: photos([2, 6, 4]),
  }),
  makeComparable({
    id: 'demo-c',
    title: 'Appartement 4 pièces — Démo C',
    city: 'Nice',
    district: 'Musiciens',
    surface_area: 82,
    rooms_count: 4,
    bedrooms_count: 3,
    price: 430000,
    energy_rating: 'C',
    ges_rating: 'C',
    general_condition: 'good',
    exposure: 'east',
    outdoor_spaces: ['balcony'],
    parking_types: ['outdoor_parking'],
    days_on_market: 203,
    price_drop_amount: 15000,
    price_drop_percentage: 3.4,
    photo_urls: photos([3, 5, 1, 6]),
  }),
];

export const demoSavedPositioning: SavedPricePositioning = {
  id: 'saved-demo',
  projectId: 'design-preview',
  advisorPrice: 375000,
  sellerPrice: 402000,
  rangeLow: 355000,
  rangeCentral: 372000,
  rangeHigh: 391000,
  confidenceScore: 72,
  confidenceLevel: 'high',
  justification:
    'Trois concurrents directs dans le même secteur ; le bien se distingue par son balcon sud et son état général.',
  snapshot: {
    engineVersion: 1,
    totalEligible: 3,
    usedCount: 3,
    outlierCount: 0,
    excludedOutlierCount: 0,
    outliersReintroduced: false,
    dispersion: 'medium',
    widthPercentage: 10,
    confidenceScore: 72,
    confidenceLevel: 'high',
    influentialComparableIds: ['demo-a', 'demo-b'],
    reasons: [],
  },
  validatedAt: DEMO_AT,
  validatedBy: 'demo',
  validatedByName: 'Conseiller Démo',
  createdAt: DEMO_AT,
  updatedAt: DEMO_AT,
};

function demoResponse(overrides: Partial<LiveComparableResponse>): LiveComparableResponse {
  return {
    id: `resp-${overrides.comparable_id}`,
    project_id: 'design-preview',
    agency_id: 'demo',
    comparable_id: null,
    seller_serious_competitor: null,
    seller_serious_competitor_comment: null,
    seller_estimated_listing_price: null,
    seller_estimated_days_on_market: null,
    seller_market_duration_reason: null,
    seller_market_duration_comment: null,
    created_at: DEMO_AT,
    updated_at: DEMO_AT,
    ...overrides,
  };
}

export const demoAnsweredResponses: LiveComparableResponse[] = [
  demoResponse({
    comparable_id: 'demo-a',
    seller_serious_competitor: 'yes',
    seller_estimated_listing_price: 360000,
    seller_estimated_days_on_market: 45,
    seller_market_duration_reason: 'price_too_high',
  }),
  demoResponse({
    comparable_id: 'demo-b',
    seller_serious_competitor: 'unsure',
    seller_estimated_listing_price: 330000,
    seller_estimated_days_on_market: 30,
    seller_market_duration_reason: 'work_required',
  }),
  demoResponse({
    comparable_id: 'demo-c',
    seller_serious_competitor: 'yes',
    seller_estimated_listing_price: 400000,
    seller_estimated_days_on_market: 90,
    seller_market_duration_reason: 'strong_competition',
  }),
];

export const demoAnsweredSummary: LiveSellerSummary = {
  id: 'summary-demo',
  project_id: 'design-preview',
  agency_id: 'demo',
  seller_most_dangerous_comparable_id: 'demo-a',
  seller_most_dangerous_reason: 'better_condition',
  seller_most_dangerous_comment: null,
  seller_perceived_property_price: 398000,
  advisor_comparative_market_price: 372000,
  seller_property_confirmed: 'yes',
  seller_property_comment: null,
  created_at: DEMO_AT,
  updated_at: DEMO_AT,
};
