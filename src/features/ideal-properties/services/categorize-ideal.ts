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

// La refonte, lot C — « Pourquoi celui-ci pour eux » (maquettes REFONTE-3, 5 et 6) : ce que le bien
// a de ce que la fiche demande, dans ses mots. `must` : un indispensable (★) satisfait ; `said` :
// ce que l'annonce dit de ce qui compte pour eux (ajouté à l'écran, M151 B) ; `plain` : un autre
// souhait satisfait. Jamais un pourcentage.
export type WhyPill = { tone: 'must' | 'said' | 'plain'; label: string };

export type IdealVerdict =
  | {
      kind: 'kept';
      category: IdealCategory;
      gaps: string[];
      toCheck: string[];
      // Mission 151 — à vérifier sans changer la catégorie : une préférence que l'annonce ne dit
      // pas et qu'une carte doit nommer quand même (« Copropriété : à vérifier »).
      toVerify: string[];
      percent: number | null;
      // Essai de Jean-Guy (26/10) : « N critères sur M » remplace le % de correspondance — les
      // critères renseignés de la fiche que l'annonce satisfait, sur tous les critères renseignés
      // (un critère que l'annonce n'indique pas compte dans M, comme dans la grille du déroulé).
      criteriaOk: number;
      criteriaTotal: number;
      // La refonte, lot C — les critères satisfaits, en mots : les indispensables d'abord.
      why: WhyPill[];
    }
  | { kind: 'excluded'; reasons: string[] };

export type CategorizedCandidate = {
  candidate: CompetitorCandidate;
  category: IdealCategory;
  gaps: string[];
  toCheck: string[];
  toVerify: string[];
  percent: number | null;
  criteriaOk: number;
  criteriaTotal: number;
  why: WhyPill[];
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

// Mission 151 — « Copropriété acceptée » (Jean-Guy, 10/11) : seul un « non » juge quelque chose.
// Une copropriété connue le contredit ; une copropriété inconnue n'écarte jamais un bien.
export const CONDOMINIUM_LABEL = 'Copropriété';
export const IN_CONDOMINIUM = 'En copropriété';
export const CONDOMINIUM_TO_VERIFY = `${CONDOMINIUM_LABEL} : à vérifier`;
export const OUT_OF_CONDOMINIUM = 'Hors copropriété';

export function judgeCondominium(
  buyer: Pick<BuyerInput, 'condominiumAccepted'>,
  isCondominium: boolean | null | undefined,
): CriterionVerdict | null {
  if (buyer.condominiumAccepted !== false) return null;
  if (isCondominium == null) return { kind: 'unknown' };
  return isCondominium ? { kind: 'gap', label: IN_CONDOMINIUM } : { kind: 'ok' };
}

// Un critère SATISFAIT, dit comme une raison de proposer le bien — ou rien : le type et le budget
// se lisent déjà dans le libellé et dans la pastille du prix ; des pièces, des chambres ou une
// surface « juste comme demandé » ne font pas une raison, « de plus » si (10 m² au moins). Un
// indispensable (★) se dit toujours, par son fait.
const SURFACE_BONUS = 10;

function metLabel(
  criterion: BuyerCriterion,
  buyer: BuyerInput,
  candidate: CompetitorCandidate,
  essential: boolean,
): string | null {
  const features = candidate.features;
  switch (criterion) {
    case 'property_types':
    case 'budget':
      return null;
    case 'cities':
      return candidate.city?.trim() || null;
    case 'rooms': {
      const rooms = candidate.roomsCount ?? 0;
      if (essential) return plural(rooms, 'pièce', 'pièces');
      const more = rooms - (buyer.roomsMin ?? rooms);
      return more > 0 ? `${plural(more, 'pièce', 'pièces')} de plus` : null;
    }
    case 'bedrooms': {
      const bedrooms = candidate.streamEstate?.bedrooms ?? 0;
      if (essential) return plural(bedrooms, 'chambre', 'chambres');
      const more = bedrooms - (buyer.bedroomsMin ?? bedrooms);
      return more > 0 ? `${plural(more, 'chambre', 'chambres')} de plus` : null;
    }
    case 'surface': {
      const surface = Math.round(candidate.surfaceArea ?? 0);
      if (essential) return `${surface} m²`;
      const more = surface - Math.round(buyer.surfaceMin ?? surface);
      return more >= SURFACE_BONUS ? `${more} m² de plus` : null;
    }
    case 'outdoor':
    case 'parking':
    case 'pool':
    case 'elevator':
      return BUYER_CRITERION_LABELS[criterion];
    case 'floor': {
      if (!essential || features?.floor == null) return null;
      return features.floor === 0
        ? 'Rez-de-chaussée'
        : `${features.floor}${features.floor === 1 ? 'er' : 'e'} étage`;
    }
    case 'energy_rating': {
      const letter = dpeClass(candidate.energyClass);
      return essential && letter ? `DPE ${letter}` : null;
    }
    case 'works':
      return 'Sans travaux à prévoir';
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
  const met: WhyPill[] = [];
  let criteriaOk = 0;
  let criteriaTotal = 0;
  for (const criterion of CRITERIA_ORDER) {
    const verdict = judgeCriterion(criterion, buyer, candidate);
    if (verdict == null) continue;
    criteriaTotal += 1;
    const essential = mustHave.has(criterion);
    if (verdict.kind === 'ok') {
      criteriaOk += 1;
      const label = metLabel(criterion, buyer, candidate, essential);
      if (label) met.push({ tone: essential ? 'must' : 'plain', label });
      continue;
    }
    if (verdict.kind === 'gap') {
      // Mission 118 — un indispensable contredit écarte ; le budget indispensable est strict.
      if (essential) reasons.push(verdict.label);
      else gaps.push(verdict.label);
    } else if (essential) {
      toCheck.push(BUYER_CRITERION_LABELS[criterion]);
    }
  }
  // Mission 151 — la copropriété, à part des indispensables de `mustHave` (sa ★ a sa colonne) :
  // connue, elle écarte avec la ★, sinon elle est un écart nommé du « Bon compromis » ; inconnue,
  // elle met le bien « À explorer » avec la ★, sinon elle se dit seulement sur la carte.
  const toVerify: string[] = [];
  const condominium = judgeCondominium(buyer, candidate.features?.isCondominium);
  if (condominium != null) {
    criteriaTotal += 1;
    const essential = buyer.condominiumMustHave === true;
    if (condominium.kind === 'ok') {
      criteriaOk += 1;
      met.push({ tone: essential ? 'must' : 'plain', label: OUT_OF_CONDOMINIUM });
    } else if (condominium.kind === 'gap') (essential ? reasons : gaps).push(condominium.label);
    else if (essential) toCheck.push(CONDOMINIUM_LABEL);
    else toVerify.push(CONDOMINIUM_LABEL);
  }
  if (reasons.length > 0) return { kind: 'excluded', reasons };
  const category: IdealCategory =
    toCheck.length > 0 ? 'explore' : gaps.length > 0 ? 'compromise' : 'strong';
  return {
    kind: 'kept',
    category,
    gaps,
    toCheck,
    toVerify,
    percent: percentOf(criteria, buyer, candidate),
    criteriaOk,
    criteriaTotal,
    // Les indispensables d'abord, chacun dans l'ordre de la fiche.
    why: [
      ...met.filter((pill) => pill.tone === 'must'),
      ...met.filter((pill) => pill.tone !== 'must'),
    ],
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

// Ce que la carte et le dossier remis disent « à vérifier » : les indispensables que l'annonce ne
// dit pas, puis les préférences à vérifier sans changer la catégorie. Une seule écriture pour la
// forme pour tous, celle d'un bien de l'agence : « Extérieur : à vérifier », « Copropriété : à
// vérifier » (Jean-Guy, 12/11).
export function toVerifyLabels(
  entry: Pick<CategorizedCandidate, 'toCheck' | 'toVerify'>,
): string[] {
  return [...entry.toCheck, ...entry.toVerify].map((label) => `${label} : à vérifier`);
}

// « 7 écartés : budget dépassé (4), pas d'extérieur (3) »
export function excludedLine(excluded: IdealCategorization['excluded']): string | null {
  if (excluded.count === 0) return null;
  const reasons = excluded.reasons.map((reason) => `${reason.label} (${reason.count})`).join(', ');
  return `${plural(excluded.count, 'écarté', 'écartés')} : ${reasons}`;
}
