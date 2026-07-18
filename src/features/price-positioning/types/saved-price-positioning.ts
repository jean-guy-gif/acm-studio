import type {
  ConfidenceLevel,
  DispersionLevel,
} from '@/features/price-positioning/types/price-positioning';

// Bumped whenever the positioning engine's business rules change, so a stored
// snapshot always records which engine produced it.
export const PRICE_POSITIONING_ENGINE_VERSION = 1;

export const MAX_JUSTIFICATION_LENGTH = 1000;

// Compact, versioned business snapshot persisted alongside the decision. It must
// NOT store a full copy of the comparables — only what is needed to understand
// the recorded decision and detect divergence.
export type PositioningSnapshot = {
  engineVersion: number;
  totalEligible: number;
  usedCount: number;
  outlierCount: number;
  excludedOutlierCount: number;
  outliersReintroduced: boolean;
  dispersion: DispersionLevel;
  widthPercentage: 3 | 6 | 10;
  confidenceScore: number;
  confidenceLevel: ConfidenceLevel;
  influentialComparableIds: string[];
  reasons: string[];
};

export type SavedPricePositioning = {
  id: string;
  projectId: string;
  advisorPrice: number;
  sellerPrice: number | null;
  rangeLow: number;
  rangeCentral: number;
  rangeHigh: number;
  confidenceScore: number;
  confidenceLevel: ConfidenceLevel;
  justification: string | null;
  snapshot: PositioningSnapshot;
  validatedAt: string;
  validatedBy: string;
  validatedByName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PositioningFreshness = 'up_to_date' | 'outdated';

// The exact set of criteria compared to decide freshness. Reason texts are
// deliberately excluded to avoid purely editorial divergences.
export type PositioningComparisonKey = {
  rangeLow: number;
  rangeCentral: number;
  rangeHigh: number;
  confidenceScore: number;
  confidenceLevel: ConfidenceLevel;
  usedCount: number;
  influentialComparableIds: string[];
};
