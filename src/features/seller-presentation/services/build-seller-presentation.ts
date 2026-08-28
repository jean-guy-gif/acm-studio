import { calculateComparableAnalysis } from '@/features/comparable-analysis/services/calculate-comparable-analysis';
import { calculateComparableSummary } from '@/features/comparables/services/calculate-comparable-summary';
import { pricePerSquareMeter } from '@/features/comparables/services/calculate-comparable-summary';
import type { Comparable } from '@/features/comparables/types';
import {
  getComparablePhotoUrls,
  getMainPhotoUrl,
} from '@/features/comparables/utils/comparable-photos';
import { buildComparableFeatureComparison } from '@/features/live-seller/services/build-comparable-feature-comparison';
import { buildPriceReveal } from '@/features/live-seller/services/build-price-reveal';
import { calculateLivePriceGaps } from '@/features/live-seller/services/calculate-live-price-gaps';
import { storedFieldsPriceHistoryProvider } from '@/features/live-seller/services/price-history-provider';
import type {
  FeatureBundle,
  LiveComparableResponse,
  LiveSellerSummary,
} from '@/features/live-seller/types';
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
  type LiveComparableEntry,
  type LiveComparativeData,
  type PositioningStatus,
  type SellerPresentation,
  type SellerPresentationComparable,
  type SellerPresentationProperty,
} from '@/features/seller-presentation/types/seller-presentation';
import type { SubjectPropertyCondominium } from '@/features/subject-property-condominium/types';
import type { SubjectPropertyDiagnostics } from '@/features/subject-property-diagnostics/types';
import type { SubjectProperty } from '@/features/subject-property/types';

export type BuildSellerPresentationInput = {
  project: Project;
  property: SubjectProperty | null;
  diagnostics: SubjectPropertyDiagnostics | null;
  condominium: SubjectPropertyCondominium | null;
  comparables: Comparable[];
  savedPositioning: SavedPricePositioning | null;
  generatedAt: string;
  // Mission 24 — Live seller answers (optional; Builder omits them).
  sellerResponses?: LiveComparableResponse[];
  sellerSummary?: LiveSellerSummary | null;
  // Two kinds of value live in `photo_urls`: a COMPETITOR's are already public
  // portal URLs (used as-is), a SUBJECT PROPERTY's are PRIVATE storage PATHS
  // (Mission 37). Paths are never displayable directly: every caller signs them
  // with signPropertyPhotos UPSTREAM (page/query) and passes the resolved,
  // ready-to-display URLs here — so this builder stays pure and synchronous.
  // Required on purpose: a caller that forgets does not compile.
  propertyPhotoUrls: string[];
};

const MIN_READY_COMPARABLES = 3;
const VALIDITY_NEAR_DAYS = 180;

// Whole days between two YYYY-MM-DD dates (b - a), or null if unparseable.
function daysBetween(a: string, b: string): number | null {
  const from = new Date(`${a}T00:00:00Z`).getTime();
  const to = new Date(`${b}T00:00:00Z`).getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) {
    return null;
  }
  return Math.round((to - from) / 86400000);
}

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

// `photoUrls` is resolved by the caller: signed URLs for a subject property whose
// photo_urls are storage paths, or the raw URL list otherwise.
function mapProperty(property: SubjectProperty, photoUrls: string[]): SellerPresentationProperty {
  return {
    propertyType: property.property_type,
    address: property.address,
    city: property.city,
    district: property.district,
    postalCode: property.postal_code,
    surfaceArea: property.surface_area,
    roomsCount: property.rooms_count,
    bedroomsCount: property.bedrooms_count,
    floor: property.floor,
    buildingFloors: property.building_floors,
    exposure: property.exposure,
    constructionYear: property.construction_year,
    generalCondition: property.general_condition,
    outdoorSpaces: asStringArray(property.outdoor_spaces),
    parkingTypes: asStringArray(property.parking_types),
    monthlyCharges: property.monthly_charges,
    propertyTax: property.property_tax,
    energyRating: property.energy_rating,
    gesRating: property.ges_rating,
    heatingType: property.heating_type,
    features: asStringArray(property.strengths),
    watchPoints: asStringArray(property.watch_points),
    photoUrls,
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
  const {
    project,
    property,
    diagnostics,
    condominium,
    comparables,
    savedPositioning,
    generatedAt,
    sellerResponses = [],
    sellerSummary = null,
  } = input;
  const today = generatedAt.slice(0, 10);
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
  const propertyHasPhoto = property != null && input.propertyPhotoUrls.length > 0;
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

  // Diagnostics / condominium alert flags (never invented — computed only from
  // the stored rows).
  const diagnosticStatuses = diagnostics
    ? [
        diagnostics.asbestos_status,
        diagnostics.lead_status,
        diagnostics.electricity_status,
        diagnostics.gas_status,
        diagnostics.termites_status,
        diagnostics.erp_status,
      ]
    : [];
  const validityDays =
    diagnostics?.diagnostics_valid_until != null
      ? daysBetween(today, diagnostics.diagnostics_valid_until)
      : null;
  const isCondo = condominium?.is_condominium === true;

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
    dpeNotDone: diagnostics != null && diagnostics.dpe_date == null,
    electricityAnomaly: diagnostics?.electricity_status === 'anomaly',
    gasAnomaly: diagnostics?.gas_status === 'anomaly',
    asbestosPositive: diagnostics?.asbestos_status === 'positive',
    leadPositive: diagnostics?.lead_status === 'positive',
    termitesPositive: diagnostics?.termites_status === 'positive',
    erpUnknown: diagnostics?.erp_status === 'unknown',
    diagnosticsInProgress: diagnosticStatuses.includes('in_progress'),
    diagnosticsValidityNear:
      validityDays != null && validityDays >= 0 && validityDays <= VALIDITY_NEAR_DAYS,
    condoOngoingProcedures: isCondo && condominium?.ongoing_procedures === true,
    condoVotedWorks: isCondo && condominium?.voted_works === true,
    condoUnpaidCharges: isCondo && condominium?.known_unpaid_charges === true,
    condoMissingAnnualCharges: isCondo && condominium?.annual_charges == null,
    condoIncomplete:
      isCondo && (condominium?.total_lots == null || condominium?.annual_charges == null),
  });

  const status: SellerPresentation['status'] =
    property != null &&
    exploitableCount >= MIN_READY_COMPARABLES &&
    positioningReady &&
    savedPositioning != null
      ? 'ready'
      : 'incomplete';

  // ---- Mission 24 — Live comparative core (derived only; nothing invented) ----
  const responseByComparable = new Map(
    sellerResponses
      .filter((response) => response.comparable_id != null)
      .map((response) => [response.comparable_id as string, response]),
  );
  const retainedPricesPerSquareMeter = retained
    .map((comparable) => pricePerSquareMeter(comparable.price, comparable.surface_area))
    .filter((value): value is number => value != null);
  const emptyBundle: FeatureBundle = {
    surfaceArea: null,
    roomsCount: null,
    bedroomsCount: null,
    generalCondition: null,
    energyRating: null,
    gesRating: null,
    outdoorSpaces: null,
    parkingTypes: null,
    exposure: null,
  };
  const subjectFeatures: FeatureBundle | null = property
    ? {
        surfaceArea: property.surface_area,
        roomsCount: property.rooms_count,
        bedroomsCount: property.bedrooms_count,
        generalCondition: property.general_condition,
        energyRating: property.energy_rating,
        gesRating: property.ges_rating,
        outdoorSpaces: asStringArray(property.outdoor_spaces),
        parkingTypes: asStringArray(property.parking_types),
        exposure: property.exposure,
      }
    : null;
  const competitiveMarketCentral = currentPositioning.recommendedRange?.central ?? null;

  const liveComparables: LiveComparableEntry[] = retained.map((comparable, index) => {
    const ppsm = pricePerSquareMeter(comparable.price, comparable.surface_area);
    const response = responseByComparable.get(comparable.id) ?? null;
    const comparableFeatures: FeatureBundle = {
      surfaceArea: comparable.surface_area,
      roomsCount: comparable.rooms_count,
      bedroomsCount: comparable.bedrooms_count,
      generalCondition: comparable.general_condition,
      energyRating: comparable.energy_rating,
      gesRating: comparable.ges_rating,
      outdoorSpaces: asStringArray(comparable.outdoor_spaces),
      parkingTypes: asStringArray(comparable.parking_types),
      exposure: comparable.exposure,
    };
    const historySource = {
      currentPrice: comparable.price,
      priceDropAmount: comparable.price_drop_amount,
      priceDropPercentage: comparable.price_drop_percentage,
      source: comparable.source,
      daysOnMarket: comparable.days_on_market,
      // Mission 33 — date de mise en ligne publiée par le portail. Le délai est
      // ainsi recalculé le jour du rendez-vous : un import fait trois semaines
      // plus tôt n'affiche plus un délai périmé. Absente → repli sur la saisie.
      firstSeenAt: comparable.listing_published_at,
    };
    const photoUrls = getComparablePhotoUrls(comparable);
    const listingUrl = comparable.listing_url?.trim() ? comparable.listing_url : null;
    return {
      id: comparable.id,
      position: index + 1,
      title: comparable.title,
      city: comparable.city,
      district: comparable.district,
      price: comparable.price,
      surfaceArea: comparable.surface_area,
      pricePerSquareMeter: ppsm,
      roomsCount: comparable.rooms_count,
      bedroomsCount: comparable.bedrooms_count,
      energyRating: comparable.energy_rating,
      gesRating: comparable.ges_rating,
      photoUrl: photoUrls[0] ?? null,
      photoUrls,
      source: listingUrl ? 'url' : 'manual',
      listingUrl,
      isOutlier: outlierIds.has(comparable.id),
      featureComparison: buildComparableFeatureComparison(
        subjectFeatures ?? emptyBundle,
        comparableFeatures,
      ),
      priceReveal: buildPriceReveal({
        price: comparable.price,
        surfaceArea: comparable.surface_area,
        sellerEstimate: response?.seller_estimated_listing_price ?? null,
        retainedPricesPerSquareMeter,
        thisPricePerSquareMeter: ppsm,
      }),
      priceHistory: storedFieldsPriceHistoryProvider.getPriceHistory(historySource),
      marketDuration: storedFieldsPriceHistoryProvider.getMarketDuration(
        historySource,
        generatedAt,
      ),
      response,
    };
  });

  const live: LiveComparativeData | null =
    property != null && retained.length >= 1
      ? {
          comparables: liveComparables,
          sellerSummary,
          competitiveMarketCentral,
          advisorDecision: savedPositioning
            ? {
                advisorPrice: savedPositioning.advisorPrice,
                sellerPrice: savedPositioning.sellerPrice,
                justification: savedPositioning.justification,
              }
            : null,
          priceGaps: calculateLivePriceGaps({
            sellerPerceivedPrice: sellerSummary?.seller_perceived_property_price ?? null,
            competitiveMarketCentral,
            advisorComparativePrice: sellerSummary?.advisor_comparative_market_price ?? null,
          }),
        }
      : null;

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
    property: property ? mapProperty(property, input.propertyPhotoUrls) : null,
    diagnostics,
    condominium,
    comparables: presentationComparables,
    comparableSummary: retained.length > 0 ? summary : null,
    marketAnalysis: analysis.statistics.count >= 1 ? analysis : null,
    currentPositioning,
    savedPositioning,
    positioningStatus,
    sections,
    warnings,
    live,
  };
}
