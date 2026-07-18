// Business contract of the Builder price-positioning engine. Deterministic, no
// AI, no persistence. Reused by Builder now and by Live later.

export type ConfidenceLevel = 'very_high' | 'high' | 'medium' | 'low';

export type MarketPosition =
  'below_observed_market' | 'within_observed_market' | 'above_observed_market';

export type DispersionLevel = 'low' | 'medium' | 'high';

export type PriceDeviation = {
  absolute: number;
  percentage: number | null;
};

export type RecommendedRange = {
  low: number;
  central: number;
  high: number;
  dispersion: DispersionLevel;
  widthPercentage: 3 | 6 | 10;
};

export type PositioningConfidence = {
  score: number;
  level: ConfidenceLevel;
  positiveFactors: string[];
  warningFactors: string[];
};

export type InfluentialComparable = {
  comparableId: string;
  proximityScore: number;
  surfaceDeviationPercentage: number;
  pricePerSquareMeterDeviationPercentage: number;
};

export type PositioningDataset = {
  totalEligible: number;
  usedCount: number;
  outlierCount: number;
  excludedOutlierCount: number;
  outliersReintroduced: boolean;
};

export type PricePositioning = {
  status: 'ready' | 'insufficient_data';
  dataset: PositioningDataset;
  recommendedRange: RecommendedRange | null;
  confidence: PositioningConfidence;
  defaultAdvisorPrice: number | null;
  advisorPrice: number | null;
  sellerPrice: number | null;
  advisorDeviationFromCentral: PriceDeviation | null;
  sellerDeviationFromCentral: PriceDeviation | null;
  sellerDeviationFromAdvisor: PriceDeviation | null;
  advisorMarketPosition: MarketPosition | null;
  sellerMarketPosition: MarketPosition | null;
  influentialComparables: InfluentialComparable[];
  reasons: string[];
};

export type CalculatePricePositioningInput = {
  comparables: import('@/features/comparables/types').Comparable[];
  sellerProperty: {
    surfaceArea: number | null;
    city?: string | null;
    district?: string | null;
  };
  advisorPrice?: number | null;
  sellerPrice?: number | null;
};
