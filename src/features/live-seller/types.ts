import type {
  ComparisonCriterion,
  ComparisonStatus,
  DangerousReason,
  MarketDurationReason,
  PriceCoherence,
  PropertyConfirmed,
  SeriousCompetitor,
} from '@/features/live-seller/constants';
import type { Database } from '@/lib/supabase/database.types';

export type LiveComparableResponse = Database['public']['Tables']['live_seller_responses']['Row'];
export type LiveSellerSummary = Database['public']['Tables']['live_seller_summary']['Row'];

// ---------------------------------------------------------------------------
// Feature comparison (Page 1 engine output)
// ---------------------------------------------------------------------------

// A single criterion outcome. `comparisonStatus` colour ALWAYS describes the
// competitor relative to the subject property.
export type FeatureComparison = {
  criterion: ComparisonCriterion;
  subjectValue: string | null;
  comparableValue: string | null;
  comparisonStatus: ComparisonStatus;
  displayLabel: string;
};

// Normalised feature bundle fed to the engine. Comparable-side fields absent from
// the comparables schema (condition/exposure/outdoor/parking) are simply null →
// they resolve to `unknown` (no invented data).
export type FeatureBundle = {
  surfaceArea: number | null;
  roomsCount: number | null;
  bedroomsCount: number | null;
  generalCondition: string | null;
  energyRating: string | null;
  gesRating: string | null;
  outdoorSpaces: string[] | null;
  parkingTypes: string[] | null;
  exposure: string | null;
};

// ---------------------------------------------------------------------------
// Price reveal / history / duration (Pages 2 & 3)
// ---------------------------------------------------------------------------

export type PriceReveal = {
  currentPrice: number;
  pricePerSquareMeter: number | null;
  sellerEstimate: number | null;
  gapAmount: number | null; // currentPrice - sellerEstimate
  gapPercentage: number | null; // relative to the seller estimate
  // Rank of this comparable among the retained set by price/m² (1 = cheapest).
  relativePosition: { rank: number; total: number } | null;
};

// Minimal price history derived ONLY from stored fields. `available: false` →
// "Historique de prix non disponible". Shaped so a real provider can extend it.
export type PriceHistoryEntry = { price: number; observedAt: string | null; source: string | null };

export type PriceHistory = {
  available: boolean;
  initialPrice: number | null;
  currentPrice: number | null;
  dropCount: number | null;
  totalDropAmount: number | null;
  totalDropPercentage: number | null;
  source: string | null;
  entries: PriceHistoryEntry[];
};

export type MarketDuration = {
  available: boolean;
  days: number | null;
  firstSeenAt: string | null;
  label: string | null; // "Observé sur le marché depuis X jours"
};

// ---------------------------------------------------------------------------
// Final price gaps (Analyse finale)
// ---------------------------------------------------------------------------

export type PriceGap = { amount: number | null; percentage: number | null };

export type LivePriceGaps = {
  sellerPerceivedPrice: number | null;
  competitiveMarketCentral: number | null;
  advisorComparativePrice: number | null;
  sellerVsMarket: PriceGap; // reference = market central
  sellerVsAdvisor: PriceGap; // reference = advisor analysis
  marketVsAdvisor: PriceGap; // reference = advisor analysis
};

// ---------------------------------------------------------------------------
// Seller answer inputs (validated / normalised before persistence)
// ---------------------------------------------------------------------------

export type LiveComparableResponseInput = {
  seller_serious_competitor: SeriousCompetitor | null;
  seller_serious_competitor_comment: string | null;
  seller_estimated_listing_price: number | null;
  seller_price_coherence: PriceCoherence | null;
  seller_price_coherence_comment: string | null;
  seller_estimated_days_on_market: number | null;
  seller_market_duration_reason: MarketDurationReason | null;
  seller_market_duration_comment: string | null;
};

// Server actions deliberately persist only the fields posted by the current
// screen. This prevents a stale form from overwriting answers saved elsewhere.
export type LiveComparableResponsePatch = Partial<LiveComparableResponseInput>;

export type LiveSellerSummaryInput = {
  seller_most_dangerous_comparable_id: string | null;
  seller_most_dangerous_reason: DangerousReason | null;
  seller_most_dangerous_comment: string | null;
  seller_perceived_property_price: number | null;
  advisor_comparative_market_price: number | null;
  // Mission 39 — Act 1 "Votre bien": does the presentation match the seller's bien?
  seller_property_confirmed: PropertyConfirmed | null;
  seller_property_comment: string | null;
};

export type LiveSellerSummaryPatch = Partial<LiveSellerSummaryInput>;
