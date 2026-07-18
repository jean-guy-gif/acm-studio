import {
  dispersionLevel,
  spreadPercent,
} from '@/features/comparable-analysis/services/calculate-comparable-analysis';
import { calculateComparableAnalysis } from '@/features/comparable-analysis/services/calculate-comparable-analysis';
import type { DispersionLevel as AnalysisDispersion } from '@/features/comparable-analysis/types/comparable-analysis';
import {
  countCanonical,
  normalizeLabel,
} from '@/features/comparable-analysis/utils/normalize-label';
import {
  median,
  pricePerSquareMeter,
} from '@/features/comparables/services/calculate-comparable-summary';
import type { Comparable } from '@/features/comparables/types';
import { calculateConfidence } from '@/features/price-positioning/services/calculate-confidence';
import {
  calculatePriceDeviation,
  resolveMarketPosition,
} from '@/features/price-positioning/services/calculate-price-deviation';
import { findInfluentialComparables } from '@/features/price-positioning/services/find-influential-comparables';
import type {
  CalculatePricePositioningInput,
  DispersionLevel,
  PositioningDataset,
  PricePositioning,
} from '@/features/price-positioning/types/price-positioning';

const SURFACE_PROXIMITY_RATIO = 0.1;
const MIN_USED = 3;
// Minimum share of the official set that must carry a district before the
// district (rather than the city) is used for the geographic homogeneity score.
const MIN_DISTRICT_COVERAGE_RATIO = 0.5;
const WIDTH_BY_DISPERSION: Record<DispersionLevel, 3 | 6 | 10> = { low: 3, medium: 6, high: 10 };

function isEligible(comparable: Comparable): boolean {
  return (
    comparable.is_selected &&
    typeof comparable.price === 'number' &&
    comparable.price > 0 &&
    typeof comparable.surface_area === 'number' &&
    comparable.surface_area > 0
  );
}

function toEnglishDispersion(level: AnalysisDispersion | null): DispersionLevel {
  if (level === 'moyenne') {
    return 'medium';
  }
  if (level === 'forte') {
    return 'high';
  }
  return 'low';
}

function officialPricesPerSquareMeter(official: Comparable[]): number[] {
  return official
    .map((comparable) => pricePerSquareMeter(comparable.price, comparable.surface_area))
    .filter((value): value is number => value != null);
}

// Proportion (0..1) of the official set located in the majority location, or null
// when no location is exploitable. Prefers the district when it is filled for at
// least half of the set, otherwise the city. Reuses the Mission 16 normalisation.
function geographicMajorityRatio(official: Comparable[]): number | null {
  const usedCount = official.length;
  if (usedCount === 0) {
    return null;
  }
  const districtsFilled = official.filter(
    (comparable) => normalizeLabel(comparable.district) != null,
  ).length;
  const useDistrict = districtsFilled >= usedCount * MIN_DISTRICT_COVERAGE_RATIO;
  const groups = countCanonical(
    official.map((comparable) => (useDistrict ? comparable.district : comparable.city)),
  );
  if (groups.length === 0) {
    return null;
  }
  return groups[0].count / usedCount;
}

function buildReasons(params: {
  usedCount: number;
  dispersion: DispersionLevel;
  excludedOutlierCount: number;
  outliersReintroduced: boolean;
  surfaceProximityRatio: number;
  geographicMajorityRatio: number | null;
}): string[] {
  const reasons: string[] = [];
  const plural = params.usedCount > 1 ? 's' : '';
  reasons.push(
    `Le positionnement repose sur ${params.usedCount} comparable${plural} exploitable${plural}.`,
  );

  if (params.dispersion === 'low') {
    reasons.push('Le marché observé présente une faible dispersion des prix au m².');
  } else if (params.dispersion === 'medium') {
    reasons.push('Le marché observé présente une dispersion moyenne des prix au m².');
  } else {
    reasons.push('Le marché observé présente une forte dispersion des prix au m².');
  }

  if (params.outliersReintroduced) {
    reasons.push(
      'Les comparables atypiques ont été réintégrés afin de conserver un échantillon suffisant.',
    );
  } else if (params.excludedOutlierCount === 1) {
    reasons.push('Un comparable atypique a été exclu du calcul.');
  } else if (params.excludedOutlierCount >= 2) {
    reasons.push(`${params.excludedOutlierCount} comparables atypiques ont été exclus du calcul.`);
  }

  if (params.surfaceProximityRatio >= 0.6) {
    reasons.push('La majorité des comparables présente une surface proche du bien vendeur.');
  } else if (params.surfaceProximityRatio < 0.3) {
    reasons.push('Peu de comparables présentent une surface proche du bien vendeur.');
  }

  if (params.geographicMajorityRatio == null) {
    reasons.push('Aucune localisation exploitable pour les comparables.');
  } else if (params.geographicMajorityRatio >= 0.75) {
    reasons.push('Les comparables sont principalement situés dans la même localisation.');
  } else if (params.geographicMajorityRatio < 0.5) {
    reasons.push('Les données disponibles sont géographiquement dispersées.');
  }

  if (params.usedCount < MIN_USED) {
    reasons.push('Peu de comparables exploitables sont disponibles.');
  }

  return [...new Set(reasons)];
}

const EMPTY_DATASET: PositioningDataset = {
  totalEligible: 0,
  usedCount: 0,
  outlierCount: 0,
  excludedOutlierCount: 0,
  outliersReintroduced: false,
};

// Single entry point of the positioning engine. Reuses calculateComparableAnalysis
// (Mission 16) for the market analysis and the Mission 15/16 primitives (median,
// price/m², dispersion, location normalisation). Deterministic, no persistence,
// no AI. Never returns NaN or Infinity.
export function calculatePricePositioning(input: CalculatePricePositioningInput): PricePositioning {
  const sellerSurface = input.sellerProperty.surfaceArea;
  const eligible = input.comparables.filter(isEligible);
  const analysis = calculateComparableAnalysis(input.comparables, sellerSurface ?? null);
  const eligibleMedian = analysis.statistics.medianPricePerSquareMeter;

  // Preconditions.
  const reasons: string[] = [];
  if (sellerSurface == null || !Number.isFinite(sellerSurface) || sellerSurface <= 0) {
    reasons.push('La surface du bien vendeur est inconnue ou invalide.');
  }
  if (eligible.length < 1) {
    reasons.push('Aucun comparable retenu ne possède un prix et une surface valides.');
  }
  if (eligibleMedian == null || eligibleMedian <= 0) {
    reasons.push('La médiane de prix au m² ne peut pas être calculée.');
  }

  if (reasons.length > 0) {
    return {
      status: 'insufficient_data',
      dataset: {
        ...EMPTY_DATASET,
        totalEligible: eligible.length,
        outlierCount: analysis.outliers.length,
      },
      recommendedRange: null,
      confidence: { score: 0, level: 'low', positiveFactors: [], warningFactors: [...reasons] },
      defaultAdvisorPrice: null,
      advisorPrice: null,
      sellerPrice: null,
      advisorDeviationFromCentral: null,
      sellerDeviationFromCentral: null,
      sellerDeviationFromAdvisor: null,
      advisorMarketPosition: null,
      sellerMarketPosition: null,
      influentialComparables: [],
      reasons,
    };
  }

  const validSellerSurface = sellerSurface as number;
  const validEligibleMedian = eligibleMedian as number;

  // Official calculation set: exclude outliers when at least 3 remain, otherwise
  // reintroduce all eligible comparables.
  const outlierIds = new Set(analysis.outliers.map((outlier) => outlier.id));
  const outlierCount = eligible.filter((comparable) => outlierIds.has(comparable.id)).length;
  const afterExclusion = eligible.filter((comparable) => !outlierIds.has(comparable.id));

  let official: Comparable[];
  let excludedOutlierCount: number;
  let outliersReintroduced: boolean;
  if (afterExclusion.length >= MIN_USED) {
    official = afterExclusion;
    excludedOutlierCount = outlierCount;
    outliersReintroduced = false;
  } else {
    official = eligible;
    excludedOutlierCount = 0;
    outliersReintroduced = outlierCount > 0;
  }
  const usedCount = official.length;

  // Median recomputed ONLY when the official set differs from the analysed set.
  const officialMedian: number =
    excludedOutlierCount > 0
      ? (median(officialPricesPerSquareMeter(official)) ?? validEligibleMedian)
      : validEligibleMedian;

  // Dispersion using the exact Mission 16 definition, on the official set.
  const officialDispersion: DispersionLevel =
    excludedOutlierCount > 0
      ? toEnglishDispersion(
          dispersionLevel(spreadPercent(officialPricesPerSquareMeter(official), officialMedian)),
        )
      : toEnglishDispersion(analysis.priceAnalysis.dispersion);

  // Recommended range — fixed widths, rounded to the nearest euro.
  const central = Math.round(officialMedian * validSellerSurface);
  const widthPercentage = WIDTH_BY_DISPERSION[officialDispersion];
  const low = Math.round(central * (1 - widthPercentage / 100));
  const high = Math.round(central * (1 + widthPercentage / 100));

  // Confidence inputs.
  const nearSurfaceCount = official.filter(
    (comparable) =>
      Math.abs((comparable.surface_area as number) - validSellerSurface) / validSellerSurface <=
      SURFACE_PROXIMITY_RATIO,
  ).length;
  const surfaceProximityRatio = nearSurfaceCount / usedCount;
  const geoMajority = geographicMajorityRatio(official);

  const confidence = calculateConfidence({
    usedCount,
    dispersion: officialDispersion,
    excludedOutlierCount,
    outliersReintroduced,
    surfaceProximityRatio,
    geographicMajorityRatio: geoMajority,
  });

  // Prices (never persisted). Advisor defaults to the central value.
  const defaultAdvisorPrice = central;
  const advisorPrice =
    input.advisorPrice != null && Number.isFinite(input.advisorPrice) && input.advisorPrice > 0
      ? input.advisorPrice
      : central;
  const sellerPrice =
    input.sellerPrice != null && Number.isFinite(input.sellerPrice) && input.sellerPrice > 0
      ? input.sellerPrice
      : null;

  const influentialComparables = findInfluentialComparables(
    official,
    validSellerSurface,
    officialMedian,
  );

  return {
    status: 'ready',
    dataset: {
      totalEligible: eligible.length,
      usedCount,
      outlierCount,
      excludedOutlierCount,
      outliersReintroduced,
    },
    recommendedRange: { low, central, high, dispersion: officialDispersion, widthPercentage },
    confidence,
    defaultAdvisorPrice,
    advisorPrice,
    sellerPrice,
    advisorDeviationFromCentral: calculatePriceDeviation(advisorPrice, central),
    sellerDeviationFromCentral:
      sellerPrice == null ? null : calculatePriceDeviation(sellerPrice, central),
    sellerDeviationFromAdvisor:
      sellerPrice == null ? null : calculatePriceDeviation(sellerPrice, advisorPrice),
    advisorMarketPosition: resolveMarketPosition(advisorPrice, low, high),
    sellerMarketPosition:
      sellerPrice == null ? null : resolveMarketPosition(sellerPrice, low, high),
    influentialComparables,
    reasons: buildReasons({
      usedCount,
      dispersion: officialDispersion,
      excludedOutlierCount,
      outliersReintroduced,
      surfaceProximityRatio,
      geographicMajorityRatio: geoMajority,
    }),
  };
}
