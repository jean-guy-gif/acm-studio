// Deterministic market analysis built ONLY from retained comparables that have
// both a price and a surface. No AI, no persistence — computed on the fly and
// reusable by Builder and later by Live. This type is the Builder business
// contract.

export type DispersionLevel = 'faible' | 'moyenne' | 'forte';

export type EnergyClass = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

// A retained comparable reduced to what the analyses display.
export type AnalyzedComparable = {
  id: string;
  title: string | null;
  city: string | null;
  price: number;
  surfaceArea: number;
  pricePerSquareMeter: number;
};

export type ComparableStatistics = {
  count: number;
  averagePrice: number | null;
  medianPrice: number | null;
  minimumPrice: number | null;
  maximumPrice: number | null;
  averagePricePerSquareMeter: number | null;
  medianPricePerSquareMeter: number | null;
  averageSurfaceArea: number | null;
  medianSurfaceArea: number | null;
};

export type SellerComparison = {
  hasSellerSurface: boolean;
  averageSurfaceDifference: number | null;
  medianSurfaceDifference: number | null;
  smallerCount: number;
  largerCount: number;
};

export type PriceAnalysis = {
  priceRange: number | null;
  pricePerSquareMeterSpreadPercent: number | null;
  dispersion: DispersionLevel | null;
  cheapest: AnalyzedComparable | null;
  mostExpensive: AnalyzedComparable | null;
  aroundMedian: AnalyzedComparable[];
};

export type SurfaceAnalysis = {
  surfaceRange: number | null;
  surfaceSpreadPercent: number | null;
  dispersion: DispersionLevel | null;
  smallest: AnalyzedComparable | null;
  largest: AnalyzedComparable | null;
  nearSellerSurface: AnalyzedComparable[];
};

export type CountEntry = { label: string; count: number };

export type LocationAnalysis = {
  byCity: CountEntry[];
  byDistrict: CountEntry[];
  sources: { manual: number; url: number };
};

export type FeatureAnalysis = {
  total: number;
  features: CountEntry[];
};

export type EnergyDistribution = {
  distribution: Record<EnergyClass, number>;
  unknown: number;
  total: number;
};

export type DpeAnalysis = EnergyDistribution;
export type GesAnalysis = EnergyDistribution;

export type ComparableOutlier = {
  id: string;
  title: string | null;
  pricePerSquareMeter: number;
  medianPricePerSquareMeter: number;
  deviationPercent: number;
};

export type ComparableAnalysis = {
  statistics: ComparableStatistics;
  sellerComparison: SellerComparison;
  priceAnalysis: PriceAnalysis;
  surfaceAnalysis: SurfaceAnalysis;
  locationAnalysis: LocationAnalysis;
  featureAnalysis: FeatureAnalysis;
  dpeAnalysis: DpeAnalysis;
  gesAnalysis: GesAnalysis;
  outliers: ComparableOutlier[];
};
