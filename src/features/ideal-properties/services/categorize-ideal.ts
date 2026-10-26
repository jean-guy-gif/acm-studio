import {
  BUYER_CRITERION_LABELS,
  type BuyerCriterion,
  type BuyerInput,
} from '@/features/buyers/types';
import { matchPercent } from '@/features/competitor-search/services/match-percent';
import { assessProximity } from '@/features/competitor-search/services/proximity';
import type {
  CompetitorCandidate,
  CompetitorSearchCriteria,
} from '@/features/competitor-search/types';
import { normalizePropertyType } from '@/features/competitor-search/utils/normalize-property-type';
import { DPE_CLASSES, dpeClass } from '@/features/dpe/services/dpe';
import { BUDGET_MARGIN_PERCENT } from '@/features/ideal-properties/services/ideal-criteria';
import { IDEAL_CATEGORIES, type IdealCategory } from '@/features/ideal-properties/types';
import {
  buyerCommuneKey,
  communeCovered,
} from '@/features/meeting-conclusion/services/commune-alias';
import { formatEuro } from '@/lib/format';

// Mission 118 — les trois catégories, décidées par un service PUR à partir des indispensables de
// la fiche (M117) :
//   • Correspondance forte : tous les indispensables satisfaits, et les préférences aussi ;
//   • Bon compromis : tous les indispensables satisfaits, une ou plusieurs préférences non, chacune
//     nommée (« Pas de piscine », « 2 chambres au lieu de 3 ») ;
//   • À explorer : un indispensable que l'annonce N'INDIQUE PAS (M61 : la donnée absente est le
//     critère) ; la carte dit lequel vérifier.
// Un indispensable CONTREDIT écarte le bien, compté avec sa raison. Une préférence non indiquée
// est neutre. Seuls les critères renseignés sur la fiche comptent. Le % de M71 classe à l'intérieur
// de chaque catégorie.

export type CriterionVerdict =
  { kind: 'ok' } | { kind: 'gap'; label: string } | { kind: 'unknown' };

export type IdealVerdict =
  | {
      kind: 'kept';
      category: IdealCategory;
      gaps: string[];
      toCheck: string[];
      percent: number | null;
      // Essai de Jean-Guy (26/10) : « N critères sur M » remplace le % de correspondance — les
      // critères renseignés de la fiche que l'annonce satisfait, sur tous les critères renseignés
      // (un critère que l'annonce n'indique pas compte dans M, comme dans la grille du déroulé).
      criteriaOk: number;
      criteriaTotal: number;
    }
  | { kind: 'excluded'; reasons: string[] };

export type CategorizedCandidate = {
  candidate: CompetitorCandidate;
  category: IdealCategory;
  gaps: string[];
  toCheck: string[];
  percent: number | null;
  criteriaOk: number;
  criteriaTotal: number;
};

export type IdealCategorization = {
  byCategory: Record<IdealCategory, CategorizedCandidate[]>;
  excluded: { count: number; reasons: { label: string; count: number }[] };
};

const plural = (count: number, one: string, many: string): string =>
  `${count} ${count > 1 ? many : one}`;

// « 7 pièces » : le libellé d'un nombre, pour les écarts.
const WORKS_CONDITIONS = new Set(['to_refresh', 'to_renovate', 'major_renovation']);

export function judgeCriterion(
  criterion: BuyerCriterion,
  buyer: BuyerInput,
  candidate: CompetitorCandidate,
): CriterionVerdict | null {
  const features = candidate.features;
  switch (criterion) {
    case 'property_types': {
      if (buyer.propertyTypes.length === 0) return null;
      const type = normalizePropertyType(candidate.propertyType);
      if (type == null) return { kind: 'unknown' };
      return (buyer.propertyTypes as readonly string[]).includes(type)
        ? { kind: 'ok' }
        : {
            kind: 'gap',
            label:
              type === 'house'
                ? 'Une maison, pas un appartement'
                : 'Un appartement, pas une maison',
          };
    }
    case 'cities': {
      const wanted = buyer.cities
        .map((city) => buyerCommuneKey(city))
        .filter((key): key is string => key != null);
      if (wanted.length === 0) return null;
      const key = buyerCommuneKey(candidate.city);
      if (key == null) return { kind: 'unknown' };
      return communeCovered(wanted, key)
        ? { kind: 'ok' }
        : { kind: 'gap', label: `Hors des communes demandées (${candidate.city})` };
    }
    case 'budget': {
      if (buyer.budgetMax == null) return null;
      if (candidate.price == null) return { kind: 'unknown' };
      if (candidate.price <= buyer.budgetMax) return { kind: 'ok' };
      const over = candidate.price - buyer.budgetMax;
      const withinMargin = candidate.price <= buyer.budgetMax * (1 + BUDGET_MARGIN_PERCENT / 100);
      return {
        kind: 'gap',
        label: withinMargin
          ? `${formatEuro(over)} au-dessus du budget, à négocier`
          : `Budget dépassé de ${formatEuro(over)}`,
      };
    }
    case 'rooms': {
      if (buyer.roomsMin == null) return null;
      if (candidate.roomsCount == null) return { kind: 'unknown' };
      return candidate.roomsCount >= buyer.roomsMin
        ? { kind: 'ok' }
        : {
            kind: 'gap',
            label: `${plural(candidate.roomsCount, 'pièce', 'pièces')} au lieu de ${buyer.roomsMin}`,
          };
    }
    case 'bedrooms': {
      if (buyer.bedroomsMin == null) return null;
      const bedrooms = candidate.streamEstate?.bedrooms ?? null;
      if (bedrooms == null) return { kind: 'unknown' };
      return bedrooms >= buyer.bedroomsMin
        ? { kind: 'ok' }
        : {
            kind: 'gap',
            label: `${plural(bedrooms, 'chambre', 'chambres')} au lieu de ${buyer.bedroomsMin}`,
          };
    }
    case 'surface': {
      if (buyer.surfaceMin == null) return null;
      if (candidate.surfaceArea == null) return { kind: 'unknown' };
      return candidate.surfaceArea >= buyer.surfaceMin
        ? { kind: 'ok' }
        : {
            kind: 'gap',
            label: `${Math.round(candidate.surfaceArea)} m² au lieu de ${Math.round(buyer.surfaceMin)} m²`,
          };
    }
    case 'outdoor': {
      if (buyer.outdoor !== true) return null;
      if (features?.outdoor == null) return { kind: 'unknown' };
      return features.outdoor.present.length > 0
        ? { kind: 'ok' }
        : { kind: 'gap', label: 'Pas d’extérieur' };
    }
    case 'parking': {
      if (buyer.parking !== true) return null;
      if (features?.parking == null) return { kind: 'unknown' };
      return features.parking.length > 0
        ? { kind: 'ok' }
        : { kind: 'gap', label: 'Pas de parking' };
    }
    case 'pool': {
      if (buyer.pool !== true) return null;
      if (features?.hasPool == null) return { kind: 'unknown' };
      return features.hasPool ? { kind: 'ok' } : { kind: 'gap', label: 'Pas de piscine' };
    }
    case 'floor': {
      if (buyer.floorMin == null) return null;
      if (features?.floor == null) return { kind: 'unknown' };
      return features.floor >= buyer.floorMin
        ? { kind: 'ok' }
        : {
            kind: 'gap',
            label:
              features.floor === 0
                ? 'Rez-de-chaussée'
                : `${features.floor}e étage au lieu du ${buyer.floorMin}e`,
          };
    }
    case 'elevator': {
      if (buyer.elevator !== true) return null;
      if (features?.hasElevator == null) return { kind: 'unknown' };
      return features.hasElevator ? { kind: 'ok' } : { kind: 'gap', label: 'Sans ascenseur' };
    }
    case 'energy_rating': {
      if (buyer.energyRatingMax == null) return null;
      const letter = dpeClass(candidate.energyClass);
      if (letter == null) return { kind: 'unknown' };
      return DPE_CLASSES.indexOf(letter) <= DPE_CLASSES.indexOf(buyer.energyRatingMax)
        ? { kind: 'ok' }
        : { kind: 'gap', label: `DPE ${letter}, au-delà de ${buyer.energyRatingMax}` };
    }
    case 'works': {
      if (buyer.worksAccepted !== false) return null;
      if (features?.condition == null) return { kind: 'unknown' };
      return WORKS_CONDITIONS.has(features.condition)
        ? { kind: 'gap', label: 'Travaux à prévoir' }
        : { kind: 'ok' };
    }
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

export function judgeCandidate(
  buyer: BuyerInput,
  candidate: CompetitorCandidate,
  criteria: CompetitorSearchCriteria | null = null,
): IdealVerdict {
  const mustHave = new Set(buyer.mustHave);
  const reasons: string[] = [];
  const gaps: string[] = [];
  const toCheck: string[] = [];
  let criteriaOk = 0;
  let criteriaTotal = 0;
  for (const criterion of CRITERIA_ORDER) {
    const verdict = judgeCriterion(criterion, buyer, candidate);
    if (verdict == null) continue;
    criteriaTotal += 1;
    if (verdict.kind === 'ok') {
      criteriaOk += 1;
      continue;
    }
    const essential = mustHave.has(criterion);
    if (verdict.kind === 'gap') {
      // Mission 118 — un indispensable contredit écarte ; le budget indispensable est strict.
      if (essential) reasons.push(verdict.label);
      else gaps.push(verdict.label);
    } else if (essential) {
      toCheck.push(BUYER_CRITERION_LABELS[criterion]);
    }
  }
  if (reasons.length > 0) return { kind: 'excluded', reasons };
  const category: IdealCategory =
    toCheck.length > 0 ? 'explore' : gaps.length > 0 ? 'compromise' : 'strong';
  return {
    kind: 'kept',
    category,
    gaps,
    toCheck,
    percent: percentOf(criteria, buyer, candidate),
    criteriaOk,
    criteriaTotal,
  };
}

// Le % de correspondance de M71, sur les critères de la fiche ; la commune compte comme « même
// commune » dès qu'elle est l'une des communes demandées.
function percentOf(
  criteria: CompetitorSearchCriteria | null,
  buyer: BuyerInput,
  candidate: CompetitorCandidate,
): number | null {
  if (criteria == null) return null;
  const wanted = buyer.cities
    .map((city) => buyerCommuneKey(city))
    .filter((key): key is string => key != null);
  const key = buyerCommuneKey(candidate.city);
  const reasons = assessProximity(
    criteria,
    candidate,
    null,
    normalizePropertyType(criteria.propertyType),
  ).reasons;
  return matchPercent(criteria, candidate, reasons, {
    distanceMeters: null,
    sameCommune: key != null && communeCovered(wanted, key),
  });
}

// Le groupe d'écartés, par raison : « budget dépassé (4), pas d'extérieur (3) ». La raison garde
// son libellé sans le montant, pour se regrouper.
function reasonGroup(label: string): string {
  // Un budget indispensable est strict : au-dessus, même de peu, c'est « budget dépassé ».
  if (label.startsWith('Budget dépassé') || label.includes('au-dessus du budget')) {
    return 'budget dépassé';
  }
  if (label.startsWith('Hors des communes')) return 'hors des communes demandées';
  if (label.includes('au lieu de')) {
    if (label.includes('chambre')) return 'moins de chambres';
    if (label.includes('pièce')) return 'moins de pièces';
    if (label.includes('m²')) return 'surface insuffisante';
    return 'étage trop bas';
  }
  if (label.startsWith('DPE')) return 'DPE au-delà de la classe acceptée';
  return label.charAt(0).toLowerCase() + label.slice(1);
}

export function categorizeIdeal(
  buyer: BuyerInput,
  candidates: CompetitorCandidate[],
  criteria: CompetitorSearchCriteria | null = null,
): IdealCategorization {
  const byCategory: Record<IdealCategory, CategorizedCandidate[]> = {
    strong: [],
    compromise: [],
    explore: [],
  };
  const excludedReasons = new Map<string, number>();
  let excluded = 0;
  for (const candidate of candidates) {
    const verdict = judgeCandidate(buyer, candidate, criteria);
    if (verdict.kind === 'excluded') {
      excluded += 1;
      for (const reason of verdict.reasons) {
        const group = reasonGroup(reason);
        excludedReasons.set(group, (excludedReasons.get(group) ?? 0) + 1);
      }
      continue;
    }
    byCategory[verdict.category].push({ candidate, ...verdict });
  }
  const byPercentThenPrice = (a: CategorizedCandidate, b: CategorizedCandidate): number =>
    (b.percent ?? -1) - (a.percent ?? -1) ||
    (a.candidate.price ?? Number.MAX_SAFE_INTEGER) - (b.candidate.price ?? Number.MAX_SAFE_INTEGER);
  for (const category of IDEAL_CATEGORIES) byCategory[category].sort(byPercentThenPrice);
  return {
    byCategory,
    excluded: {
      count: excluded,
      reasons: [...excludedReasons]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([label, count]) => ({ label, count })),
    },
  };
}

// « 7 écartés : budget dépassé (4), pas d'extérieur (3) »
export function excludedLine(excluded: IdealCategorization['excluded']): string | null {
  if (excluded.count === 0) return null;
  const reasons = excluded.reasons.map((reason) => `${reason.label} (${reason.count})`).join(', ');
  return `${plural(excluded.count, 'écarté', 'écartés')} : ${reasons}`;
}
