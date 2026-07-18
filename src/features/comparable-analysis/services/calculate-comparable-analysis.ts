import { analyzeFeatures } from '@/features/comparable-analysis/services/analyze-features';
import { analyzeLocation } from '@/features/comparable-analysis/services/analyze-location';
import { detectOutliers } from '@/features/comparable-analysis/services/detect-outliers';
import type {
  AnalyzedComparable,
  ComparableAnalysis,
  DispersionLevel,
  EnergyClass,
  EnergyDistribution,
  PriceAnalysis,
  SellerComparison,
  SurfaceAnalysis,
} from '@/features/comparable-analysis/types/comparable-analysis';
import {
  calculateComparableSummary,
  mean,
  median,
  pricePerSquareMeter,
} from '@/features/comparables/services/calculate-comparable-summary';
import type { Comparable } from '@/features/comparables/types';

const ENERGY_CLASSES: EnergyClass[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

// Relative spread (%) -> simple, deterministic dispersion label. No statistics.
const LOW_DISPERSION_MAX = 15;
const MEDIUM_DISPERSION_MAX = 30;

// Proximity windows (±10%) for "around the median price" and "near the seller
// surface". Deterministic thresholds, no interpretation.
const NEAR_RATIO = 0.1;

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function toAnalyzed(comparable: Comparable): AnalyzedComparable {
  return {
    id: comparable.id,
    title: comparable.title,
    city: comparable.city,
    price: comparable.price,
    surfaceArea: comparable.surface_area as number,
    pricePerSquareMeter: pricePerSquareMeter(comparable.price, comparable.surface_area) as number,
  };
}

// Exported so the price-positioning engine (Mission 17) reuses the exact same
// dispersion definition on its official calculation set — no competing method.
export function spreadPercent(values: number[], medianValue: number | null): number | null {
  if (values.length === 0 || medianValue == null || medianValue <= 0) {
    return null;
  }
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  return round1(((maximum - minimum) / medianValue) * 100);
}

export function dispersionLevel(percent: number | null): DispersionLevel | null {
  if (percent == null) {
    return null;
  }
  if (percent <= LOW_DISPERSION_MAX) {
    return 'faible';
  }
  if (percent <= MEDIUM_DISPERSION_MAX) {
    return 'moyenne';
  }
  return 'forte';
}

function energyDistribution(values: (string | null)[], total: number): EnergyDistribution {
  const distribution = Object.fromEntries(ENERGY_CLASSES.map((c) => [c, 0])) as Record<
    EnergyClass,
    number
  >;
  let unknown = 0;
  for (const value of values) {
    const letter = value?.trim().toUpperCase();
    if (letter && (ENERGY_CLASSES as string[]).includes(letter)) {
      distribution[letter as EnergyClass] += 1;
    } else {
      unknown += 1;
    }
  }
  return { distribution, unknown, total };
}

function buildSellerComparison(
  analyzed: AnalyzedComparable[],
  subjectSurfaceArea: number | null,
): SellerComparison {
  if (subjectSurfaceArea == null || subjectSurfaceArea <= 0) {
    return {
      hasSellerSurface: false,
      averageSurfaceDifference: null,
      medianSurfaceDifference: null,
      smallerCount: 0,
      largerCount: 0,
    };
  }
  const differences = analyzed.map((comparable) => comparable.surfaceArea - subjectSurfaceArea);
  const averageDifference = mean(differences);
  return {
    hasSellerSurface: true,
    averageSurfaceDifference: averageDifference == null ? null : round1(averageDifference),
    medianSurfaceDifference: median(differences),
    smallerCount: analyzed.filter((c) => c.surfaceArea < subjectSurfaceArea).length,
    largerCount: analyzed.filter((c) => c.surfaceArea > subjectSurfaceArea).length,
  };
}

function buildPriceAnalysis(
  analyzed: AnalyzedComparable[],
  minimumPrice: number | null,
  maximumPrice: number | null,
  medianPrice: number | null,
  medianPricePerSquareMeter: number | null,
): PriceAnalysis {
  const percent = spreadPercent(
    analyzed.map((c) => c.pricePerSquareMeter),
    medianPricePerSquareMeter,
  );
  const byPrice = [...analyzed].sort((a, b) => a.price - b.price);
  const aroundMedian =
    medianPrice == null
      ? []
      : analyzed.filter((c) => Math.abs(c.price - medianPrice) <= medianPrice * NEAR_RATIO);

  return {
    priceRange: minimumPrice != null && maximumPrice != null ? maximumPrice - minimumPrice : null,
    pricePerSquareMeterSpreadPercent: percent,
    dispersion: dispersionLevel(percent),
    cheapest: byPrice[0] ?? null,
    mostExpensive: byPrice[byPrice.length - 1] ?? null,
    aroundMedian,
  };
}

function buildSurfaceAnalysis(
  analyzed: AnalyzedComparable[],
  medianSurfaceArea: number | null,
  subjectSurfaceArea: number | null,
): SurfaceAnalysis {
  const surfaces = analyzed.map((c) => c.surfaceArea);
  const percent = spreadPercent(surfaces, medianSurfaceArea);
  const bySurface = [...analyzed].sort((a, b) => a.surfaceArea - b.surfaceArea);
  const nearSellerSurface =
    subjectSurfaceArea == null || subjectSurfaceArea <= 0
      ? []
      : analyzed.filter(
          (c) => Math.abs(c.surfaceArea - subjectSurfaceArea) <= subjectSurfaceArea * NEAR_RATIO,
        );

  return {
    surfaceRange: surfaces.length > 0 ? Math.max(...surfaces) - Math.min(...surfaces) : null,
    surfaceSpreadPercent: percent,
    dispersion: dispersionLevel(percent),
    smallest: bySurface[0] ?? null,
    largest: bySurface[bySurface.length - 1] ?? null,
    nearSellerSurface,
  };
}

// Single entry point. Analyses ONLY retained comparables that have both a price
// and a surface. Reuses the Mission 15 summary service for every statistic it
// already computes — nothing is recomputed twice. Deterministic, no AI.
export function calculateComparableAnalysis(
  comparables: Comparable[],
  subjectSurfaceArea: number | null,
): ComparableAnalysis {
  const analyzedRows = comparables.filter(
    (comparable) =>
      comparable.is_selected &&
      typeof comparable.price === 'number' &&
      comparable.price > 0 &&
      typeof comparable.surface_area === 'number' &&
      comparable.surface_area > 0,
  );

  // Reuse Mission 15 as-is: passing the already-filtered rows makes its
  // per-metric filters no-ops, so its outputs match the analysed dataset exactly.
  const summary = calculateComparableSummary(analyzedRows);
  const analyzed = analyzedRows.map(toAnalyzed);
  const surfaces = analyzed.map((c) => c.surfaceArea);
  const medianSurfaceArea = median(surfaces);

  return {
    statistics: {
      count: analyzedRows.length,
      averagePrice: summary.averagePrice,
      medianPrice: summary.medianPrice,
      minimumPrice: summary.minimumPrice,
      maximumPrice: summary.maximumPrice,
      averagePricePerSquareMeter: summary.averagePricePerSquareMeter,
      medianPricePerSquareMeter: summary.medianPricePerSquareMeter,
      averageSurfaceArea: summary.averageSurfaceArea,
      medianSurfaceArea: medianSurfaceArea == null ? null : round1(medianSurfaceArea),
    },
    sellerComparison: buildSellerComparison(analyzed, subjectSurfaceArea),
    priceAnalysis: buildPriceAnalysis(
      analyzed,
      summary.minimumPrice,
      summary.maximumPrice,
      summary.medianPrice,
      summary.medianPricePerSquareMeter,
    ),
    surfaceAnalysis: buildSurfaceAnalysis(analyzed, medianSurfaceArea, subjectSurfaceArea),
    locationAnalysis: analyzeLocation(analyzedRows),
    featureAnalysis: analyzeFeatures(analyzedRows),
    dpeAnalysis: energyDistribution(
      analyzedRows.map((c) => c.energy_rating),
      analyzedRows.length,
    ),
    gesAnalysis: energyDistribution(
      analyzedRows.map((c) => c.ges_rating),
      analyzedRows.length,
    ),
    outliers: detectOutliers(analyzed, summary.medianPricePerSquareMeter),
  };
}
