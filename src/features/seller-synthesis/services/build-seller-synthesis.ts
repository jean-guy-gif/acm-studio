import {
  median,
  pricePerSquareMeter,
} from '@/features/comparables/services/calculate-comparable-summary';
import { normalizePropertyType } from '@/features/competitor-search/utils/normalize-property-type';
import { countDpe, dpeMarket } from '@/features/dpe/services/dpe';
import { DANGEROUS_REASON_LABELS, type DangerousReason } from '@/features/live-seller/constants';
import { buildComparableFeatureComparison } from '@/features/live-seller/services/build-comparable-feature-comparison';
import { buildPriceReveal } from '@/features/live-seller/services/build-price-reveal';
import {
  buildMarketReading,
  competitorPriceBasisLabel,
} from '@/features/live-seller/services/market-reading';
import { storedFieldsPriceHistoryProvider } from '@/features/live-seller/services/price-history-provider';
import { pricePositionSentence } from '@/features/live-seller/services/price-position';
import type { FeatureBundle } from '@/features/live-seller/types';
import { neutralComparableLabel } from '@/features/live-seller/utils/neutral-comparable-label';
import { guessLines, summarizeGuesses } from '@/features/meeting-conclusion/services/seller-said';
import type { QrCode } from '@/features/contact-card/services/qr-code';
import type {
  SellerSynthesis,
  SynthesisCompetitor,
  SynthesisFeature,
} from '@/features/seller-synthesis/types';
import { propertyTypeLabel } from '@/features/subject-property/services/property-type-choice';
import { formatSquareMeters } from '@/lib/format';

// Mission 110, refondue par la mission 113 — la synthèse au vendeur, construite depuis des lignes
// lues par listes de colonnes autorisées (queries/load-seller-synthesis.ts). Pure. Elle suit
// l'ordre du Live et reprend SES calculs (grille, écart, lecture du marché, DPE, phrase de
// position) : le vendeur relit ce qu'il a vu, rien de plus. Aucune donnée d'annonce n'entre ici :
// le type d'entrée ne reçoit ni adresse, ni titre, ni lien, ni « Vendu par ».

export type SynthesisCompetitorRow = {
  id: string;
  price: number | null;
  property_type: string | null;
  rooms_count: number | null;
  bedrooms_count: number | null;
  surface_area: number | null;
  city: string | null;
  district: string | null;
  is_selected: boolean;
  excluded_from_live: boolean;
  display_order: number;
  created_at: string;
  energy_rating: string | null;
  ges_rating: string | null;
  general_condition: string | null;
  outdoor_spaces: unknown;
  parking_types: unknown;
  exposure: string | null;
  photo_urls: unknown;
  price_drop_amount: number | null;
  price_drop_percentage: number | null;
  days_on_market: number | null;
  listing_published_at: string | null;
  synthesis_hide_photo: boolean;
};

export type SynthesisResponseRow = {
  comparable_id: string | null;
  seller_estimated_listing_price: number | null;
  seller_serious_competitor: string | null;
  revealed_listing_price: number | null;
  seller_estimated_days_on_market: number | null;
};

export type SynthesisPropertyRow = {
  property_type: string | null;
  city: string | null;
  district: string | null;
  surface_area: number | null;
  land_area: number | null;
  rooms_count: number | null;
  bedrooms_count: number | null;
  floor: number | null;
  building_floors: number | null;
  energy_rating: string | null;
  ges_rating: string | null;
  general_condition: string | null;
  outdoor_spaces: unknown;
  parking_types: unknown;
  exposure: string | null;
  strengths: unknown;
};

export type SynthesisInput = {
  sellerName: string;
  meetingDate: string | null;
  // L'heure de début du Live : la durée en vente se lit au jour du rendez-vous, pas d'aujourd'hui.
  liveStartedAt: string | null;
  property: SynthesisPropertyRow | null;
  // Les photos du bien vendeur, déjà signées (M37) ; la première fait la couverture.
  propertyPhotoUrls: string[];
  competitors: SynthesisCompetitorRow[];
  responses: SynthesisResponseRow[];
  summary: {
    seller_perceived_property_price: number | null;
    seller_revised_property_price: number | null;
    seller_most_dangerous_comparable_id: string | null;
    seller_most_dangerous_reason: string | null;
  } | null;
  decision: {
    advisor_price: number | null;
    advisor_comparative_market_price: number | null;
    justification: string | null;
    // Le calcul au moment de la décision (« Calculé sur N »).
    range_central: number | null;
    calculation_snapshot: unknown;
  } | null;
  // Mission 111 — les montants figés à la conclusion ; null tant que le dossier n'est pas conclu.
  frozen: {
    advisor_price: number | null;
    advisor_analysis: number | null;
    market_computed: number | null;
  } | null;
  commercializationPrice: number | null;
  agency: Omit<SellerSynthesis['agency'], 'advisorQr'> & { advisorQr: QrCode | null };
  brandDeclarations: string;
};

const strings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
    : [];

const bundle = (row: {
  surface_area: number | null;
  rooms_count: number | null;
  bedrooms_count: number | null;
  general_condition: string | null;
  energy_rating: string | null;
  ges_rating: string | null;
  outdoor_spaces: unknown;
  parking_types: unknown;
  exposure: string | null;
}): FeatureBundle => ({
  surfaceArea: row.surface_area,
  roomsCount: row.rooms_count,
  bedroomsCount: row.bedrooms_count,
  generalCondition: row.general_condition,
  energyRating: row.energy_rating,
  gesRating: row.ges_rating,
  outdoorSpaces: strings(row.outdoor_spaces),
  parkingTypes: strings(row.parking_types),
  exposure: row.exposure,
});

const EMPTY_BUNDLE: FeatureBundle = {
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

const ordinalFloor = (floor: number): string =>
  floor === 0 ? 'Rez-de-chaussée' : floor === 1 ? '1er étage' : `${floor}e étage`;

// La grille du bien vendeur : ses propres valeurs, lues comme le Live les écrit.
function propertyFacts(row: SynthesisPropertyRow): { label: string; value: string }[] {
  const own = new Map(
    buildComparableFeatureComparison(bundle(row), bundle(row)).map((item) => [
      item.criterion,
      item.subjectValue,
    ]),
  );
  const facts: { label: string; value: string }[] = [];
  const push = (label: string, value: string | null | undefined) => {
    if (value != null && value.trim() !== '') facts.push({ label, value });
  };
  push('Surface habitable', row.surface_area != null ? formatSquareMeters(row.surface_area) : null);
  if (normalizePropertyType(row.property_type) === 'house' && row.land_area != null) {
    push('Terrain', formatSquareMeters(row.land_area));
  }
  const rooms = [
    row.rooms_count != null ? `${row.rooms_count} pièce${row.rooms_count > 1 ? 's' : ''}` : null,
    row.bedrooms_count != null
      ? `${row.bedrooms_count} chambre${row.bedrooms_count > 1 ? 's' : ''}`
      : null,
  ].filter(Boolean);
  push('Pièces · chambres', rooms.length > 0 ? rooms.join(' · ') : null);
  push('Extérieurs', own.get('outdoor'));
  push('Stationnement', own.get('parking'));
  const energy = [
    row.energy_rating ? `DPE ${row.energy_rating}` : null,
    row.ges_rating ? `GES ${row.ges_rating}` : null,
  ].filter(Boolean);
  push('DPE · GES', energy.length > 0 ? energy.join(' · ') : null);
  if (row.floor != null) {
    push(
      'Étage',
      `${ordinalFloor(row.floor)}${row.building_floors != null && row.floor > 0 ? ` sur ${row.building_floors}` : ''}`,
    );
  }
  return facts;
}

// Les lignes de la grille du Live qui ont été montrées : un critère sans donnée ne s'affiche pas (M40).
function synthesisFeatures(
  subject: FeatureBundle,
  row: SynthesisCompetitorRow,
): SynthesisFeature[] {
  return buildComparableFeatureComparison(subject, bundle(row)).flatMap((item) =>
    item.comparisonStatus === 'unknown' || item.comparableValue == null
      ? []
      : [
          {
            label: item.displayLabel,
            value: item.comparableValue,
            sellerValue: item.subjectValue,
            status: item.comparisonStatus,
          },
        ],
  );
}

const SERIOUS = new Set(['yes', 'unsure', 'no']);

// Le nombre de concurrents du calcul, tel qu'enregistré avec la décision de prix.
function snapshotCounts(value: unknown): { used: number; excludedOutliers: number } | null {
  if (value == null || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const used = Number(record.usedCount);
  if (!Number.isFinite(used) || used <= 0) return null;
  const excluded = Number(record.excludedOutlierCount);
  return { used, excludedOutliers: Number.isFinite(excluded) ? excluded : 0 };
}

export function buildSellerSynthesis(input: SynthesisInput): SellerSynthesis {
  const responseById = new Map(
    input.responses
      .filter((response) => response.comparable_id != null)
      .map((response) => [response.comparable_id as string, response]),
  );
  const retained = input.competitors
    .filter((row) => row.is_selected)
    .sort((a, b) => a.display_order - b.display_order || a.created_at.localeCompare(b.created_at));
  // Mission 110 — un concurrent hors Live n'a pas été montré : il n'est pas dans la synthèse.
  const shown = retained.filter((row) => !row.excluded_from_live);
  const subjectBundle = input.property ? bundle(input.property) : EMPTY_BUNDLE;
  const referenceDate = input.liveStartedAt ?? input.meetingDate ?? new Date(0).toISOString();

  const reading: Parameters<typeof buildMarketReading>[0][number][] = [];
  const competitors: SynthesisCompetitor[] = shown.map((row, index) => {
    const response = responseById.get(row.id) ?? null;
    const serious =
      response?.seller_serious_competitor && SERIOUS.has(response.seller_serious_competitor)
        ? (response.seller_serious_competitor as SynthesisCompetitor['serious'])
        : null;
    const photo = strings(row.photo_urls)[0] ?? null;
    const history = {
      currentPrice: row.price ?? 0,
      priceDropAmount: row.price_drop_amount,
      priceDropPercentage: row.price_drop_percentage,
      source: null,
      daysOnMarket: row.days_on_market,
      firstSeenAt: row.listing_published_at,
    };
    const priceHistory = storedFieldsPriceHistoryProvider.getPriceHistory(history);
    const marketDuration = storedFieldsPriceHistoryProvider.getMarketDuration(
      history,
      referenceDate,
    );
    // Le prix révélé, figé à la devinette (M96) ; à défaut (Live d'avant), le prix affiché.
    const price = response?.revealed_listing_price ?? row.price;
    const guess = response?.seller_estimated_listing_price ?? null;
    let revealed: SynthesisCompetitor['revealed'] = null;
    if (serious !== 'no' && guess != null && price != null && price > 0) {
      reading.push({
        id: row.id,
        price,
        priceHistory,
        marketDuration,
        response: { seller_estimated_listing_price: guess, seller_serious_competitor: serious },
      });
      const guessDays = response?.seller_estimated_days_on_market ?? null;
      revealed = {
        guess,
        price,
        gapPercent: buildPriceReveal({
          price,
          surfaceArea: null,
          sellerEstimate: guess,
          retainedPricesPerSquareMeter: [],
          thisPricePerSquareMeter: null,
        }).gapPercentage,
        pricePerSquareMeter: pricePerSquareMeter(price, row.surface_area),
        duration:
          guessDays != null
            ? { guessDays, days: marketDuration.available ? marketDuration.days : null }
            : null,
        priceDrop:
          guessDays != null && priceHistory.available && priceHistory.totalDropAmount != null
            ? { amount: priceHistory.totalDropAmount, percent: priceHistory.totalDropPercentage }
            : null,
      };
    }
    return {
      id: row.id,
      position: index + 1,
      label: neutralComparableLabel({
        propertyType: row.property_type,
        roomsCount: row.rooms_count,
        surfaceArea: row.surface_area,
        city: row.city,
        district: row.district,
      }),
      photoUrl: row.synthesis_hide_photo ? null : photo,
      hasPhoto: photo != null,
      photoHidden: row.synthesis_hide_photo,
      features: synthesisFeatures(subjectBundle, row),
      serious,
      revealed,
    };
  });

  const revealedList = competitors.filter((item) => item.revealed != null);
  const guessSummary = summarizeGuesses(
    revealedList.map((item) => ({
      guess: item.revealed!.guess,
      revealedPrice: item.revealed!.price,
      currentPrice: null,
    })),
  );

  // Mission 111 — après la conclusion, les montants figés ; avant, la décision en cours. Mission
  // 109 — sans décision enregistrée, aucun prix final.
  const justification = input.decision?.justification?.trim() || null;
  const competitorPrice = input.frozen
    ? input.frozen.advisor_price
    : (input.decision?.advisor_price ?? null);
  const advisorAnalysis = input.frozen
    ? input.frozen.advisor_analysis
    : (input.decision?.advisor_comparative_market_price ?? null);
  const marketComputed = input.frozen
    ? input.frozen.market_computed
    : (input.decision?.range_central ?? null);
  const counts = snapshotCounts(input.decision?.calculation_snapshot);
  // « dont N vus ensemble » seulement quand c'est exact : des concurrents hors Live, et aucun
  // concurrent écarté du calcul (sinon on ne sait pas lesquels de ceux qu'il a vus y entrent).
  const hiddenCount = retained.length - shown.length;
  const seenWithPpsm = shown.filter(
    (row) => pricePerSquareMeter(row.price, row.surface_area) != null,
  ).length;
  const seenTogether =
    counts && hiddenCount > 0 && counts.excludedOutliers === 0 && seenWithPpsm < counts.used
      ? seenWithPpsm
      : null;
  const decision =
    competitorPrice == null && advisorAnalysis == null && justification == null
      ? null
      : {
          competitorPrice,
          basisLabel:
            competitorPrice != null && counts
              ? competitorPriceBasisLabel({
                  calculationCount: counts.used,
                  seenTogetherCount: seenTogether,
                  competitorPriceBasis:
                    marketComputed != null &&
                    Math.round(marketComputed) !== Math.round(competitorPrice)
                      ? 'advisor'
                      : 'computed',
                })
              : null,
          advisorAnalysis,
          justification,
        };

  const market = buildMarketReading(reading, { advisorPrice: null, marketComputed: null }, 0);
  const perSquareMeter = revealedList
    .filter((item) => item.revealed!.pricePerSquareMeter != null)
    .map((item) => ({ label: item.label, value: item.revealed!.pricePerSquareMeter as number }))
    .sort((a, b) => a.value - b.value);
  const medianPpsm = median(perSquareMeter.map((item) => item.value));

  const dpe = dpeMarket(
    input.property?.energy_rating,
    shown.map((row) => row.energy_rating),
  );
  const dangerousId = input.summary?.seller_most_dangerous_comparable_id ?? null;
  const reasonKey = input.summary?.seller_most_dangerous_reason ?? null;
  const surface = input.property?.surface_area ?? null;
  const agreed = input.commercializationPrice;
  const typeLabel = propertyTypeLabel(input.property?.property_type);
  const commune = input.property?.city?.trim() || null;

  return {
    sellerName: input.sellerName,
    meetingDate: input.meetingDate,
    propertyLabel: [typeLabel, commune].filter(Boolean).join(' · ') || null,
    commune,
    property: input.property
      ? {
          photos: input.propertyPhotoUrls.slice(0, 3),
          facts: propertyFacts(input.property),
          surfaceArea: input.property.surface_area,
          roomsCount: input.property.rooms_count,
          bedroomsCount: input.property.bedrooms_count,
          strengths: strings(input.property.strengths).slice(0, 10),
        }
      : null,
    perceivedPrice: input.summary?.seller_perceived_property_price ?? null,
    revisedPrice: input.summary?.seller_revised_property_price ?? null,
    competitors,
    dpe: dpe
      ? {
          reference: dpe.reference,
          subject: dpe.subject,
          message: dpe.message,
          classes: countDpe(shown.map((row) => row.energy_rating)).classes,
        }
      : null,
    dangerous:
      dangerousId && competitors.some((item) => item.id === dangerousId)
        ? {
            competitorId: dangerousId,
            reason:
              reasonKey && reasonKey in DANGEROUS_REASON_LABELS
                ? DANGEROUS_REASON_LABELS[reasonKey as DangerousReason]
                : null,
          }
        : null,
    guessLines: guessSummary ? guessLines(guessSummary, 'vous') : [],
    analysis:
      market.lowestPrice != null && market.highestPrice != null
        ? {
            prices: market.prices,
            lowestPrice: market.lowestPrice,
            highestPrice: market.highestPrice,
            medianPrice: market.medianPrice,
            revealedCount: market.revealedCount,
            droppedCount: market.droppedCount,
            medianDaysOnMarket: market.medianDaysOnMarket,
            perSquareMeter,
            medianPerSquareMeter: medianPpsm == null ? null : Math.round(medianPpsm),
          }
        : null,
    decision,
    commercializationPrice: agreed,
    agreedPricePerSquareMeter: agreed != null ? pricePerSquareMeter(agreed, surface) : null,
    positionSentence: agreed != null ? pricePositionSentence(agreed, market.prices) : null,
    agency: input.agency,
    brandDeclarations: input.brandDeclarations,
  };
}
