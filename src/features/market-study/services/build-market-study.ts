import { normalizePropertyType } from '@/features/competitor-search/utils/normalize-property-type';
import { buildComparableFeatureComparison } from '@/features/live-seller/services/build-comparable-feature-comparison';
import type { FeatureBundle } from '@/features/live-seller/types';
import { neutralComparableLabel } from '@/features/live-seller/utils/neutral-comparable-label';
import { daysOnMarketAt } from '@/features/market-update/services/meeting-days';
import { subjectRank } from '@/features/market-update/services/price-ranking';
import { tierOf } from '@/features/market-update/services/ranking-tiers';
import type {
  MarketStudyCompetitor,
  MarketStudyDocument,
  MarketStudyRanking,
  MarketStudyRankingRow,
} from '@/features/market-study/types';
import type { SellerSynthesis, SynthesisFeature } from '@/features/seller-synthesis/types';
import { isPropertyType } from '@/features/subject-property/services/property-type-choice';
import { clientTexts, type TextLanguage } from '@/lib/client-texts';
import { formatSquareMeters } from '@/lib/format';
import { buildStudyStory } from '@/features/market-study/services/study-story';
import type { NeighbourhoodDocumentLink } from '@/features/neighbourhood-link/services/neighbourhood-link';
import type { NeighbourhoodDocumentContent } from '@/features/neighbourhood-link/components/neighbourhood-document';

// Mission 131 — le constructeur de l'Étude de marché. Pur. Son entrée est une LISTE
// D'AUTORISATION : chaque champ de la sortie est recopié un par un, jamais par décomposition d'une
// ligne ; un titre, un lien, une adresse ou « Vendu par » passés en plus n'en sortent pas.

type PropertyRow = {
  property_type: string | null;
  city: string | null;
  district: string | null;
  surface_area: number | null;
  rooms_count: number | null;
  bedrooms_count: number | null;
  energy_rating: string | null;
  ges_rating: string | null;
  general_condition: string | null;
  outdoor_spaces: unknown;
  parking_types: unknown;
  exposure: string | null;
  // Mission 163 A — le terrain d'une maison, sur la couverture.
  land_area?: number | null;
};

export type MarketStudyCompetitorRow = {
  id: string;
  price: number;
  property_type: string | null;
  rooms_count: number | null;
  bedrooms_count: number | null;
  surface_area: number | null;
  city: string | null;
  district: string | null;
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
  listing_gone_at: string | null;
  synthesis_hide_photo: boolean;
};

export type MarketStudyInput = {
  // Mission 140 — la langue du vendeur ; le français par défaut.
  language?: TextLanguage;
  madeAt: string;
  sellerName: string | null;
  property: PropertyRow | null;
  coverPhotoUrl: string | null;
  // Les concurrents RETENUS du dossier, hors Live compris (décision du 05/11).
  competitors: MarketStudyCompetitorRow[];
  // Mission 163 C — le prix de commercialisation enregistré (`studyPrice`) : le seul qui classe le
  // bien ; sans lui, pas de ligne vendeur, pas de verdict, pas de chapitre. L'analyse du conseiller
  // n'entre jamais dans l'Étude.
  studyPrice: StudyPrice | null;
  agency: SellerSynthesis['agency'];
  brandDeclarations: string;
  // Mission 157 B — le lien « Vivre ici » du bien (absent : aucun).
  neighbourhood?: NeighbourhoodDocumentLink | null;
  quartier?: NeighbourhoodDocumentContent | null;
};

// Trois photos au plus : une fiche tient toujours sur une page A4 (comme le Point marché).
export const MAX_STUDY_PHOTOS = 3;

const strings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
    : [];

const bundle = (row: PropertyRow | MarketStudyCompetitorRow): FeatureBundle => ({
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

// La grille du Live (M40, M80) : un critère sans donnée ne s'affiche pas.
const features = (
  subject: FeatureBundle,
  competitor: FeatureBundle,
  language: TextLanguage,
): SynthesisFeature[] =>
  buildComparableFeatureComparison(subject, competitor, language).flatMap((item) =>
    item.comparisonStatus === 'unknown' || item.comparableValue == null
      ? []
      : [
          {
            criterion: item.criterion,
            label: item.displayLabel,
            value: item.comparableValue,
            sellerValue: item.subjectValue,
            status: item.comparisonStatus,
          },
        ],
  );

const positive = (value: number | null | undefined): number | null =>
  value != null && Number.isFinite(value) && value > 0 ? value : null;

const labelOf = (
  row: {
    property_type: string | null;
    rooms_count: number | null;
    surface_area: number | null;
    city: string | null;
    district: string | null;
  },
  language: TextLanguage,
): string =>
  neutralComparableLabel(
    {
      propertyType: normalizePropertyType(row.property_type),
      roomsCount: row.rooms_count,
      surfaceArea: row.surface_area,
      city: row.city,
      district: row.district,
    },
    language,
  );

function competitorOf(
  row: MarketStudyCompetitorRow,
  position: number,
  subject: FeatureBundle | null,
  madeAt: string,
  language: TextLanguage,
): MarketStudyCompetitor {
  const photos = strings(row.photo_urls).filter((url) => /^https?:\/\/|^\//.test(url));
  const hidden = row.synthesis_hide_photo === true;
  const surface = positive(row.surface_area);
  const drop = positive(row.price_drop_amount);
  return {
    id: row.id,
    position,
    label: labelOf(row, language),
    photoUrls: hidden ? [] : photos.slice(0, MAX_STUDY_PHOTOS),
    hasPhoto: photos.length > 0,
    photoHidden: hidden,
    features: subject ? features(subject, bundle(row), language) : [],
    price: row.price,
    pricePerSquareMeter: surface ? Math.round(row.price / surface) : null,
    daysOnMarket: row.listing_gone_at
      ? null
      : daysOnMarketAt(
          {
            listing_published_at: row.listing_published_at,
            days_on_market: row.days_on_market,
            created_at: row.created_at,
          },
          madeAt,
        ),
    priceDrop: drop ? { amount: drop, percent: row.price_drop_percentage ?? null } : null,
    goneAt: row.listing_gone_at,
  };
}

function detailOf(item: MarketStudyCompetitor, language: TextLanguage): string | null {
  const t = clientTexts(language).documents;
  const parts: string[] = [];
  if (item.priceDrop) parts.push(t.marketStudy.alreadyDropped);
  if (item.daysOnMarket) {
    parts.push(
      t.marketUpdate.ranking.onMarketFor(item.daysOnMarket.days, item.daysOnMarket.approximate),
    );
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

// Le classement du jour (M129) : les concurrents encore en vente, du moins cher au plus cher ; la
// ligne du vendeur à son prix de référence, et à égalité de prix il prend le meilleur rang.
export function buildStudyRanking(
  competitors: MarketStudyCompetitor[],
  subjectLabel: string,
  price: StudyPrice | null,
  // Mission 140 — dans la langue du vendeur (le français par défaut).
  language: TextLanguage = 'fr',
): MarketStudyRanking {
  const texts = clientTexts(language).documents;
  const listed = competitors
    .filter((item) => item.goneAt == null && item.price > 0)
    .sort((a, b) => a.price - b.price || a.position - b.position);
  const reference = positive(price?.amount);
  if (price == null || reference == null) {
    const total = listed.length;
    return {
      subject: null,
      rows: listed.map((item, index) => ({
        key: item.id,
        subject: false,
        rank: index + 1,
        tier: tierOf(index + 1, total),
        label: item.label,
        price: item.price,
        detail: detailOf(item, language),
      })),
    };
  }
  const total = listed.length + 1;
  const subjectPosition = subjectRank(
    listed.map((item) => item.price),
    reference,
  );
  const subjectRow = (rank: number): MarketStudyRankingRow => ({
    key: 'subject',
    subject: true,
    rank,
    tier: tierOf(rank, total),
    label: subjectLabel,
    price: reference,
    detail: price.proposed
      ? texts.marketStudy.proposedPrice
      : texts.marketUpdate.ranking.agreedTogether,
  });
  const rows: MarketStudyRankingRow[] = [];
  let rank = 1;
  for (const item of listed) {
    if (rank === subjectPosition) {
      rows.push(subjectRow(rank));
      rank += 1;
    }
    rows.push({
      key: item.id,
      subject: false,
      rank,
      tier: tierOf(rank, total),
      label: item.label,
      price: item.price,
      detail: detailOf(item, language),
    });
    rank += 1;
  }
  if (rank === subjectPosition) rows.push(subjectRow(rank));
  const tier = tierOf(subjectPosition, total);
  return {
    subject: {
      price: reference,
      proposed: price.proposed,
      rank: subjectPosition,
      total,
      tier,
      word: texts.marketUpdate.ranking.words[tier],
      cells: Array.from({ length: total }, (_, index) => tierOf(index + 1, total)),
    },
    rows,
  };
}

export type StudyPrice = { amount: number; proposed: boolean };

// Mission 163 C — le prix qui classe le bien : un prix de commercialisation ENREGISTRÉ, au Live
// (« Sur quel prix partons-nous ? », le remplir vaut accord, M85) ou à la conclusion ; le dossier
// n'a pas besoin d'être conclu (décision de Jean-Guy, 20/11). Sans prix enregistré, aucun ; jamais
// l'analyse du conseiller à sa place. Une conclusion qui n'est pas un mandat signé (à relancer,
// vendu ailleurs, retiré) le dit « proposé », comme le Suivi ; un mandat signé, ou un prix du Live
// sans issue encore, « retenu ensemble » (décision de Jean-Guy, 23/11).
export function studyPrice(
  conclusion: { outcome: string | null; commercialization_price: number | string | null } | null,
): StudyPrice | null {
  if (conclusion?.commercialization_price == null) return null;
  const amount = positive(Number(conclusion.commercialization_price));
  if (amount == null) return null;
  return { amount, proposed: conclusion.outcome != null && conclusion.outcome !== 'signed' };
}

export function buildMarketStudy(input: MarketStudyInput): MarketStudyDocument {
  const language = input.language ?? 'fr';
  const texts = clientTexts(language);
  const t = texts.documents.marketStudy;
  const property = input.property;
  const subject = property ? bundle(property) : null;
  const competitors = [...input.competitors]
    .sort((a, b) => a.display_order - b.display_order || a.id.localeCompare(b.id))
    .map((row, index) => competitorOf(row, index + 1, subject, input.madeAt, language));
  const ownLabel = property ? labelOf(property, language) : '';
  const subjectLabel =
    property && ownLabel !== texts.common.competitorFallback
      ? ownLabel
      : texts.documents.synthesis.propertyTitle;
  const city = property?.city?.trim() || null;
  const surface = positive(property?.surface_area);
  const rooms = positive(property?.rooms_count);
  const bedrooms = positive(property?.bedrooms_count);
  const coverFigures = [
    surface ? { label: t.surface, value: formatSquareMeters(surface, { language }) } : null,
    rooms
      ? {
          label: t.rooms,
          value: `${rooms}${bedrooms ? ` · ${texts.documents.common.bedrooms(bedrooms)}` : ''}`,
        }
      : null,
    { label: t.studied, value: String(competitors.length) },
  ].filter((item): item is { label: string; value: string } => item != null);
  const canonicalType = property ? normalizePropertyType(property.property_type) : null;
  const typeLabel =
    canonicalType != null && isPropertyType(canonicalType)
      ? texts.labels.propertyType[canonicalType]
      : null;
  const ranking = buildStudyRanking(competitors, subjectLabel, input.studyPrice, language);
  const sellerName = input.sellerName?.trim() ?? '';
  const quartier = input.quartier ?? null;
  return {
    language,
    madeAt: input.madeAt,
    sellerName,
    propertyLabel: property ? [typeLabel, city].filter(Boolean).join(' · ') || null : null,
    subjectLabel,
    commune: city,
    coverPhotoUrl: input.coverPhotoUrl,
    coverFigures,
    competitors,
    ranking,
    agency: input.agency,
    brandDeclarations: input.brandDeclarations,
    neighbourhood: input.neighbourhood ?? null,
    quartier,
    story: buildStudyStory({
      language,
      madeAt: input.madeAt,
      sellerName,
      subject: property
        ? {
            propertyType: property.property_type,
            city,
            district: property.district,
            surface: property.surface_area,
            rooms: property.rooms_count,
            landArea: property.land_area ?? null,
          }
        : null,
      competitors,
      ranking,
      agency: input.agency,
      quartier,
      vivreIci: input.neighbourhood != null,
    }),
  };
}
