import type { ComparableAnalysis } from '@/features/comparable-analysis/types/comparable-analysis';
import type { ComparableSelectionSummary } from '@/features/comparables/types/comparable-selection-summary';
import type {
  FeatureComparison,
  LiveComparableResponse,
  LivePriceGaps,
  LiveSellerSummary,
  MarketDuration,
  PriceHistory,
  PriceReveal,
} from '@/features/live-seller/types';
import type { PricePositioning } from '@/features/price-positioning/types/price-positioning';
import type { SavedPricePositioning } from '@/features/price-positioning/types/saved-price-positioning';
import type { SubjectPropertyCondominium } from '@/features/subject-property-condominium/types';
import type { SubjectPropertyDiagnostics } from '@/features/subject-property-diagnostics/types';

// Bumped whenever the presentation contract changes, so Live and future exports
// can guarantee compatibility.
export const SELLER_PRESENTATION_VERSION = 2;

// Mission 24 — per-comparable Live comparative bundle. Nothing invented: every
// field is derived from stored data (or null / unavailable).
export type LiveComparableEntry = {
  id: string;
  position: number;
  title: string | null;
  city: string | null;
  district: string | null;
  price: number;
  surfaceArea: number | null;
  pricePerSquareMeter: number | null;
  roomsCount: number | null;
  bedroomsCount: number | null;
  energyRating: string | null;
  gesRating: string | null;
  photoUrl: string | null;
  photoUrls: string[];
  source: 'manual' | 'url';
  listingUrl: string | null;
  isOutlier: boolean;
  featureComparison: FeatureComparison[];
  priceReveal: PriceReveal;
  priceHistory: PriceHistory;
  marketDuration: MarketDuration;
  response: LiveComparableResponse | null;
};

export type LiveAdvisorDecision = {
  advisorPrice: number;
  sellerPrice: number | null;
  justification: string | null;
};

export type LiveComparativeData = {
  comparables: LiveComparableEntry[];
  sellerSummary: LiveSellerSummary | null;
  // "Positionnement observé sur le marché concurrentiel" — the existing engine's
  // central value. Never labelled "vraie valeur du marché".
  competitiveMarketCentral: number | null;
  advisorDecision: LiveAdvisorDecision | null;
  priceGaps: LivePriceGaps;
};

export type SellerPresentationStatus = 'ready' | 'incomplete';

export type SellerPresentationSectionKey =
  | 'property'
  | 'comparables'
  | 'market_analysis'
  | 'price_positioning'
  | 'advisor_decision'
  | 'seller_price'
  | 'warnings';

export type SellerPresentationSectionStatus = 'available' | 'unavailable';

export type SellerPresentationSection = {
  key: SellerPresentationSectionKey;
  order: number;
  title: string;
  status: SellerPresentationSectionStatus;
  reasonUnavailable: string | null;
};

export type SellerPresentationWarning = {
  code: string;
  severity: 'info' | 'warning' | 'blocking';
  message: string;
};

export type PositioningStatus = 'not_saved' | 'up_to_date' | 'outdated';

export type SellerPresentationProject = {
  id: string;
  name: string;
  status: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SellerPresentationProperty = {
  propertyType: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
  postalCode: string | null;
  surfaceArea: number | null;
  roomsCount: number | null;
  bedroomsCount: number | null;
  floor: number | null;
  buildingFloors: number | null;
  exposure: string | null;
  constructionYear: number | null;
  generalCondition: string | null;
  outdoorSpaces: string[];
  parkingTypes: string[];
  monthlyCharges: number | null;
  propertyTax: number | null;
  energyRating: string | null;
  gesRating: string | null;
  heatingType: string | null;
  features: string[];
  watchPoints: string[];
  photoUrls: string[];
};

export type SellerPresentationComparable = {
  id: string;
  position: number;
  title: string | null;
  city: string | null;
  district: string | null;
  price: number;
  surfaceArea: number | null;
  pricePerSquareMeter: number | null;
  roomsCount: number | null;
  bedroomsCount: number | null;
  energyRating: string | null;
  gesRating: string | null;
  photoUrl: string | null;
  source: 'manual' | 'url';
  listingUrl: string | null;
  isOutlier: boolean;
  influenceScore: number | null;
};

export type SellerPresentation = {
  version: number;
  status: SellerPresentationStatus;
  generatedAt: string;

  project: SellerPresentationProject;
  property: SellerPresentationProperty | null;
  diagnostics: SubjectPropertyDiagnostics | null;
  condominium: SubjectPropertyCondominium | null;

  comparables: SellerPresentationComparable[];
  comparableSummary: ComparableSelectionSummary | null;
  marketAnalysis: ComparableAnalysis | null;

  currentPositioning: PricePositioning | null;
  savedPositioning: SavedPricePositioning | null;
  positioningStatus: PositioningStatus;

  sections: SellerPresentationSection[];
  warnings: SellerPresentationWarning[];

  // Mission 24 — Live comparative core. Null when there is no property or no
  // retained comparable to run the narrative on.
  live: LiveComparativeData | null;
};
