import { allowedItem } from '@/features/buyer-presentation/services/build-presentation';
import { PRICE_TO_CONFIRM } from '@/features/buyer-presentation/services/agency-price';
import type { PresentedItemInput } from '@/features/buyer-presentation/types';
import {
  GRID_SYMBOLS,
  PITCH_MAX,
  type BuyerDeck,
  type DeckCriterion,
  type DeckItem,
  type DeckItemInput,
  type DeckMark,
  type GridMark,
} from '@/features/buyer-deck/types';
import {
  BUYER_CRITERION_LABELS,
  type BuyerCriterion,
  type BuyerInput,
} from '@/features/buyers/types';
import { normalizePropertyType } from '@/features/competitor-search/utils/normalize-property-type';
import { DPE_CLASSES, dpeClass } from '@/features/dpe/services/dpe';
import { BUDGET_MARGIN_PERCENT } from '@/features/ideal-properties/services/ideal-criteria';
import { seenOnLabel } from '@/features/ideal-properties/services/ideal-selection-labels';
import { buyerBudgetTone } from '@/features/buyer-deck/services/buyer-budget-tone';
import {
  buyerCommuneKey,
  communeCovered,
} from '@/features/meeting-conclusion/services/commune-alias';
import {
  OUTDOOR_SPACE_LABELS,
  PARKING_TYPE_LABELS,
} from '@/features/subject-property/constants/property-options';
import { formatEuro, formatSquareMeters } from '@/lib/format';

// Mission 122 — le constructeur du déroulé, PUR : il ne reçoit que la fiche (M117), la sélection
// (M118) et les biens en liste d'autorisation (M119). Tout part de sa recherche : chaque critère
// renseigné de la fiche devient une ligne de la grille, jugé bien par bien sur les seuls faits de
// l'annonce ou du dossier. L'outil n'invente rien : la phrase « Pourquoi » ne dit que ce que la
// grille dit, et un critère que l'annonce n'indique pas est « à vérifier », jamais deviné.

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

// Les marges de M86, où un écart reste « proche » (décision de Jean-Guy, 25/10) : le budget
// jusqu'à +5 %, la surface jusqu'à 95 % de la demande.
const SURFACE_NEAR_RATIO = 0.95;
const WORKS_CONDITIONS = new Set(['to_refresh', 'to_renovate', 'major_renovation']);
const LETTERS = ['A', 'B', 'C', 'D', 'E'];

const plural = (count: number, one: string, many: string): string =>
  `${count} ${count > 1 ? many : one}`;
const m2 = (value: number): string => formatSquareMeters(Math.round(value));
const ordinal = (floor: number): string => (floor === 1 ? '1er' : `${floor}e`);

// Un critère est sur la grille s'il est renseigné sur la fiche.
export function isActiveCriterion(criterion: BuyerCriterion, buyer: BuyerInput): boolean {
  switch (criterion) {
    case 'property_types':
      return buyer.propertyTypes.length > 0;
    case 'cities':
      return buyer.cities.length > 0;
    case 'budget':
      return buyer.budgetMax != null;
    case 'rooms':
      return buyer.roomsMin != null;
    case 'bedrooms':
      return buyer.bedroomsMin != null;
    case 'surface':
      return buyer.surfaceMin != null;
    case 'outdoor':
      return buyer.outdoor === true;
    case 'parking':
      return buyer.parking === true;
    case 'pool':
      return buyer.pool === true;
    case 'floor':
      return buyer.floorMin != null;
    case 'elevator':
      return buyer.elevator === true;
    case 'energy_rating':
      return buyer.energyRatingMax != null;
    case 'works':
      return buyer.worksAccepted === false;
  }
}

// La ligne de la grille, en mots courts : « Antibes », « 3 pièces et plus », « Budget ≤ 430 000 € ».
export function criterionRowLabel(criterion: BuyerCriterion, buyer: BuyerInput): string {
  switch (criterion) {
    case 'property_types':
      return buyer.propertyTypes
        .map((type) => (type === 'house' ? 'Maison' : 'Appartement'))
        .join(' ou ');
    case 'cities':
      return buyer.cities.join(', ');
    case 'budget':
      return `Budget ≤ ${formatEuro(buyer.budgetMax ?? 0)}`;
    case 'rooms':
      return `${plural(buyer.roomsMin ?? 0, 'pièce', 'pièces')} et plus`;
    case 'bedrooms':
      return `${plural(buyer.bedroomsMin ?? 0, 'chambre', 'chambres')} et plus`;
    case 'surface':
      return `${m2(buyer.surfaceMin ?? 0)} et plus`;
    case 'floor':
      return buyer.floorMin === 0
        ? 'Rez-de-chaussée accepté'
        : `${ordinal(buyer.floorMin ?? 0)} étage et plus`;
    case 'energy_rating':
      return `DPE ${buyer.energyRatingMax} ou mieux`;
    case 'works':
      return 'Sans travaux';
    default:
      return BUYER_CRITERION_LABELS[criterion];
  }
}

// Les lignes de la grille : les indispensables (★) d'abord, puis les préférences, chacune dans
// l'ordre de la fiche.
export function deckCriteria(buyer: BuyerInput): DeckCriterion[] {
  const active = CRITERIA_ORDER.filter((criterion) => isActiveCriterion(criterion, buyer));
  const row = (criterion: BuyerCriterion, mustHave: boolean): DeckCriterion => ({
    criterion,
    label: criterionRowLabel(criterion, buyer),
    mustHave,
  });
  return [
    ...active.filter((criterion) => buyer.mustHave.includes(criterion)).map((c) => row(c, true)),
    ...active.filter((criterion) => !buyer.mustHave.includes(criterion)).map((c) => row(c, false)),
  ];
}

const check = (criterion: BuyerCriterion): { mark: GridMark; text: string } => ({
  mark: 'check',
  text: `${BUYER_CRITERION_LABELS[criterion]} : à vérifier à la visite`,
});

const labelsOf = (labels: Record<string, string>, values: string[]): string =>
  values.map((value) => labels[value] ?? value).join(', ');

// Un critère vu sur un bien : ✓ satisfait, ≈ proche (dans la marge, écart nommé), ✗ non, ? à
// vérifier ensemble (non indiqué). Le fait suit la marque : « ✓ 2 chambres, comme demandé ».
export function judgeForBuyer(
  criterion: BuyerCriterion,
  buyer: BuyerInput,
  item: PresentedItemInput,
): { mark: GridMark; text: string } {
  switch (criterion) {
    case 'property_types': {
      const type = normalizePropertyType(item.propertyType);
      if (type !== 'apartment' && type !== 'house') return check(criterion);
      const said = type === 'house' ? 'Une maison' : 'Un appartement';
      return (buyer.propertyTypes as readonly string[]).includes(type)
        ? { mark: 'ok', text: said }
        : {
            mark: 'no',
            text:
              type === 'house'
                ? 'Une maison, pas un appartement'
                : 'Un appartement, pas une maison',
          };
    }
    case 'cities': {
      const wanted = buyer.cities
        .map((city) => buyerCommuneKey(city))
        .filter((key): key is string => key != null);
      const key = buyerCommuneKey(item.city);
      if (key == null || item.city == null) return check(criterion);
      return communeCovered(wanted, key)
        ? { mark: 'ok', text: `À ${item.city}` }
        : { mark: 'no', text: `Hors de vos communes (${item.city})` };
    }
    case 'budget': {
      const max = buyer.budgetMax ?? 0;
      if (item.price == null) {
        // Décision du 24/10 : un vendeur à relancer ne montre aucun prix.
        return item.source === 'project'
          ? { mark: 'check', text: PRICE_TO_CONFIRM }
          : { mark: 'check', text: 'Prix : à vérifier ensemble' };
      }
      if (item.price <= max) {
        const margin = max - item.price;
        return {
          mark: 'ok',
          text:
            margin > 0 ? `Dans votre budget : ${formatEuro(margin)} de marge` : 'Dans votre budget',
        };
      }
      const over = item.price - max;
      return item.price <= max * (1 + BUDGET_MARGIN_PERCENT / 100)
        ? { mark: 'near', text: `${formatEuro(over)} au-dessus de votre budget, à négocier` }
        : { mark: 'no', text: `Budget dépassé de ${formatEuro(over)}` };
    }
    case 'rooms': {
      const min = buyer.roomsMin ?? 0;
      if (item.roomsCount == null) return check(criterion);
      const said = plural(item.roomsCount, 'pièce', 'pièces');
      return item.roomsCount >= min
        ? { mark: 'ok', text: item.roomsCount === min ? `${said}, comme demandé` : said }
        : { mark: 'no', text: `${said} au lieu de ${min}` };
    }
    case 'bedrooms': {
      const min = buyer.bedroomsMin ?? 0;
      if (item.bedroomsCount == null) return check(criterion);
      const said = plural(item.bedroomsCount, 'chambre', 'chambres');
      return item.bedroomsCount >= min
        ? { mark: 'ok', text: item.bedroomsCount === min ? `${said}, comme demandé` : said }
        : { mark: 'no', text: `${said} au lieu de ${min}` };
    }
    case 'surface': {
      const min = buyer.surfaceMin ?? 0;
      if (item.surfaceArea == null) return check(criterion);
      if (item.surfaceArea >= min) return { mark: 'ok', text: m2(item.surfaceArea) };
      const text = `${m2(item.surfaceArea)} au lieu de ${m2(min)}`;
      return item.surfaceArea >= min * SURFACE_NEAR_RATIO
        ? { mark: 'near', text }
        : { mark: 'no', text };
    }
    case 'outdoor': {
      const present = item.outdoor.filter((space) => space !== 'none');
      if (present.length > 0) return { mark: 'ok', text: labelsOf(OUTDOOR_SPACE_LABELS, present) };
      return item.outdoor.includes('none')
        ? { mark: 'no', text: 'Pas d’extérieur' }
        : check(criterion);
    }
    case 'parking': {
      const present = item.parking.filter((type) => type !== 'none');
      if (present.length > 0) return { mark: 'ok', text: labelsOf(PARKING_TYPE_LABELS, present) };
      return item.parking.includes('none')
        ? { mark: 'no', text: 'Pas de parking' }
        : check(criterion);
    }
    case 'pool':
      if (item.hasPool == null) return check(criterion);
      return item.hasPool
        ? { mark: 'ok', text: 'Une piscine' }
        : { mark: 'no', text: 'Pas de piscine' };
    case 'floor': {
      const min = buyer.floorMin ?? 0;
      if (item.floor == null) return check(criterion);
      const said = item.floor === 0 ? 'Rez-de-chaussée' : `${ordinal(item.floor)} étage`;
      return item.floor >= min
        ? { mark: 'ok', text: said }
        : { mark: 'no', text: `${said} au lieu du ${ordinal(min)}` };
    }
    case 'elevator':
      if (item.hasElevator == null) return check(criterion);
      return item.hasElevator
        ? { mark: 'ok', text: 'Un ascenseur' }
        : { mark: 'no', text: 'Sans ascenseur' };
    case 'energy_rating': {
      const letter = dpeClass(item.energyRating);
      if (letter == null) return check(criterion);
      return DPE_CLASSES.indexOf(letter) <= DPE_CLASSES.indexOf(buyer.energyRatingMax ?? 'G')
        ? { mark: 'ok', text: `DPE ${letter}` }
        : { mark: 'no', text: `DPE ${letter}, au-delà de ${buyer.energyRatingMax}` };
    }
    case 'works':
      if (item.condition == null) return check(criterion);
      return WORKS_CONDITIONS.has(item.condition)
        ? { mark: 'no', text: 'Travaux à prévoir' }
        : { mark: 'ok', text: 'Pas de travaux annoncés' };
  }
}

// « Vous m'avez dit : » — la phrase proposée, bâtie depuis la fiche : le type et les pièces, les
// communes, les indispensables, le budget plafond. Le conseiller la relit et la modifie.
export function proposedBuyerWords(buyer: BuyerInput): string {
  const types = buyer.propertyTypes;
  const rooms = buyer.roomsMin;
  const head =
    types.length === 1 && types[0] === 'house'
      ? `Une maison${rooms != null ? ` de ${plural(rooms, 'pièce', 'pièces')}` : ''}`
      : rooms != null
        ? `Un ${plural(rooms, 'pièce', 'pièces')}`
        : types.length === 1
          ? 'Un appartement'
          : 'Un bien';
  const cities = buyer.cities;
  const where =
    cities.length === 0
      ? ''
      : cities.length === 1
        ? ` à ${cities[0]}`
        : ` à ${cities.slice(0, -1).join(', ')} ou ${cities[cities.length - 1]}`;
  const musts = CRITERIA_ORDER.filter(
    (criterion) => buyer.mustHave.includes(criterion) && isActiveCriterion(criterion, buyer),
  )
    .map((criterion): string | null => {
      switch (criterion) {
        case 'bedrooms':
          return `avec ${plural(buyer.bedroomsMin ?? 0, 'chambre', 'chambres')} au moins`;
        case 'surface':
          return `de ${m2(buyer.surfaceMin ?? 0)} au moins`;
        case 'outdoor':
          return 'avec un extérieur';
        case 'parking':
          return 'avec un parking';
        case 'pool':
          return 'avec une piscine';
        case 'floor':
          return buyer.floorMin === 0 ? null : `au ${ordinal(buyer.floorMin ?? 0)} étage au moins`;
        case 'elevator':
          return 'avec un ascenseur';
        case 'energy_rating':
          return `DPE ${buyer.energyRatingMax} ou mieux`;
        case 'works':
          return 'sans travaux';
        default:
          // Le type, les pièces, les communes et le budget sont déjà dans la phrase.
          return null;
      }
    })
    .filter((part): part is string => part != null);
  const budget = buyer.budgetMax != null ? `jusqu’à ${formatEuro(buyer.budgetMax)}` : null;
  return `${[`${head}${where}`, ...musts, ...(budget ? [budget] : [])].join(', ')}.`;
}

// Le nom d'un critère dans une phrase : « la surface est à voir ensemble ».
const CRITERION_NOUNS: Record<BuyerCriterion, string> = {
  property_types: 'le type de bien',
  cities: 'la commune',
  budget: 'le prix',
  rooms: 'le nombre de pièces',
  bedrooms: 'le nombre de chambres',
  surface: 'la surface',
  outdoor: 'l’extérieur',
  parking: 'le parking',
  pool: 'la piscine',
  floor: 'l’étage',
  elevator: 'l’ascenseur',
  energy_rating: 'le DPE',
  works: 'l’état du bien',
};

const joinNouns = (nouns: string[]): string =>
  nouns.length <= 1 ? (nouns[0] ?? '') : `${nouns.slice(0, -1).join(', ')} et ${nouns.at(-1)}`;

// 140 caractères au plus, coupé à un mot, jamais au milieu.
export function clampPitch(text: string): string {
  if (text.length <= PITCH_MAX) return text;
  const cut = text.slice(0, PITCH_MAX - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > 0 ? cut.slice(0, space) : cut).replace(/[\s,;:]+$/, '')}…`;
}

// « Pourquoi je vous le propose » (essai de Jean-Guy, 25/10) — proposée par l'outil depuis les
// SEULS faits de la grille, dans cet ordre : la surface, puis jusqu'à deux extérieurs ou
// équipements satisfaits (piscine, jardin, terrasse, garage), puis la commune, puis la marge de
// budget s'il y en a une — « 210 m², piscine et jardin à Mougins, 10 500 € sous votre budget. » ;
// jamais « Il coche vos N critères », jamais un doute en tête (les « ? » restent dans la liste du
// bien). Sans aucun de ces faits : combien de critères il coche, et ceux à voir ensemble. Jamais
// un adjectif que les faits ne portent pas.
const okMark = (marks: DeckMark[], criterion: BuyerCriterion): DeckMark | undefined =>
  marks.find((mark) => mark.criterion === criterion && mark.mark === 'ok');

const capitalize = (text: string): string =>
  text.length > 0 ? `${text[0]!.toLocaleUpperCase('fr-FR')}${text.slice(1)}` : text;

export function proposedPitch(
  marks: DeckMark[],
  item: Pick<PresentedItemInput, 'outdoor' | 'parking' | 'city' | 'price'> | null = null,
  budgetMax: number | null = null,
): string | null {
  const total = marks.length;
  if (total === 0) return null;
  const surface = okMark(marks, 'surface')?.text ?? null;
  const equipments = [
    okMark(marks, 'pool') ? 'piscine' : null,
    okMark(marks, 'outdoor') && item?.outdoor.includes('garden') ? 'jardin' : null,
    okMark(marks, 'outdoor') && item?.outdoor.includes('terrace') ? 'terrasse' : null,
    okMark(marks, 'parking') && item?.parking.includes('garage') ? 'garage' : null,
  ]
    .filter((fact): fact is string => fact != null)
    .slice(0, 2);
  const place = okMark(marks, 'cities') && item?.city ? `à ${item.city}` : null;
  const margin =
    okMark(marks, 'budget') && item?.price != null && budgetMax != null && budgetMax > item.price
      ? `${formatEuro(budgetMax - item.price)} sous votre budget`
      : null;
  const core = [surface, equipments.length > 0 ? joinNouns(equipments) : null]
    .filter((part): part is string => part != null)
    .join(', ');
  const located = [core, place].filter((part) => part != null && part !== '').join(' ');
  const sentence = [located, margin].filter((part) => part != null && part !== '').join(', ');
  if (sentence !== '') return clampPitch(`${capitalize(sentence)}.`);
  const ok = marks.filter((mark) => mark.mark === 'ok').length;
  if (ok === total) return null;
  const open = marks
    .filter((mark) => mark.mark !== 'ok')
    .map((mark) => CRITERION_NOUNS[mark.criterion]);
  return clampPitch(
    `Il coche ${plural(ok, 'critère', 'critères')} sur ${total} : ${joinNouns(open)} ${
      open.length > 1 ? 'sont' : 'est'
    } à voir ensemble.`,
  );
}

const DAY = 24 * 60 * 60 * 1000;
const dayOf = (date: Date): number =>
  Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
// Des jours de calendrier, pas des tranches de 24 h : mis en vente le 16, on est le 25 → 9 jours.
function daysSince(iso: string, now: Date): number | null {
  const date = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.round((dayOf(now) - dayOf(date)) / DAY));
}

// Un fait daté, s'il existe : « En vente depuis 9 jours », « Baisse de prix de 10 000 € il y a
// 8 jours » (M47) ; sinon rien.
export function datedFact(item: PresentedItemInput, now: Date): string | null {
  const parts: string[] = [];
  if (item.listedSince) {
    const days = daysSince(item.listedSince, now);
    if (days != null) {
      parts.push(
        days === 0
          ? 'Mis en vente aujourd’hui'
          : `En vente depuis ${plural(days, 'jour', 'jours')}`,
      );
    }
  }
  if (item.priceDrop && item.priceDrop.amount > 0) {
    const days = item.priceDrop.at ? daysSince(item.priceDrop.at, now) : null;
    parts.push(
      `Baisse de prix de ${formatEuro(item.priceDrop.amount)}${
        days == null ? '' : days === 0 ? ' aujourd’hui' : ` il y a ${plural(days, 'jour', 'jours')}`
      }`,
    );
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

// La phrase de tête, sous la grille : le bien qui coche le plus de critères (à égalité, l'ordre de
// la sélection), jamais un bien qui porte ✗ sur un indispensable (décision du 25/10), et aucune
// phrase quand aucun bien ne coche rien.
export function leadOf(items: DeckItem[]): { letter: string; sentence: string } | null {
  const candidates = items.filter((item) => !item.blocked && item.total > 0);
  if (candidates.length === 0) return null;
  const best = candidates.reduce((top, item) => (item.okCount > top.okCount ? item : top));
  if (best.okCount === 0) return null;
  // Essai de Jean-Guy (25/10) : plusieurs biens cochent tout — la phrase les nomme tous, sans en
  // choisir un ; « Voir le bien » ouvre le premier.
  const full = candidates.filter((item) => item.okCount === item.total);
  if (full.length > 1) {
    const letters = full.map((item) => item.letter);
    return {
      letter: full[0]!.letter,
      sentence: `Les biens ${letters.slice(0, -1).join(', ')} et ${letters.at(-1)} cochent tous vos critères.`,
    };
  }
  return {
    letter: best.letter,
    sentence:
      best.okCount === best.total
        ? `Le bien ${best.letter} coche tous vos critères : c’est par lui que je vous propose de commencer.`
        : `Le bien ${best.letter} en coche le plus : ${best.okCount} sur ${best.total}.`,
  };
}

export const leadSentence = (items: DeckItem[]): string | null => leadOf(items)?.sentence ?? null;

export function buildBuyerDeck(input: {
  buyerId: string;
  buyer: BuyerInput;
  selectionId: string;
  selectedAt: string;
  presentedAt: string | null;
  buyerWords: string | null;
  items: DeckItemInput[];
  now: Date;
}): BuyerDeck {
  const criteria = deckCriteria(input.buyer);
  const ordered = [...input.items].sort((a, b) => a.position - b.position);
  const items = ordered.map((raw, index): DeckItem => {
    const item = allowedItem(raw);
    const budgetTone = buyerBudgetTone(item.price, input.buyer.budgetMax);
    const marks = criteria.map((row): DeckMark => {
      const verdict = judgeForBuyer(row.criterion, input.buyer, item);
      return {
        criterion: row.criterion,
        ...verdict,
        tone: row.criterion === 'budget' ? budgetTone : null,
      };
    });
    const proposed = proposedPitch(marks, item, input.buyer.budgetMax);
    const blockedBy = marks
      .filter((mark, rowIndex) => criteria[rowIndex]?.mustHave && mark.mark === 'no')
      .map((mark) => mark.text);
    return {
      letter: LETTERS[index] ?? String(index + 1),
      item,
      photos: item.photos.slice(0, 5),
      marks,
      okCount: marks.filter((mark) => mark.mark === 'ok').length,
      total: marks.length,
      priceLine:
        item.price != null
          ? [
              `Prix affiché : ${formatEuro(item.price)}`,
              item.source === 'listing' ? seenOnLabel(item.priceSeenOn) : null,
            ]
              .filter((part): part is string => part != null)
              .join(' · ')
          : null,
      pricePerSqm:
        item.price != null && item.surfaceArea != null && item.surfaceArea > 0
          ? Math.round(item.price / item.surfaceArea)
          : null,
      pitch: raw.pitch?.trim() ? clampPitch(raw.pitch.trim()) : proposed,
      pitchProposed: proposed,
      datedFact: datedFact(item, input.now),
      blocked: blockedBy.length > 0,
      blockedBy,
    };
  });
  const wordsProposed = proposedBuyerWords(input.buyer);
  const lead = leadOf(items);
  return {
    buyerId: input.buyerId,
    buyerName: input.buyer.name,
    selectionId: input.selectionId,
    selectedAt: input.selectedAt,
    presentedAt: input.presentedAt,
    words: input.buyerWords?.trim() ? input.buyerWords.trim() : wordsProposed,
    wordsProposed,
    criteria,
    items,
    lead: lead?.sentence ?? null,
    leadLetter: lead?.letter ?? null,
    meetingAvailability: [],
  };
}

// « 7 critères sur 7 » en tête d'un bien.
export const criteriaCountLabel = (item: DeckItem): string =>
  `${plural(item.okCount, 'critère', 'critères')} sur ${item.total}`;

export const markSymbol = (mark: GridMark): string => GRID_SYMBOLS[mark];
