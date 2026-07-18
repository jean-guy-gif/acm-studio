import type {
  ConfidenceLevel,
  DispersionLevel,
  PositioningConfidence,
} from '@/features/price-positioning/types/price-positioning';

export type ConfidenceInput = {
  usedCount: number;
  dispersion: DispersionLevel;
  excludedOutlierCount: number;
  outliersReintroduced: boolean;
  // Proportion (0..1) of used comparables whose surface is within ±10% of the
  // seller surface.
  surfaceProximityRatio: number;
  // Proportion (0..1) of used comparables in the majority location, or null when
  // no location is exploitable.
  geographicMajorityRatio: number | null;
};

function toLevel(score: number): ConfidenceLevel {
  if (score >= 80) {
    return 'very_high';
  }
  if (score >= 60) {
    return 'high';
  }
  if (score >= 40) {
    return 'medium';
  }
  return 'low';
}

// Deterministic business grid (not a statistical probability). Starts at 100 and
// applies fixed penalties. Each weakness is counted once. Called only by
// calculatePricePositioning().
export function calculateConfidence(input: ConfidenceInput): PositioningConfidence {
  const positiveFactors: string[] = [];
  const warningFactors: string[] = [];
  let score = 100;

  // 1. Number of comparables used.
  if (input.usedCount >= 8) {
    positiveFactors.push('Au moins 8 comparables utilisés.');
  } else if (input.usedCount >= 5) {
    score -= 10;
    warningFactors.push('Entre 5 et 7 comparables utilisés.');
  } else if (input.usedCount >= 3) {
    score -= 25;
    warningFactors.push('Seulement 3 à 4 comparables utilisés.');
  } else {
    score -= 45;
    warningFactors.push('Très peu de comparables utilisés (1 à 2).');
  }

  // 2. Dispersion of price/m².
  if (input.dispersion === 'low') {
    positiveFactors.push('Faible dispersion des prix au m².');
  } else if (input.dispersion === 'medium') {
    score -= 15;
    warningFactors.push('Dispersion moyenne des prix au m².');
  } else {
    score -= 30;
    warningFactors.push('Forte dispersion des prix au m².');
  }

  // 3. Atypical comparables — reintroduction penalty REPLACES the exclusion one.
  if (input.outliersReintroduced) {
    score -= 30;
    warningFactors.push('Comparables atypiques réintégrés faute d’échantillon suffisant.');
  } else if (input.excludedOutlierCount >= 2) {
    score -= 10;
    warningFactors.push('Plusieurs comparables atypiques exclus.');
  } else if (input.excludedOutlierCount === 1) {
    score -= 5;
    warningFactors.push('Un comparable atypique exclu.');
  } else {
    positiveFactors.push('Aucun comparable atypique détecté.');
  }

  // 4. Surface proximity (±10% of the seller surface).
  if (input.surfaceProximityRatio >= 0.6) {
    positiveFactors.push('Surfaces majoritairement proches du bien vendeur.');
  } else if (input.surfaceProximityRatio >= 0.3) {
    score -= 10;
    warningFactors.push('Surfaces moyennement proches du bien vendeur.');
  } else {
    score -= 20;
    warningFactors.push('Surfaces éloignées de celle du bien vendeur.');
  }

  // 5. Geographic homogeneity.
  if (input.geographicMajorityRatio == null) {
    score -= 15;
    warningFactors.push('Aucune localisation exploitable.');
  } else if (input.geographicMajorityRatio >= 0.75) {
    positiveFactors.push('Forte homogénéité géographique.');
  } else if (input.geographicMajorityRatio >= 0.5) {
    score -= 10;
    warningFactors.push('Homogénéité géographique moyenne.');
  } else {
    score -= 20;
    warningFactors.push('Comparables géographiquement dispersés.');
  }

  const boundedScore = Math.max(0, Math.min(100, score));

  return {
    score: boundedScore,
    level: toLevel(boundedScore),
    positiveFactors,
    warningFactors,
  };
}
