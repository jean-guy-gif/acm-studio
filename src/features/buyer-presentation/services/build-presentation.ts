import {
  BUYER_CRITERION_LABELS,
  type BuyerCriterion,
  type BuyerInput,
} from '@/features/buyers/types';
import { seenOnLabel } from '@/features/ideal-properties/services/ideal-selection';
import type {
  BuyerPresentation,
  PresentationScreen,
  PresentedItemInput,
} from '@/features/buyer-presentation/types';
import {
  OUTDOOR_SPACE_LABELS,
  PARKING_TYPE_LABELS,
  PROPERTY_TYPE_LABELS,
  type OutdoorSpace,
  type ParkingType,
  type PropertyType,
} from '@/features/subject-property/constants/property-options';
import { formatEuro, formatEuroPerSquareMeter, formatSquareMeters } from '@/lib/format';

// Mission 119 — le constructeur de la présentation, PUR : il ne reçoit que des biens en liste
// d'autorisation (types.ts) et la fiche de l'acquéreur. Un écran d'ouverture (« Votre recherche »),
// un bien par écran dans l'ordre de la sélection, un écran de fin. Rien ne se recalcule : prix et
// écarts sont ceux figés à la sélection (M111).

const plural = (count: number, one: string, many: string): string =>
  `${count} ${count > 1 ? many : one}`;

// Les critères de la fiche, en mots, pour « Votre recherche » et pour « Pourquoi ce bien
// correspond » : une ligne par critère renseigné, dans l'ordre de la fiche.
export function criterionLine(criterion: BuyerCriterion, buyer: BuyerInput): string | null {
  const label = BUYER_CRITERION_LABELS[criterion];
  switch (criterion) {
    case 'property_types':
      return buyer.propertyTypes.length > 0
        ? `${label} : ${buyer.propertyTypes.map((type) => PROPERTY_TYPE_LABELS[type]).join(' ou ')}`
        : null;
    case 'cities':
      return buyer.cities.length > 0 ? `${label} : ${buyer.cities.join(', ')}` : null;
    case 'budget':
      return buyer.budgetMax != null
        ? `${label} : jusqu’à ${formatEuro(buyer.budgetMax)}`
        : buyer.budgetIdeal != null
          ? `${label} : autour de ${formatEuro(buyer.budgetIdeal)}`
          : null;
    case 'rooms':
      return buyer.roomsMin != null ? `${label} : ${buyer.roomsMin} au moins` : null;
    case 'bedrooms':
      return buyer.bedroomsMin != null ? `${label} : ${buyer.bedroomsMin} au moins` : null;
    case 'surface':
      return buyer.surfaceMin != null
        ? `${label} : ${formatSquareMeters(Math.round(buyer.surfaceMin))} au moins`
        : null;
    case 'outdoor':
      return buyer.outdoor === true ? 'Un extérieur' : null;
    case 'parking':
      return buyer.parking === true ? 'Un parking' : null;
    case 'pool':
      return buyer.pool === true ? 'Une piscine' : null;
    case 'floor':
      return buyer.floorMin != null
        ? `${label} : ${buyer.floorMin === 0 ? 'rez-de-chaussée accepté' : `${buyer.floorMin}e au moins`}`
        : null;
    case 'elevator':
      return buyer.elevator === true ? 'Un ascenseur' : null;
    case 'energy_rating':
      return buyer.energyRatingMax != null ? `${label} : ${buyer.energyRatingMax} ou mieux` : null;
    case 'works':
      return buyer.worksAccepted === false ? 'Sans travaux' : null;
  }
}

const CRITERIA_ORDER: BuyerCriterion[] = [
  'property_types',
  'cities',
  'budget',
  'rooms',
  'bedrooms',
  'surface',
  'outdoor',
  'parking',
  'pool',
  'floor',
  'elevator',
  'energy_rating',
  'works',
];

export function criteriaLines(buyer: BuyerInput): string[] {
  return CRITERIA_ORDER.map((criterion) => criterionLine(criterion, buyer)).filter(
    (line): line is string => line != null,
  );
}

// « Pourquoi ce bien correspond » : les indispensables de la fiche que le bien satisfait — ceux
// qu'aucun écart ni « À vérifier » ne nomme. Repris des mots de la fiche (M117).
export function whyItMatches(buyer: BuyerInput, item: Pick<PresentedItemInput, 'gaps'>): string[] {
  const doubted = item.gaps.join(' ').toLowerCase();
  return buyer.mustHave
    .filter((criterion) => !doubted.includes(BUYER_CRITERION_LABELS[criterion].toLowerCase()))
    .map((criterion) => criterionLine(criterion, buyer))
    .filter((line): line is string => line != null);
}

const labelOf = <T extends string>(labels: Record<T, string>, value: string): string =>
  (labels as Record<string, string>)[value] ?? value;

export function itemFacts(item: PresentedItemInput): { label: string; value: string }[] {
  const facts: { label: string; value: string }[] = [];
  if (item.surfaceArea != null) {
    facts.push({ label: 'Surface', value: formatSquareMeters(Math.round(item.surfaceArea)) });
  }
  if (item.roomsCount != null) {
    facts.push({ label: 'Pièces', value: String(item.roomsCount) });
  }
  if (item.bedroomsCount != null) {
    facts.push({ label: 'Chambres', value: String(item.bedroomsCount) });
  }
  const outdoor = item.outdoor.filter((space) => space !== 'none');
  if (item.outdoor.length > 0) {
    facts.push({
      label: 'Extérieur',
      value:
        outdoor.length > 0
          ? outdoor.map((space) => labelOf<OutdoorSpace>(OUTDOOR_SPACE_LABELS, space)).join(', ')
          : 'Aucun',
    });
  }
  const parking = item.parking.filter((type) => type !== 'none');
  if (item.parking.length > 0) {
    facts.push({
      label: 'Parking',
      value:
        parking.length > 0
          ? parking.map((type) => labelOf<ParkingType>(PARKING_TYPE_LABELS, type)).join(', ')
          : 'Aucun',
    });
  }
  if (item.energyRating) {
    facts.push({ label: 'DPE', value: item.energyRating });
  }
  return facts;
}

export function buildBuyerPresentation(input: {
  buyerId: string;
  buyer: BuyerInput;
  selectionId: string;
  selectedAt: string;
  presentedAt: string | null;
  items: PresentedItemInput[];
}): BuyerPresentation {
  const items = [...input.items].sort((a, b) => a.position - b.position);
  const screens: PresentationScreen[] = [
    {
      type: 'intro',
      buyerName: input.buyer.name,
      criteria: criteriaLines(input.buyer),
      count: items.length,
    },
    ...items.map((item): PresentationScreen => ({
      type: 'item',
      item,
      pricePerSqm:
        item.price != null && item.surfaceArea != null && item.surfaceArea > 0
          ? Math.round(item.price / item.surfaceArea)
          : null,
      why: whyItMatches(input.buyer, item),
      seenOnLabel: item.source === 'listing' ? seenOnLabel(item.priceSeenOn) : null,
      facts: itemFacts(item),
    })),
    { type: 'end', count: items.length },
  ];
  return {
    buyerId: input.buyerId,
    buyerName: input.buyer.name,
    selectionId: input.selectionId,
    selectedAt: input.selectedAt,
    presentedAt: input.presentedAt,
    screens,
  };
}

// « 3 biens » pour l'ouverture, « Prix au m² » pour l'écran du bien.
export const countLabel = (count: number): string => plural(count, 'bien', 'biens');
export const pricePerSqmLabel = (value: number): string => formatEuroPerSquareMeter(value);
export { PROPERTY_TYPE_LABELS as PRESENTATION_TYPE_LABELS };
export type { PropertyType as PresentationPropertyType };
