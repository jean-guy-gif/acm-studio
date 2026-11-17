import {
  median,
  pricePerSquareMeter,
} from '@/features/comparables/services/calculate-comparable-summary';
import { normalizePropertyType } from '@/features/competitor-search/utils/normalize-property-type';
import { countDpe, dpeMarket } from '@/features/dpe/services/dpe';
import { DANGEROUS_REASONS, type DangerousReason } from '@/features/live-seller/constants';
import { buildComparableFeatureComparison } from '@/features/live-seller/services/build-comparable-feature-comparison';
import { guessGap } from '@/features/live-seller/services/guess-gap';
import { buildMarketReading } from '@/features/live-seller/services/market-reading';
import { storedFieldsPriceHistoryProvider } from '@/features/live-seller/services/price-history-provider';
import { pricePosition } from '@/features/live-seller/services/price-position';
import type { FeatureBundle } from '@/features/live-seller/types';
import { neutralComparableLabel } from '@/features/live-seller/utils/neutral-comparable-label';
import {
  summarizeGuesses,
  type GuessSummary,
} from '@/features/meeting-conclusion/services/seller-said';
import type { QrCode } from '@/features/contact-card/services/qr-code';
import type {
  SellerSynthesis,
  SynthesisCompetitor,
  SynthesisFeature,
} from '@/features/seller-synthesis/types';
import { isPropertyType } from '@/features/subject-property/services/property-type-choice';
import { clientTexts, type TextLanguage } from '@/lib/client-texts';
import type { ClientTexts } from '@/lib/client-texts/types';
import { formatPercent, formatSquareMeters } from '@/lib/format';
import type { NeighbourhoodDocumentLink } from '@/features/neighbourhood-link/services/neighbourhood-link';
import type { NeighbourhoodDocumentContent } from '@/features/neighbourhood-link/components/neighbourhood-document';

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
  // Mission 131 — montré en présentation directe (prix livré sans devinette).
  shown_directly_at?: string | null;
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
  // Mission 140 — la langue du vendeur ; le français par défaut.
  language?: TextLanguage;
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
    advisor_closest_comparable_id?: string | null;
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
  // Mission 157 B — le lien « Vivre ici » du bien (absent : aucun).
  neighbourhood?: NeighbourhoodDocumentLink | null;
  quartier?: NeighbourhoodDocumentContent | null;
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

// La grille du bien vendeur : ses propres valeurs, lues comme le Live les écrit.
function propertyFacts(
  row: SynthesisPropertyRow,
  language: TextLanguage,
): { label: string; value: string }[] {
  const texts = clientTexts(language);
  const t = texts.documents.common;
  const own = new Map(
    buildComparableFeatureComparison(bundle(row), bundle(row), language).map((item) => [
      item.criterion,
      item.subjectValue,
    ]),
  );
  const facts: { label: string; value: string }[] = [];
  const push = (label: string, value: string | null | undefined) => {
    if (value != null && value.trim() !== '') facts.push({ label, value });
  };
  const area = (value: number) => formatSquareMeters(value, { language });
  push(t.livingArea, row.surface_area != null ? area(row.surface_area) : null);
  if (normalizePropertyType(row.property_type) === 'house' && row.land_area != null) {
    push(t.land, area(row.land_area));
  }
  const rooms = [
    row.rooms_count != null ? texts.common.rooms(row.rooms_count) : null,
    row.bedrooms_count != null ? t.bedrooms(row.bedrooms_count) : null,
  ].filter(Boolean);
  push(t.roomsBedrooms, rooms.length > 0 ? rooms.join(' · ') : null);
  push(t.outdoor, own.get('outdoor'));
  push(t.parking, own.get('parking'));
  const energy = [
    row.energy_rating ? t.energyLetter('dpe', row.energy_rating) : null,
    row.ges_rating ? t.energyLetter('ges', row.ges_rating) : null,
  ].filter(Boolean);
  push(t.energy, energy.length > 0 ? energy.join(' · ') : null);
  if (row.floor != null) {
    push(
      t.floor,
      `${t.floorOrdinal(row.floor)}${row.building_floors != null && row.floor > 0 ? t.floorOf(row.building_floors) : ''}`,
    );
  }
  return facts;
}

// « Vous avez sous-estimé 4 concurrents sur 6, de 6 % en moyenne » : les mots du Suivi (M96), à la
// 2e personne, dans la langue du vendeur.
function synthesisGuessLines(summary: GuessSummary, texts: ClientTexts, language: TextLanguage) {
  const t = texts.documents.common.guesses;
  const percent = (value: number) => formatPercent(value, { maxDecimals: 1, language });
  const lines: string[] = [];
  if (summary.under > 0 && summary.underAveragePercent != null) {
    lines.push(t.under(summary.under, summary.compared, percent(summary.underAveragePercent)));
  }
  if (summary.over > 0 && summary.overAveragePercent != null) {
    lines.push(t.over(summary.over, summary.compared, percent(summary.overAveragePercent)));
  }
  if (lines.length === 0) lines.push(t.exact(summary.compared));
  return lines;
}

// Les lignes de la grille du Live qui ont été montrées : un critère sans donnée ne s'affiche pas (M40).
function synthesisFeatures(
  subject: FeatureBundle,
  row: SynthesisCompetitorRow,
  language: TextLanguage,
): SynthesisFeature[] {
  return buildComparableFeatureComparison(subject, bundle(row), language).flatMap((item) =>
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

function positionAmongSeen(
  price: number,
  competitorPrices: readonly number[],
  texts: ReturnType<typeof clientTexts>,
): string | null {
  const position = pricePosition(price, competitorPrices);
  if (!position) return null;
  const t = texts.documents.synthesis.positionAmongSeen;
  const seen = competitorPrices.filter((value) => Number.isFinite(value) && value > 0).length;
  const where =
    position.kind === 'rank'
      ? t.rank(position.rank)
      : {
          most_expensive: t.mostExpensive,
          cheapest: t.cheapest,
          among_most_expensive: t.amongMostExpensive,
          among_cheapest: t.amongCheapest,
          middle: t.middle,
        }[position.kind];
  return t.sentence(where, seen);
}

export function buildSellerSynthesis(input: SynthesisInput): SellerSynthesis {
  const language = input.language ?? 'fr';
  const texts = clientTexts(language);
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
    // Mission 131 — montré en directe : son prix et sa durée, sans « Vous imaginiez ».
    const shown = response?.shown_directly_at != null;
    if (serious !== 'no' && (guess != null || shown) && price != null && price > 0) {
      reading.push({
        id: row.id,
        price,
        priceHistory,
        marketDuration,
        response: {
          seller_estimated_listing_price: guess,
          seller_serious_competitor: serious,
          shown_directly_at: response?.shown_directly_at ?? null,
        },
      });
      const guessDays = response?.seller_estimated_days_on_market ?? null;
      const durationShown = guessDays != null || shown;
      revealed = {
        guess,
        price,
        // Mission 148 — le même calcul qu'au Live, sur les montants figés (M111).
        guessGap: guessGap(guess, price),
        pricePerSquareMeter: pricePerSquareMeter(price, row.surface_area),
        duration: durationShown
          ? { guessDays, days: marketDuration.available ? marketDuration.days : null }
          : null,
        priceDrop:
          durationShown && priceHistory.available && priceHistory.totalDropAmount != null
            ? { amount: priceHistory.totalDropAmount, percent: priceHistory.totalDropPercentage }
            : null,
      };
    }
    return {
      id: row.id,
      position: index + 1,
      surfaceArea: row.surface_area,
      label: neutralComparableLabel(
        {
          propertyType: row.property_type,
          roomsCount: row.rooms_count,
          surfaceArea: row.surface_area,
          city: row.city,
          district: row.district,
        },
        language,
      ),
      photoUrl: row.synthesis_hide_photo ? null : photo,
      hasPhoto: photo != null,
      photoHidden: row.synthesis_hide_photo,
      features: synthesisFeatures(subjectBundle, row, language),
      serious,
      revealed,
    };
  });

  const revealedList = competitors.filter((item) => item.revealed != null);
  // Le bilan des devinettes ne lit que les prix devinés (M96) : un prix montré en directe n'y entre pas.
  const guessSummary = summarizeGuesses(
    revealedList
      .filter((item) => item.revealed!.guess != null)
      .map((item) => ({
        guess: item.revealed!.guess as number,
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
          // Mission 148 B (Jean-Guy, 09/11) — le calcul porte sur les concurrents retenus par le
          // conseiller, ceux que le vendeur a écartés compris ; la phrase ne dit pas quand il a été
          // fixé (une décision reste modifiable jusqu'à la conclusion, M111).
          basisLabel:
            competitorPrice != null && counts
              ? (marketComputed != null &&
                  Math.round(marketComputed) !== Math.round(competitorPrice)
                  ? texts.documents.synthesis.basisAdvisor
                  : texts.documents.synthesis.basisCalculated)(counts.used, seenTogether)
              : null,
          advisorAnalysis,
          justification,
        };

  const market = buildMarketReading(reading, { advisorPrice: null, marketComputed: null }, 0);
  const perSquareMeter = revealedList
    .filter((item) => item.revealed!.pricePerSquareMeter != null)
    .map((item) => ({
      // Un libellé court, qui tient sur la barre : sa place au Live et sa surface.
      label: [
        texts.live.competitorReview.competitor(item.position),
        item.surfaceArea != null ? formatSquareMeters(item.surfaceArea, { language }) : null,
      ]
        .filter(Boolean)
        .join(' · '),
      value: item.revealed!.pricePerSquareMeter as number,
    }))
    .sort((a, b) => a.value - b.value);
  // Mission 148 B (Jean-Guy, 08/11) — les numéros sont ceux du Live : un concurrent écarté par
  // « Non » garde sa ligne, sans barre ni prix (M41), pour qu'aucun numéro ne manque.
  const notConsideredRows = competitors
    .filter((item) => item.serious === 'no')
    .map((item) =>
      texts.documents.synthesis.notConsideredRow(
        texts.live.competitorReview.competitor(item.position),
      ),
    );
  const medianPpsm = median(perSquareMeter.map((item) => item.value));

  const dpe = dpeMarket(
    input.property?.energy_rating,
    shown.map((row) => row.energy_rating),
  );
  const sellerDangerousId = input.summary?.seller_most_dangerous_comparable_id ?? null;
  // Mission 131 — à défaut du choix du vendeur, le bien proposé par le conseiller en directe.
  const dangerousId = sellerDangerousId ?? input.summary?.advisor_closest_comparable_id ?? null;
  const byAdvisor = sellerDangerousId == null && dangerousId != null;
  const reasonKey = input.summary?.seller_most_dangerous_reason ?? null;
  const surface = input.property?.surface_area ?? null;
  const agreed = input.commercializationPrice;
  const canonicalType = normalizePropertyType(input.property?.property_type ?? null);
  const typeLabel =
    canonicalType != null && isPropertyType(canonicalType)
      ? texts.labels.propertyType[canonicalType]
      : null;
  const commune = input.property?.city?.trim() || null;

  return {
    language,
    sellerName: input.sellerName,
    meetingDate: input.meetingDate,
    propertyLabel: [typeLabel, commune].filter(Boolean).join(' · ') || null,
    commune,
    property: input.property
      ? {
          photos: input.propertyPhotoUrls.slice(0, 3),
          facts: propertyFacts(input.property, language),
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
          message:
            dpe.verdict === 'unknown'
              ? texts.live.dpe.unknown(dpe.reference)
              : texts.live.dpe[dpe.verdict],
          classes: countDpe(shown.map((row) => row.energy_rating)).classes,
        }
      : null,
    dangerous:
      dangerousId && competitors.some((item) => item.id === dangerousId)
        ? {
            competitorId: dangerousId,
            ...(byAdvisor ? { byAdvisor: true } : {}),
            reason:
              !byAdvisor && reasonKey && DANGEROUS_REASONS.includes(reasonKey as DangerousReason)
                ? texts.live.answers.dangerousReason[reasonKey as DangerousReason]
                : null,
          }
        : null,
    guessLines: guessSummary ? synthesisGuessLines(guessSummary, texts, language) : [],
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
            notConsideredRows,
            medianPerSquareMeter: medianPpsm == null ? null : Math.round(medianPpsm),
          }
        : null,
    decision,
    commercializationPrice: agreed,
    agreedPricePerSquareMeter: agreed != null ? pricePerSquareMeter(agreed, surface) : null,
    // Mission 148 B (Jean-Guy, 08/11) — « Le moins cher : votre bien face aux 4 concurrents dont
    // vous avez vu le prix » : le vendeur sait de quels biens on parle.
    positionSentence: agreed != null ? positionAmongSeen(agreed, market.prices, texts) : null,
    agency: input.agency,
    brandDeclarations: input.brandDeclarations,
    neighbourhood: input.neighbourhood ?? null,
    // Mission 159 — les blocs vus au Live : rien sans Live ; le quartier suit « Votre valeur
    // perçue », il a été vu dès le Live commencé ; les ventes réelles précèdent « Analyse des
    // prix » : vues seulement si chaque concurrent montré a été passé (deviné, écarté ou montré en
    // directe), la condition même de l'analyse (M82).
    quartier:
      input.quartier && input.liveStartedAt
        ? {
            ...input.quartier,
            keys: input.quartier.keys.filter(
              (key) =>
                key !== 'ventes' ||
                shown.every((row) => {
                  const answer = responseById.get(row.id);
                  return (
                    answer != null &&
                    (answer.seller_serious_competitor === 'no' ||
                      answer.seller_estimated_listing_price != null ||
                      answer.shown_directly_at != null)
                  );
                }),
            ),
          }
        : null,
  };
}
