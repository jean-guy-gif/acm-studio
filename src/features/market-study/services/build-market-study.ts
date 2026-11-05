import { normalizePropertyType } from '@/features/competitor-search/utils/normalize-property-type';
import { buildComparableFeatureComparison } from '@/features/live-seller/services/build-comparable-feature-comparison';
import type { FeatureBundle } from '@/features/live-seller/types';
import { neutralComparableLabel } from '@/features/live-seller/utils/neutral-comparable-label';
import { daysOnMarketAt } from '@/features/market-update/services/meeting-days';
import { subjectRank } from '@/features/market-update/services/price-ranking';
import { tierOf, TIER_WORDS } from '@/features/market-update/services/ranking-tiers';
import type {
  MarketStudyCompetitor,
  MarketStudyDocument,
  MarketStudyRanking,
  MarketStudyRankingRow,
} from '@/features/market-study/types';
import type { SellerSynthesis, SynthesisFeature } from '@/features/seller-synthesis/types';
import { propertyTypeLabel } from '@/features/subject-property/services/property-type-choice';
import { formatSquareMeters } from '@/lib/format';

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
  madeAt: string;
  sellerName: string | null;
  property: PropertyRow | null;
  coverPhotoUrl: string | null;
  // Les concurrents RETENUS du dossier, hors Live compris (décision du 05/11).
  competitors: MarketStudyCompetitorRow[];
  // Le prix de référence : convenu à la conclusion, sinon l'analyse du conseiller de la décision
  // de prix enregistrée ; aucun des deux : pas de ligne vendeur, pas de verdict.
  commercializationPrice: number | null;
  advisorAnalysis: number | null;
  agency: SellerSynthesis['agency'];
  brandDeclarations: string;
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
const features = (subject: FeatureBundle, competitor: FeatureBundle): SynthesisFeature[] =>
  buildComparableFeatureComparison(subject, competitor).flatMap((item) =>
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

const positive = (value: number | null | undefined): number | null =>
  value != null && Number.isFinite(value) && value > 0 ? value : null;

const labelOf = (row: {
  property_type: string | null;
  rooms_count: number | null;
  surface_area: number | null;
  city: string | null;
  district: string | null;
}): string =>
  neutralComparableLabel({
    propertyType: normalizePropertyType(row.property_type),
    roomsCount: row.rooms_count,
    surfaceArea: row.surface_area,
    city: row.city,
    district: row.district,
  });

function competitorOf(
  row: MarketStudyCompetitorRow,
  position: number,
  subject: FeatureBundle | null,
  madeAt: string,
): MarketStudyCompetitor {
  const photos = strings(row.photo_urls).filter((url) => /^https?:\/\/|^\//.test(url));
  const hidden = row.synthesis_hide_photo === true;
  const surface = positive(row.surface_area);
  const drop = positive(row.price_drop_amount);
  return {
    id: row.id,
    position,
    label: labelOf(row),
    photoUrls: hidden ? [] : photos.slice(0, MAX_STUDY_PHOTOS),
    hasPhoto: photos.length > 0,
    photoHidden: hidden,
    features: subject ? features(subject, bundle(row)) : [],
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

const plural = (n: number, one: string, many: string) => (n > 1 ? many : one);

function detailOf(item: MarketStudyCompetitor): string | null {
  const parts: string[] = [];
  if (item.priceDrop) parts.push('a déjà baissé son prix');
  if (item.daysOnMarket) {
    parts.push(
      `en vente depuis ${item.daysOnMarket.approximate ? 'environ ' : ''}${item.daysOnMarket.days} ${plural(item.daysOnMarket.days, 'jour', 'jours')}`,
    );
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

// Le classement du jour (M129) : les concurrents encore en vente, du moins cher au plus cher ; la
// ligne du vendeur à son prix de référence, et à égalité de prix il prend le meilleur rang.
export function buildStudyRanking(
  competitors: MarketStudyCompetitor[],
  subjectLabel: string,
  reference: { price: number; source: 'agreed' | 'advisor' } | null,
): MarketStudyRanking {
  const listed = competitors
    .filter((item) => item.goneAt == null && item.price > 0)
    .sort((a, b) => a.price - b.price || a.position - b.position);
  if (!reference) {
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
        detail: detailOf(item),
      })),
    };
  }
  const total = listed.length + 1;
  const subjectPosition = subjectRank(
    listed.map((item) => item.price),
    reference.price,
  );
  const subjectRow = (rank: number): MarketStudyRankingRow => ({
    key: 'subject',
    subject: true,
    rank,
    tier: tierOf(rank, total),
    label: subjectLabel,
    price: reference.price,
    detail:
      reference.source === 'agreed' ? 'prix retenu ensemble' : 'prix proposé par votre conseiller',
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
      detail: detailOf(item),
    });
    rank += 1;
  }
  if (rank === subjectPosition) rows.push(subjectRow(rank));
  const tier = tierOf(subjectPosition, total);
  return {
    subject: {
      price: reference.price,
      source: reference.source,
      rank: subjectPosition,
      total,
      tier,
      word: TIER_WORDS[tier],
      cells: Array.from({ length: total }, (_, index) => tierOf(index + 1, total)),
    },
    rows,
  };
}

export function referencePrice(
  commercializationPrice: number | null,
  advisorAnalysis: number | null,
): { price: number; source: 'agreed' | 'advisor' } | null {
  const agreed = positive(commercializationPrice);
  if (agreed) return { price: agreed, source: 'agreed' };
  const advisor = positive(advisorAnalysis);
  return advisor ? { price: advisor, source: 'advisor' } : null;
}

export function buildMarketStudy(input: MarketStudyInput): MarketStudyDocument {
  const property = input.property;
  const subject = property ? bundle(property) : null;
  const competitors = [...input.competitors]
    .sort((a, b) => a.display_order - b.display_order || a.id.localeCompare(b.id))
    .map((row, index) => competitorOf(row, index + 1, subject, input.madeAt));
  const subjectLabel = property
    ? labelOf(property).replace(/^Bien concurrent$/, 'Votre bien')
    : 'Votre bien';
  const city = property?.city?.trim() || null;
  const surface = positive(property?.surface_area);
  const rooms = positive(property?.rooms_count);
  const bedrooms = positive(property?.bedrooms_count);
  const coverFigures = [
    surface ? { label: 'Surface', value: formatSquareMeters(surface) } : null,
    rooms
      ? {
          label: 'Pièces',
          value: `${rooms}${bedrooms ? ` · ${bedrooms} ${plural(bedrooms, 'chambre', 'chambres')}` : ''}`,
        }
      : null,
    { label: 'Concurrents étudiés', value: String(competitors.length) },
  ].filter((item): item is { label: string; value: string } => item != null);
  return {
    madeAt: input.madeAt,
    sellerName: input.sellerName?.trim() ?? '',
    propertyLabel: property
      ? [propertyTypeLabel(property.property_type), city].filter(Boolean).join(' · ') || null
      : null,
    subjectLabel,
    commune: city,
    coverPhotoUrl: input.coverPhotoUrl,
    coverFigures,
    competitors,
    ranking: buildStudyRanking(
      competitors,
      subjectLabel,
      referencePrice(input.commercializationPrice, input.advisorAnalysis),
    ),
    agency: input.agency,
    brandDeclarations: input.brandDeclarations,
  };
}
