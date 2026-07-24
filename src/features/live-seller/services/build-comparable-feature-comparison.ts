import {
  COMPARISON_CRITERIA,
  COMPARISON_CRITERION_LABELS,
  CONDITION_ORDER,
  ENERGY_LETTER_ORDER,
  EXPOSURE_RANK,
  SURFACE_SIMILARITY_TOLERANCE,
  type ComparisonCriterion,
  type ComparisonStatus,
} from '@/features/live-seller/constants';
import type { FeatureBundle, FeatureComparison } from '@/features/live-seller/types';

// Pure, deterministic comparison engine (Page 1). No AI, no invented conclusions.
// The status colour ALWAYS describes the competitor relative to the subject:
//   same                 -> equivalent (black/bold in the UI)
//   competitor_advantage -> the competitor is better (green)
//   competitor_weakness  -> the competitor is worse (orange)
//   unknown              -> a value is missing on either side (neutral)

function rankStatus(subjectRank: number | null, comparableRank: number | null): ComparisonStatus {
  if (subjectRank == null || comparableRank == null) {
    return 'unknown';
  }
  if (comparableRank === subjectRank) {
    return 'same';
  }
  return comparableRank > subjectRank ? 'competitor_advantage' : 'competitor_weakness';
}

// Higher order-value = better; the constant lists best → worst, so a LOWER index
// is better. We invert to a rank where higher = better for `rankStatus`.
function orderedRank(order: readonly string[], value: string | null): number | null {
  if (value == null) {
    return null;
  }
  const index = order.indexOf(value);
  return index === -1 ? null : order.length - index;
}

function surfaceStatus(subject: number | null, comparable: number | null): ComparisonStatus {
  if (subject == null || subject <= 0 || comparable == null || comparable <= 0) {
    return 'unknown';
  }
  if (Math.abs(comparable - subject) / subject <= SURFACE_SIMILARITY_TOLERANCE) {
    return 'same';
  }
  return comparable > subject ? 'competitor_advantage' : 'competitor_weakness';
}

// Strict equality for counts; more = advantage, fewer = weakness.
function countStatus(subject: number | null, comparable: number | null): ComparisonStatus {
  if (subject == null || comparable == null) {
    return 'unknown';
  }
  if (comparable === subject) {
    return 'same';
  }
  return comparable > subject ? 'competitor_advantage' : 'competitor_weakness';
}

// Presence/quantity of a set-valued amenity (outdoor spaces, parking). `none`
// counts as absence. Unknown when either side is not provided.
function amenityStatus(subject: string[] | null, comparable: string[] | null): ComparisonStatus {
  if (subject == null || comparable == null) {
    return 'unknown';
  }
  const count = (list: string[]) => list.filter((item) => item && item !== 'none').length;
  const s = count(subject);
  const c = count(comparable);
  if (c === s) {
    return 'same';
  }
  return c > s ? 'competitor_advantage' : 'competitor_weakness';
}

function amenityLabel(list: string[] | null): string | null {
  if (list == null) {
    return null;
  }
  const kept = list.filter((item) => item && item !== 'none');
  return kept.length > 0 ? kept.join(', ') : 'Aucun';
}

function statusFor(
  criterion: ComparisonCriterion,
  subject: FeatureBundle,
  comparable: FeatureBundle,
): ComparisonStatus {
  switch (criterion) {
    case 'surface':
      return surfaceStatus(subject.surfaceArea, comparable.surfaceArea);
    case 'rooms':
      return countStatus(subject.roomsCount, comparable.roomsCount);
    case 'bedrooms':
      return countStatus(subject.bedroomsCount, comparable.bedroomsCount);
    case 'condition':
      return rankStatus(
        orderedRank(CONDITION_ORDER, subject.generalCondition),
        orderedRank(CONDITION_ORDER, comparable.generalCondition),
      );
    case 'energy_rating':
      return rankStatus(
        orderedRank(ENERGY_LETTER_ORDER, subject.energyRating),
        orderedRank(ENERGY_LETTER_ORDER, comparable.energyRating),
      );
    case 'ges_rating':
      return rankStatus(
        orderedRank(ENERGY_LETTER_ORDER, subject.gesRating),
        orderedRank(ENERGY_LETTER_ORDER, comparable.gesRating),
      );
    case 'outdoor':
      return amenityStatus(subject.outdoorSpaces, comparable.outdoorSpaces);
    case 'parking':
      return amenityStatus(subject.parkingTypes, comparable.parkingTypes);
    case 'exposure':
      return rankStatus(
        subject.exposure == null ? null : (EXPOSURE_RANK[subject.exposure] ?? null),
        comparable.exposure == null ? null : (EXPOSURE_RANK[comparable.exposure] ?? null),
      );
  }
}

function rawValue(criterion: ComparisonCriterion, bundle: FeatureBundle): string | null {
  switch (criterion) {
    case 'surface':
      return bundle.surfaceArea == null ? null : `${bundle.surfaceArea} m²`;
    case 'rooms':
      return bundle.roomsCount == null ? null : String(bundle.roomsCount);
    case 'bedrooms':
      return bundle.bedroomsCount == null ? null : String(bundle.bedroomsCount);
    case 'condition':
      return bundle.generalCondition;
    case 'energy_rating':
      return bundle.energyRating;
    case 'ges_rating':
      return bundle.gesRating;
    case 'outdoor':
      return amenityLabel(bundle.outdoorSpaces);
    case 'parking':
      return amenityLabel(bundle.parkingTypes);
    case 'exposure':
      return bundle.exposure;
  }
}

export function buildComparableFeatureComparison(
  subject: FeatureBundle,
  comparable: FeatureBundle,
): FeatureComparison[] {
  return COMPARISON_CRITERIA.map((criterion) => ({
    criterion,
    subjectValue: rawValue(criterion, subject),
    comparableValue: rawValue(criterion, comparable),
    comparisonStatus: statusFor(criterion, subject, comparable),
    displayLabel: COMPARISON_CRITERION_LABELS[criterion],
  }));
}
