import { calculateComparableAnalysis } from '@/features/comparable-analysis/services/calculate-comparable-analysis';
import { calculateComparableSummary } from '@/features/comparables/services/calculate-comparable-summary';
import { pricePerSquareMeter } from '@/features/comparables/services/calculate-comparable-summary';
import type { Comparable } from '@/features/comparables/types';
import {
  getComparablePhotoUrls,
  getMainPhotoUrl,
} from '@/features/comparables/utils/comparable-photos';
import { calculatePricePositioning } from '@/features/price-positioning/services/calculate-price-positioning';
import {
  comparePositioningFreshness,
  currentComparisonKey,
  savedComparisonKey,
} from '@/features/price-positioning/services/compare-positioning-snapshots';
import type { SavedPricePositioning } from '@/features/price-positioning/types/saved-price-positioning';
import type { Project } from '@/features/projects/types';
import {
  buildPresentationSections,
  type SectionAvailability,
} from '@/features/seller-presentation/services/build-presentation-sections';
import { buildPresentationWarnings } from '@/features/seller-presentation/services/build-presentation-warnings';
import {
  SELLER_PRESENTATION_VERSION,
  type PositioningStatus,
  type SellerPresentation,
  type SellerPresentationComparable,
  type SellerPresentationProperty,
} from '@/features/seller-presentation/types/seller-presentation';
import type { SubjectProperty } from '@/features/subject-property/types';

export type BuildSellerPresentationInput = {
  project: Project;
  property: SubjectProperty | null;
  comparables: Comparable[];
  savedPositioning: SavedPricePositioning | null;
  generatedAt: string;
};

const MIN_READY_COMPARABLES = 3;

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
    : [];
}

function isExploitable(comparable: Comparable): boolean {
  return (
    typeof comparable.price === 'number' &&
    comparable.price > 0 &&
    typeof comparable.surface_area === 'number' &&
    comparable.surface_area > 0
  );
}

function mapProperty(property: SubjectProperty): SellerPresentationProperty {
  return {
    propertyType: property.property_type,
    address: property.address,
    city: property.city,
    // subject_properties has no district / GES / floor / exterior / parking column:
    // never invented, kept null.
    district: null,
    postalCode: property.postal_code,
    surfaceArea: property.surface_area,
    roomsCount: property.rooms_count,
    bedroomsCount: property.bedrooms_count,
    floor: null,
    exterior: null,
    parking: null,
    energyRating: property.energy_rating,
    gesRating: null,
    features: asStringArray(property.strengths),
    photoUrls: getComparablePhotoUrls({ photo_urls: property.photo_urls }),
  };
}

function mapComparable(
  comparable: Comparable,
  position: number,
  outlierIds: Set<string>,
  influenceById: Map<string, number>,
): SellerPresentationComparable {
  const listingUrl = comparable.listing_url?.trim() ? comparable.listing_url : null;
  return {
    id: comparable.id,
    position,
    title: comparable.title,
    city: comparable.city,
    district: comparable.district,
    price: comparable.price,
    surfaceArea: comparable.surface_area,
    pricePerSquareMeter: pricePerSquareMeter(comparable.price, comparable.surface_area),
    roomsCount: comparable.rooms_count,
    bedroomsCount: comparable.bedrooms_count,
    energyRating: comparable.energy_rating,
    gesRating: comparable.ges_rating,
    photoUrl: getMainPhotoUrl(comparable),
    source: listingUrl ? 'url' : 'manual',
    listingUrl,
    isOutlier: outlierIds.has(comparable.id),
    influenceScore: influenceById.get(comparable.id) ?? null,
  };
}

// Single business entry point. Aggregates existing, already-validated data by
// reusing the Missions 15–18 engines. Pure: it never mutates its inputs, never
// persists, never recomputes a rule defined elsewhere.
export function buildSellerPresentation(input: BuildSellerPresentationInput): SellerPresentation {
  const { project, property, comparables, savedPositioning, generatedAt } = input;
  const sellerSurface = property?.surface_area ?? null;

  // Retained comparables only, in display_order (copy — inputs are never mutated).
  const retained = [...comparables]
    .filter((comparable) => comparable.is_selected)
    .sort((a, b) => a.display_order - b.display_order || a.created_at.localeCompare(b.created_at));
  const exploitableCount = retained.filter(isExploitable).length;

  // Reused engines (Missions 15, 16, 17) — no recomputation of their rules here.
  const summary = calculateComparableSummary(comparables);
  const analysis = calculateComparableAnalysis(comparables, sellerSurface);
  const currentPositioning = calculatePricePositioning({
    comparables,
    sellerProperty: { surfaceArea: sellerSurface },
  });

  const outlierIds = new Set(analysis.outliers.map((outlier) => outlier.id));
  const influenceById = new Map(
    currentPositioning.influentialComparables.map((entry) => [
      entry.comparableId,
      entry.proximityScore,
    ]),
  );
  const presentationComparables = retained.map((comparable, index) =>
    mapComparable(comparable, index + 1, outlierIds, influenceById),
  );

  // Divergence: reuse the Mission 18 comparison. A saved decision is never
  // replaced by the current calculation.
  let positioningStatus: PositioningStatus;
  if (!savedPositioning) {
    positioningStatus = 'not_saved';
  } else {
    const currentKey = currentComparisonKey(currentPositioning);
    positioningStatus =
      currentKey &&
      comparePositioningFreshness(currentKey, savedComparisonKey(savedPositioning)) === 'up_to_date'
        ? 'up_to_date'
        : 'outdated';
  }

  const positioningReady = currentPositioning.status === 'ready';
  const hasValidSellerSurface = sellerSurface != null && sellerSurface > 0;
  const hasSellerPrice = savedPositioning?.sellerPrice != null && savedPositioning.sellerPrice > 0;
  const propertyMainDataIncomplete =
    property != null &&
    (property.property_type == null ||
      property.city == null ||
      property.surface_area == null ||
      property.surface_area <= 0 ||
      property.rooms_count == null);
  const propertyHasPhoto =
    property != null && getComparablePhotoUrls({ photo_urls: property.photo_urls }).length > 0;
  const anyComparablePhoto = presentationComparables.some(
    (comparable) => comparable.photoUrl != null,
  );

  const availability: SectionAvailability = {
    property: property != null,
    comparables: retained.length >= 1,
    marketAnalysis: analysis.statistics.count >= 1,
    pricePositioning: positioningReady,
    advisorDecision: savedPositioning != null,
    sellerPrice: hasSellerPrice,
  };
  const sections = buildPresentationSections(availability);

  const warnings = buildPresentationWarnings({
    hasProperty: property != null,
    hasValidSellerSurface,
    exploitableCount,
    positioningReady,
    positioningStatus,
    hasSavedDecision: savedPositioning != null,
    hasSellerPrice,
    propertyMainDataIncomplete,
    propertyHasPhoto,
    anyComparablePhoto,
    excludedOutlierCount: currentPositioning.dataset.excludedOutlierCount,
    outliersReintroduced: currentPositioning.dataset.outliersReintroduced,
    lowConfidence: positioningReady && currentPositioning.confidence.level === 'low',
    highDispersion: positioningReady && currentPositioning.recommendedRange?.dispersion === 'high',
  });

  const status: SellerPresentation['status'] =
    property != null &&
    exploitableCount >= MIN_READY_COMPARABLES &&
    positioningReady &&
    savedPositioning != null
      ? 'ready'
      : 'incomplete';

  return {
    version: SELLER_PRESENTATION_VERSION,
    status,
    generatedAt,
    project: {
      id: project.id,
      name: project.seller_name,
      status: project.status,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
    },
    property: property ? mapProperty(property) : null,
    comparables: presentationComparables,
    comparableSummary: retained.length > 0 ? summary : null,
    marketAnalysis: analysis.statistics.count >= 1 ? analysis : null,
    currentPositioning,
    savedPositioning,
    positioningStatus,
    sections,
    warnings,
  };
}
