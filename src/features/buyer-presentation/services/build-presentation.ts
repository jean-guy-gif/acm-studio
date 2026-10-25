import {
  BUYER_CRITERION_LABELS,
  type BuyerCriterion,
  type BuyerInput,
} from '@/features/buyers/types';
import type { PresentedItemInput } from '@/features/buyer-presentation/types';
import {
  OUTDOOR_SPACE_LABELS,
  PARKING_TYPE_LABELS,
  PROPERTY_TYPE_LABELS,
  type OutdoorSpace,
  type ParkingType,
} from '@/features/subject-property/constants/property-options';
import { formatEuro, formatSquareMeters } from '@/lib/format';

// Mission 119 — le constructeur de la présentation, PUR : il ne reçoit que des biens en liste
// d'autorisation (types.ts) et la fiche de l'acquéreur. Un écran d'ouverture (« Votre recherche »),
// un bien par écran dans l'ordre de la sélection, un écran de fin. Rien ne se recalcule : prix et
// écarts sont ceux figés à la sélection (M111).

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

// La LISTE D'AUTORISATION appliquée : un appelant qui passerait un titre, une adresse, un lien ou
// un vendeur en plus ne les verrait pas sortir — le constructeur ne recopie que ces champs.
export function allowedItem(item: PresentedItemInput): PresentedItemInput {
  return {
    itemId: item.itemId,
    position: item.position,
    source: item.source,
    category: item.category,
    label: item.label,
    city: item.city,
    district: item.district,
    price: item.price,
    priceSeenOn: item.priceSeenOn,
    surfaceArea: item.surfaceArea,
    roomsCount: item.roomsCount,
    bedroomsCount: item.bedroomsCount,
    outdoor: [...item.outdoor],
    parking: [...item.parking],
    energyRating: item.energyRating,
    photos: [...item.photos],
    gaps: [...item.gaps],
    propertyType: item.propertyType,
    floor: item.floor,
    hasPool: item.hasPool,
    hasElevator: item.hasElevator,
    condition: item.condition,
    listedSince: item.listedSince,
    priceDrop: item.priceDrop ? { amount: item.priceDrop.amount, at: item.priceDrop.at } : null,
  };
}

// Les titres des deux encadrés d'un bien, repris par le dossier (M119 B).
export const WHY_TITLE = 'Pourquoi ce bien correspond à votre recherche';
export const KNOW_TITLE = 'À savoir';
