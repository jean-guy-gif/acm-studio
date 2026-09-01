// Mission 24 — Live seller comparative core. Domain vocabulary + deterministic
// ordering constants. No business logic here; pure reference data reused by the
// comparison engine, the validators and the UI.

// ---------------------------------------------------------------------------
// Seller answers
// ---------------------------------------------------------------------------
export const SERIOUS_COMPETITOR_VALUES = ['yes', 'no', 'unsure'] as const;
export type SeriousCompetitor = (typeof SERIOUS_COMPETITOR_VALUES)[number];

export const SERIOUS_COMPETITOR_LABELS: Record<SeriousCompetitor, string> = {
  yes: 'Oui, un concurrent sérieux',
  no: 'Non',
  unsure: 'Incertain',
};

// Mission 39 — Act 1 "Votre bien": the seller recognises the property.
export const PROPERTY_CONFIRMED_VALUES = ['yes', 'no'] as const;
export type PropertyConfirmed = (typeof PROPERTY_CONFIRMED_VALUES)[number];

export const PROPERTY_CONFIRMED_LABELS: Record<PropertyConfirmed, string> = {
  yes: 'Oui, c’est bien mon bien',
  no: 'Non, il y a des choses à corriger',
};

export const MARKET_DURATION_REASONS = [
  'price_too_high',
  'condition',
  'location',
  'presentation',
  'work_required',
  'strong_competition',
  'not_enough_exposure',
  'unknown',
  'other',
] as const;
export type MarketDurationReason = (typeof MARKET_DURATION_REASONS)[number];

export const MARKET_DURATION_REASON_LABELS: Record<MarketDurationReason, string> = {
  price_too_high: 'Prix trop élevé',
  condition: 'État du bien',
  location: 'Localisation',
  presentation: 'Présentation de l’annonce',
  work_required: 'Travaux à prévoir',
  strong_competition: 'Forte concurrence',
  not_enough_exposure: 'Manque de visibilité',
  unknown: 'Je ne sais pas',
  other: 'Autre',
};

export const DANGEROUS_REASONS = [
  'better_value',
  'better_condition',
  'better_location',
  'better_surface',
  'better_outdoor',
  'better_features',
  'more_attractive_price',
  'other',
] as const;
export type DangerousReason = (typeof DANGEROUS_REASONS)[number];

export const DANGEROUS_REASON_LABELS: Record<DangerousReason, string> = {
  better_value: 'Meilleur rapport qualité/prix',
  better_condition: 'Meilleur état',
  better_location: 'Meilleure localisation',
  better_surface: 'Plus grande surface',
  better_outdoor: 'Meilleur extérieur',
  better_features: 'Meilleures prestations',
  more_attractive_price: 'Prix plus attractif',
  other: 'Autre',
};

export const MAX_LIVE_COMMENT_LENGTH = 2000;
export const MAX_LIVE_PRICE = 1_000_000_000;
export const MAX_ESTIMATED_DAYS_ON_MARKET = 36_500;

// ---------------------------------------------------------------------------
// Deterministic feature-comparison ordering (higher rank = better)
// ---------------------------------------------------------------------------

// General condition, best → worst. Reused from the subject-property vocabulary.
export const CONDITION_ORDER = [
  'new',
  'excellent',
  'good',
  'to_refresh',
  'to_renovate',
  'major_renovation',
] as const;

// Energy / GES letters, best (A) → worst (G).
export const ENERGY_LETTER_ORDER = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;

// Explicit business ranking of exposures (higher = more desirable). Values match
// the subject-property `exposure` check constraint. `unknown`/`multiple` are
// deliberately neutral (null rank → not compared).
export const EXPOSURE_RANK: Record<string, number | null> = {
  north: 1,
  north_east: 2,
  north_west: 2,
  east: 3,
  west: 3,
  south_east: 4,
  south_west: 4,
  south: 5,
  dual_aspect: 5,
  multiple: null,
  unknown: null,
};

// Surface is "similar" within this relative tolerance (MVP rule).
export const SURFACE_SIMILARITY_TOLERANCE = 0.05;

// The criteria the comparison engine evaluates, in display order.
export const COMPARISON_CRITERIA = [
  'surface',
  'rooms',
  'bedrooms',
  'condition',
  'energy_rating',
  'ges_rating',
  'outdoor',
  'parking',
  'exposure',
] as const;
export type ComparisonCriterion = (typeof COMPARISON_CRITERIA)[number];

export const COMPARISON_CRITERION_LABELS: Record<ComparisonCriterion, string> = {
  surface: 'Surface',
  rooms: 'Pièces',
  bedrooms: 'Chambres',
  condition: 'État général',
  energy_rating: 'DPE',
  ges_rating: 'GES',
  outdoor: 'Extérieur',
  parking: 'Stationnement',
  exposure: 'Exposition',
};

export type ComparisonStatus = 'same' | 'competitor_advantage' | 'competitor_weakness' | 'unknown';
