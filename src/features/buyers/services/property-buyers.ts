import { buyerToCriteria } from '@/features/buyers/services/buyer-criteria';
import { NO_PROGRESS, type BuyerProgressFacts } from '@/features/buyers/services/buyer-progress';
import { buyerReadiness } from '@/features/buyers/services/buyer-readiness';
import type { Buyer, BuyerCriterion } from '@/features/buyers/types';
import type { CompetitorCandidate } from '@/features/competitor-search/types';
import { dpeClass } from '@/features/dpe/services/dpe';
import { judgeCriterion } from '@/features/ideal-properties/services/categorize-ideal';
import { reconcileBuyer } from '@/features/meeting-conclusion/services/buyer-reconciliation';

// Mission 133 — la boucle vendeur → acquéreurs : les acquéreurs DE TOUTE L'AGENCE (décision du
// 05/11) qui correspondent à un bien vendeur, et parmi eux ceux qui sont « Prêts à visiter » (132).
// Une seule règle pour le bloc du dossier, le Suivi, le Live et la tâche du mandat signé. Pur.
//
// Correspondre (décision du chef sur la question 1 de l'architecte, 06/11) : les règles du
// rapprochement de M86 — type, communes (alias compris), pièces, surface à 95 %, prix du bien au
// plus budget plafond + 5 % — plus les autres indispensables ★ de la fiche, jugés comme les biens
// idéaux (M118) : un ★ que le bien CONTREDIT écarte, un ★ que le bien n'indique pas n'écarte pas.
// Le budget reste toujours à +5 %, même indispensable (la fiche de mission, § 1).

// Sous ce nombre d'acquéreurs prêts, rien au Live : ni pastille, ni bulle, ni écran (§ 9).
export const LIVE_BUYERS_THRESHOLD = 5;

// Le bien vendeur, par ses seuls faits : jamais l'adresse, jamais le nom du vendeur.
export type BuyerLoopProperty = {
  propertyType: string | null;
  roomsCount: number | null;
  surfaceArea: number | null;
  city: string | null;
  bedroomsCount: number | null;
  floor: number | null;
  hasElevator: boolean | null;
  hasPool: boolean | null;
  outdoorSpaces: string[];
  parkingTypes: string[];
  energyRating: string | null;
  generalCondition: string | null;
};

// § 3 — le prix de référence du bien : le prix retenu ensemble, sinon l'analyse du conseiller (figée
// à la conclusion, sinon celle de la décision de prix), sinon le haut de la fourchette du
// conseiller. Sans aucun, aucun acquéreur ne correspond (le bloc le dit).
export type ReferencePriceSources = {
  commercializationPrice: number | null;
  frozenAdvisorAnalysis: number | null;
  advisorAnalysis: number | null;
  advisorPriceMax: number | null;
};

export function buyerReferencePrice(sources: ReferencePriceSources): number | null {
  for (const value of [
    sources.commercializationPrice,
    sources.frozenAdvisorAnalysis,
    sources.advisorAnalysis,
    sources.advisorPriceMax,
  ]) {
    if (value != null && Number.isFinite(value) && value > 0) return value;
  }
  return null;
}

// Les indispensables que les règles de M86 ne jugent pas : ceux-là, la fiche les juge comme les
// biens idéaux (M118), sur les faits du bien vendeur. Le type, les communes, les pièces, la surface
// et le budget sont déjà dans les règles de M86.
// Les chambres se jugent ici (le jugement des biens idéaux les lit chez Stream Estate).
const STAR_ONLY: BuyerCriterion[] = [
  'outdoor',
  'parking',
  'pool',
  'floor',
  'elevator',
  'energy_rating',
  'works',
];

// Le bien vendeur dans la forme qu'attend le jugement des biens idéaux. Une liste vide
// (extérieurs, stationnement) ne dit rien : le bien « n'indique pas », il ne contredit pas.
function asCandidate(property: BuyerLoopProperty, price: number): CompetitorCandidate {
  return {
    key: null,
    url: '',
    title: null,
    price,
    surfaceArea: property.surfaceArea,
    roomsCount: property.roomsCount,
    propertyType: property.propertyType,
    pricePerSqm: null,
    landArea: null,
    city: property.city,
    photoUrls: [],
    isNewBuild: false,
    energyClass: dpeClass(property.energyRating),
    features: {
      location: null,
      locationDiscarded: false,
      district: null,
      floor: property.floor,
      hasElevator: property.hasElevator,
      hasPool: property.hasPool,
      parking: property.parkingTypes.length > 0 ? property.parkingTypes : null,
      outdoor:
        property.outdoorSpaces.length > 0 ? { present: property.outdoorSpaces, absent: [] } : null,
      condition: property.generalCondition,
      exposure: null,
      constructionYear: null,
    },
  };
}

// Un indispensable ★ que le bien contredit.
function starContradicted(buyer: Buyer, property: BuyerLoopProperty, price: number): boolean {
  if (
    buyer.mustHave.includes('bedrooms') &&
    buyer.bedroomsMin != null &&
    property.bedroomsCount != null &&
    property.bedroomsCount < buyer.bedroomsMin
  ) {
    return true;
  }
  const candidate = asCandidate(property, price);
  return buyer.mustHave.some(
    (criterion) =>
      STAR_ONLY.includes(criterion) && judgeCriterion(criterion, buyer, candidate)?.kind === 'gap',
  );
}

export function buyerMatchesProperty(
  buyer: Buyer,
  property: BuyerLoopProperty,
  price: number,
): boolean {
  const reconciliation = reconcileBuyer(buyerToCriteria(buyer), [
    {
      key: 'property',
      group: 'mandate',
      title: null,
      propertyType: property.propertyType,
      roomsCount: property.roomsCount,
      surfaceArea: property.surfaceArea,
      city: property.city,
      price,
      projectId: '',
      sellerName: '',
      sellerPhone: null,
      step: null,
      listingUrl: null,
    },
  ]);
  if (reconciliation.matchCount !== 1) return false;
  return !starContradicted(buyer, property, price);
}

// Ce qui manque à un acquéreur qui correspond pour être prêt, dit au conseiller.
export type PropertyBuyerMissing =
  'financing_in_progress' | 'financing_unknown' | 'budget' | 'recontact';

export const PROPERTY_BUYER_MISSING_LABELS: Record<PropertyBuyerMissing, string> = {
  financing_in_progress: 'Financement en cours',
  financing_unknown: 'Financement à confirmer',
  budget: 'Budget à préciser',
  recontact: 'À recontacter',
};

export type PropertyBuyer = {
  buyer: Buyer;
  ready: boolean;
  missing: PropertyBuyerMissing | null;
  // Le dernier signe de vie, pour ranger les prêts : les plus récemment actifs d'abord.
  sinceDays: number | null;
};

export type PropertyBuyers = {
  // null : aucun prix de référence, on ne peut rien comparer.
  price: number | null;
  ready: PropertyBuyer[];
  others: PropertyBuyer[];
};

export function propertyBuyers(
  buyers: Buyer[],
  progress: Map<string, BuyerProgressFacts>,
  property: BuyerLoopProperty | null,
  price: number | null,
  now: Date,
): PropertyBuyers {
  const result: PropertyBuyers = { price, ready: [], others: [] };
  if (property == null || price == null) return result;
  for (const buyer of buyers) {
    // Un acquéreur qui a acheté ou abandonné ne cherche plus (M117).
    if (buyer.status !== 'searching' && buyer.status !== 'visiting') continue;
    if (!buyerMatchesProperty(buyer, property, price)) continue;
    const readiness = buyerReadiness(buyer, progress.get(buyer.id) ?? NO_PROGRESS, now);
    const ready = readiness.state === 'ready';
    const missing: PropertyBuyerMissing | null = ready
      ? null
      : readiness.state === 'recontact'
        ? 'recontact'
        : buyer.financing === 'in_progress'
          ? 'financing_in_progress'
          : buyer.financing === 'unknown'
            ? 'financing_unknown'
            : 'budget';
    const entry = { buyer, ready, missing, sinceDays: readiness.sinceDays };
    (ready ? result.ready : result.others).push(entry);
  }
  const bySince = (a: PropertyBuyer, b: PropertyBuyer) =>
    (a.sinceDays ?? Infinity) - (b.sinceDays ?? Infinity) ||
    a.buyer.name.localeCompare(b.buyer.name);
  result.ready.sort(bySince);
  result.others.sort(bySince);
  return result;
}

// « 7 prêts à visiter · 3 autres correspondent » : l'en-tête du bloc, sur le dossier et le Suivi.
export function propertyBuyersHeadline(readyCount: number, othersCount: number): string | null {
  if (readyCount === 0 && othersCount === 0) return null;
  const parts: string[] = [];
  if (readyCount > 0) {
    parts.push(`${readyCount} prêt${readyCount > 1 ? 's' : ''} à visiter`);
  }
  if (othersCount > 0) {
    const others = readyCount > 0 ? 'autre' : 'acquéreur';
    parts.push(
      othersCount > 1
        ? `${othersCount} ${others}s correspondent`
        : `${othersCount} ${others} correspond`,
    );
  }
  return parts.join(' · ');
}

export const NO_MATCHING_BUYER = 'Aucun acquéreur de l’agence ne correspond pour l’instant.';
export const NO_REFERENCE_PRICE =
  'Prix de référence à fixer : décidez votre prix, ou saisissez votre fourchette, pour rapprocher les acquéreurs de l’agence.';
export const BUYERS_UNREAD =
  'Les acquéreurs de l’agence n’ont pas pu être lus pour l’instant : rechargez la page.';

// « Envoyer le lien » : refusé hors d'un mandat signé, ou pour un acquéreur qui ne correspond plus.
export const NOT_SIGNED_MESSAGE =
  'Ce bien n’est pas un mandat signé : il ne se propose pas encore.';
export const NOT_MATCHING_MESSAGE = 'Cet acquéreur ne correspond plus à ce bien.';
