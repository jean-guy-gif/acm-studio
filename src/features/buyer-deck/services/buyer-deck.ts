import { allowedItem } from '@/features/buyer-presentation/services/build-presentation';
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
import type { BuyerCriterion, BuyerInput } from '@/features/buyers/types';
import { normalizePropertyType } from '@/features/competitor-search/utils/normalize-property-type';
import { DPE_CLASSES, dpeClass } from '@/features/dpe/services/dpe';
import { BUDGET_MARGIN_PERCENT } from '@/features/ideal-properties/services/ideal-criteria';
import { buyerBudgetTone } from '@/features/buyer-deck/services/buyer-budget-tone';
import {
  buyerCommuneKey,
  communeCovered,
} from '@/features/meeting-conclusion/services/commune-alias';
import { neutralComparableLabel } from '@/features/live-seller/utils/neutral-comparable-label';
import { clientTexts, type TextLanguage } from '@/lib/client-texts';
import type { ClientTexts } from '@/lib/client-texts/types';
import { formatDay, formatEuro, formatSquareMeters } from '@/lib/format';

// Mission 140 — chaque phrase vit dans les textes du client, dans la langue de l'acquéreur (le
// français par défaut) ; ce service ne fait que choisir et assembler.
type DeckTexts = ClientTexts['buyer']['deck'];
const deckTexts = (language: TextLanguage): DeckTexts => clientTexts(language).buyer.deck;

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

const area = (value: number, language: TextLanguage): string =>
  formatSquareMeters(Math.round(value), { language });
const euro = (value: number, language: TextLanguage): string => formatEuro(value, { language });

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
export function criterionRowLabel(
  criterion: BuyerCriterion,
  buyer: BuyerInput,
  language: TextLanguage = 'fr',
): string {
  const t = deckTexts(language);
  switch (criterion) {
    case 'property_types':
      return buyer.propertyTypes
        .map((type) => (type === 'house' ? t.row.house : t.row.apartment))
        .join(t.row.or);
    case 'cities':
      return buyer.cities.join(', ');
    case 'budget':
      return t.row.budget(euro(buyer.budgetMax ?? 0, language));
    case 'rooms':
      return t.row.andMore(t.count.rooms(buyer.roomsMin ?? 0));
    case 'bedrooms':
      return t.row.andMore(t.count.bedrooms(buyer.bedroomsMin ?? 0));
    case 'surface':
      return t.row.andMore(area(buyer.surfaceMin ?? 0, language));
    case 'floor':
      return buyer.floorMin === 0 ? t.row.groundFloorAccepted : t.row.floor(buyer.floorMin ?? 0);
    case 'energy_rating':
      return t.row.energy(buyer.energyRatingMax ?? '');
    case 'works':
      return t.row.noWorks;
    default:
      return t.criteria[criterion];
  }
}

// Les lignes de la grille : les indispensables (★) d'abord, puis les préférences, chacune dans
// l'ordre de la fiche.
export function deckCriteria(buyer: BuyerInput, language: TextLanguage = 'fr'): DeckCriterion[] {
  const active = CRITERIA_ORDER.filter((criterion) => isActiveCriterion(criterion, buyer));
  const row = (criterion: BuyerCriterion, mustHave: boolean): DeckCriterion => ({
    criterion,
    label: criterionRowLabel(criterion, buyer, language),
    mustHave,
  });
  return [
    ...active.filter((criterion) => buyer.mustHave.includes(criterion)).map((c) => row(c, true)),
    ...active.filter((criterion) => !buyer.mustHave.includes(criterion)).map((c) => row(c, false)),
  ];
}

const labelsOf = (labels: Record<string, string>, values: string[]): string =>
  values.map((value) => labels[value] ?? value).join(', ');

// Un critère vu sur un bien : ✓ satisfait, ≈ proche (dans la marge, écart nommé), ✗ non, ? à
// vérifier ensemble (non indiqué). Le fait suit la marque : « ✓ 2 chambres, comme demandé ».
export function judgeForBuyer(
  criterion: BuyerCriterion,
  buyer: BuyerInput,
  item: PresentedItemInput,
  language: TextLanguage = 'fr',
): { mark: GridMark; text: string } {
  const texts = clientTexts(language);
  const t = texts.buyer.deck;
  const j = t.judge;
  const check = (which: BuyerCriterion): { mark: GridMark; text: string } => ({
    mark: 'check',
    text: j.check(t.criteria[which]),
  });
  switch (criterion) {
    case 'property_types': {
      const type = normalizePropertyType(item.propertyType);
      if (type !== 'apartment' && type !== 'house') return check(criterion);
      const said = type === 'house' ? j.aHouse : j.anApartment;
      return (buyer.propertyTypes as readonly string[]).includes(type)
        ? { mark: 'ok', text: said }
        : { mark: 'no', text: type === 'house' ? j.houseNotFlat : j.flatNotHouse };
    }
    case 'cities': {
      const wanted = buyer.cities
        .map((city) => buyerCommuneKey(city))
        .filter((key): key is string => key != null);
      const key = buyerCommuneKey(item.city);
      if (key == null || item.city == null) return check(criterion);
      return communeCovered(wanted, key)
        ? { mark: 'ok', text: j.inCity(item.city) }
        : { mark: 'no', text: j.outsideCities(item.city) };
    }
    case 'budget': {
      const max = buyer.budgetMax ?? 0;
      if (item.price == null) {
        // Décision du 24/10 : un vendeur à relancer ne montre aucun prix.
        return item.source === 'project'
          ? { mark: 'check', text: j.priceToConfirm }
          : { mark: 'check', text: j.priceToCheck };
      }
      if (item.price <= max) {
        const margin = max - item.price;
        return {
          mark: 'ok',
          text: margin > 0 ? j.inBudgetMargin(euro(margin, language)) : j.inBudget,
        };
      }
      const over = item.price - max;
      return item.price <= max * (1 + BUDGET_MARGIN_PERCENT / 100)
        ? { mark: 'near', text: j.overNegotiable(euro(over, language)) }
        : { mark: 'no', text: j.overBudget(euro(over, language)) };
    }
    case 'rooms': {
      const min = buyer.roomsMin ?? 0;
      if (item.roomsCount == null) return check(criterion);
      const said = t.count.rooms(item.roomsCount);
      return item.roomsCount >= min
        ? { mark: 'ok', text: item.roomsCount === min ? j.asAsked(said) : said }
        : { mark: 'no', text: j.insteadOf(said, String(min)) };
    }
    case 'bedrooms': {
      const min = buyer.bedroomsMin ?? 0;
      if (item.bedroomsCount == null) return check(criterion);
      const said = t.count.bedrooms(item.bedroomsCount);
      return item.bedroomsCount >= min
        ? { mark: 'ok', text: item.bedroomsCount === min ? j.asAsked(said) : said }
        : { mark: 'no', text: j.insteadOf(said, String(min)) };
    }
    case 'surface': {
      const min = buyer.surfaceMin ?? 0;
      if (item.surfaceArea == null) return check(criterion);
      if (item.surfaceArea >= min) return { mark: 'ok', text: area(item.surfaceArea, language) };
      const text = j.insteadOf(area(item.surfaceArea, language), area(min, language));
      return item.surfaceArea >= min * SURFACE_NEAR_RATIO
        ? { mark: 'near', text }
        : { mark: 'no', text };
    }
    case 'outdoor': {
      const present = item.outdoor.filter((space) => space !== 'none');
      if (present.length > 0) return { mark: 'ok', text: labelsOf(texts.labels.outdoor, present) };
      return item.outdoor.includes('none') ? { mark: 'no', text: j.noOutdoor } : check(criterion);
    }
    case 'parking': {
      const present = item.parking.filter((type) => type !== 'none');
      if (present.length > 0) return { mark: 'ok', text: labelsOf(texts.labels.parking, present) };
      return item.parking.includes('none') ? { mark: 'no', text: j.noParking } : check(criterion);
    }
    case 'pool':
      if (item.hasPool == null) return check(criterion);
      return item.hasPool ? { mark: 'ok', text: j.aPool } : { mark: 'no', text: j.noPool };
    case 'floor': {
      const min = buyer.floorMin ?? 0;
      if (item.floor == null) return check(criterion);
      const said = item.floor === 0 ? j.groundFloor : j.floor(item.floor);
      return item.floor >= min
        ? { mark: 'ok', text: said }
        : { mark: 'no', text: j.floorInsteadOf(said, min) };
    }
    case 'elevator':
      if (item.hasElevator == null) return check(criterion);
      return item.hasElevator
        ? { mark: 'ok', text: j.anElevator }
        : { mark: 'no', text: j.noElevator };
    case 'energy_rating': {
      const letter = dpeClass(item.energyRating);
      if (letter == null) return check(criterion);
      return DPE_CLASSES.indexOf(letter) <= DPE_CLASSES.indexOf(buyer.energyRatingMax ?? 'G')
        ? { mark: 'ok', text: j.dpe(letter) }
        : { mark: 'no', text: j.dpeBeyond(letter, buyer.energyRatingMax ?? '') };
    }
    case 'works':
      if (item.condition == null) return check(criterion);
      return WORKS_CONDITIONS.has(item.condition)
        ? { mark: 'no', text: j.worksNeeded }
        : { mark: 'ok', text: j.noWorksAnnounced };
  }
}

// « Vous m'avez dit : » — la phrase proposée, bâtie depuis la fiche : le type et les pièces, les
// communes, les indispensables, le budget plafond. Le conseiller la relit et la modifie.
export function proposedBuyerWords(buyer: BuyerInput, language: TextLanguage = 'fr'): string {
  const w = deckTexts(language).words;
  const types = buyer.propertyTypes;
  const rooms = buyer.roomsMin;
  const head =
    types.length === 1 && types[0] === 'house'
      ? w.house(rooms ?? null)
      : rooms != null
        ? w.rooms(rooms)
        : types.length === 1
          ? w.apartment
          : w.property;
  const where = w.where(buyer.cities);
  const musts = CRITERIA_ORDER.filter(
    (criterion) => buyer.mustHave.includes(criterion) && isActiveCriterion(criterion, buyer),
  )
    .map((criterion): string | null => {
      switch (criterion) {
        case 'bedrooms':
          return w.bedrooms(buyer.bedroomsMin ?? 0);
        case 'surface':
          return w.surface(area(buyer.surfaceMin ?? 0, language));
        case 'outdoor':
          return w.outdoor;
        case 'parking':
          return w.parking;
        case 'pool':
          return w.pool;
        case 'floor':
          return buyer.floorMin === 0 ? null : w.floor(buyer.floorMin ?? 0);
        case 'elevator':
          return w.elevator;
        case 'energy_rating':
          return w.energy(buyer.energyRatingMax ?? '');
        case 'works':
          return w.noWorks;
        default:
          // Le type, les pièces, les communes et le budget sont déjà dans la phrase.
          return null;
      }
    })
    .filter((part): part is string => part != null);
  const budget = buyer.budgetMax != null ? w.budget(euro(buyer.budgetMax, language)) : null;
  return `${[`${head}${where}`, ...musts, ...(budget ? [budget] : [])].join(', ')}.`;
}

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
  language: TextLanguage = 'fr',
): string | null {
  const t = deckTexts(language);
  const total = marks.length;
  if (total === 0) return null;
  const surface = okMark(marks, 'surface')?.text ?? null;
  const equipments = [
    okMark(marks, 'pool') ? t.pitch.pool : null,
    okMark(marks, 'outdoor') && item?.outdoor.includes('garden') ? t.pitch.garden : null,
    okMark(marks, 'outdoor') && item?.outdoor.includes('terrace') ? t.pitch.terrace : null,
    okMark(marks, 'parking') && item?.parking.includes('garage') ? t.pitch.garage : null,
  ]
    .filter((fact): fact is string => fact != null)
    .slice(0, 2);
  const place = okMark(marks, 'cities') && item?.city ? t.pitch.at(item.city) : null;
  const margin =
    okMark(marks, 'budget') && item?.price != null && budgetMax != null && budgetMax > item.price
      ? t.pitch.margin(euro(budgetMax - item.price, language))
      : null;
  const core = [surface, equipments.length > 0 ? t.and(equipments) : null]
    .filter((part): part is string => part != null)
    .join(', ');
  const located = [core, place].filter((part) => part != null && part !== '').join(' ');
  const sentence = [located, margin].filter((part) => part != null && part !== '').join(', ');
  if (sentence !== '') return clampPitch(`${capitalize(sentence)}.`);
  const ok = marks.filter((mark) => mark.mark === 'ok').length;
  if (ok === total) return null;
  const open = marks.filter((mark) => mark.mark !== 'ok').map((mark) => t.nouns[mark.criterion]);
  return clampPitch(t.pitch.fallback(ok, total, t.and(open), open.length > 1));
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
export function datedFact(
  item: PresentedItemInput,
  now: Date,
  language: TextLanguage = 'fr',
): string | null {
  const t = deckTexts(language).dated;
  const parts: string[] = [];
  if (item.listedSince) {
    const days = daysSince(item.listedSince, now);
    if (days != null) {
      parts.push(days === 0 ? t.listedToday : t.listedFor(days));
    }
  }
  if (item.priceDrop && item.priceDrop.amount > 0) {
    const days = item.priceDrop.at ? daysSince(item.priceDrop.at, now) : null;
    parts.push(t.drop(euro(item.priceDrop.amount, language), days));
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

// La phrase de tête, sous la grille : le bien qui coche le plus de critères (à égalité, l'ordre de
// la sélection), jamais un bien qui porte ✗ sur un indispensable (décision du 25/10), et aucune
// phrase quand aucun bien ne coche rien.
export function leadOf(
  items: DeckItem[],
  language: TextLanguage = 'fr',
): { letter: string; sentence: string } | null {
  const t = deckTexts(language).lead;
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
      sentence: t.several(letters),
    };
  }
  return {
    letter: best.letter,
    sentence:
      best.okCount === best.total
        ? t.full(best.letter)
        : t.most(best.letter, best.okCount, best.total),
  };
}

export const leadSentence = (items: DeckItem[], language: TextLanguage = 'fr'): string | null =>
  leadOf(items, language)?.sentence ?? null;

export function buildBuyerDeck(input: {
  buyerId: string;
  buyer: BuyerInput;
  selectionId: string;
  selectedAt: string;
  presentedAt: string | null;
  buyerWords: string | null;
  items: DeckItemInput[];
  now: Date;
  // Mission 140 — la langue de l'acquéreur (le français par défaut).
  language?: TextLanguage;
}): BuyerDeck {
  const language = input.language ?? 'fr';
  const t = deckTexts(language);
  const criteria = deckCriteria(input.buyer, language);
  const ordered = [...input.items].sort((a, b) => a.position - b.position);
  const items = ordered.map((raw, index): DeckItem => {
    // Mission 140 — le libellé neutre, écrit en français à la sélection : hors français, il se
    // recompose depuis les champs du bien, dans la langue de l'acquéreur.
    const allowed = allowedItem(raw);
    const item = language === 'fr' ? allowed : { ...allowed, label: buyerLabel(allowed, language) };
    const budgetTone = buyerBudgetTone(item.price, input.buyer.budgetMax);
    const marks = criteria.map((row): DeckMark => {
      const verdict = judgeForBuyer(row.criterion, input.buyer, item, language);
      return {
        criterion: row.criterion,
        ...verdict,
        tone: row.criterion === 'budget' ? budgetTone : null,
      };
    });
    const proposed = proposedPitch(marks, item, input.buyer.budgetMax, language);
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
              t.priceLine(euro(item.price, language)),
              item.source === 'listing' && item.priceSeenOn
                ? seenOn(item.priceSeenOn, t, language)
                : null,
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
      datedFact: datedFact(item, input.now, language),
      blocked: blockedBy.length > 0,
      blockedBy,
    };
  });
  const wordsProposed = proposedBuyerWords(input.buyer, language);
  const lead = leadOf(items, language);
  return {
    language,
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
function buyerLabel(item: PresentedItemInput, language: TextLanguage): string {
  const label = neutralComparableLabel(
    {
      propertyType: normalizePropertyType(item.propertyType),
      roomsCount: item.roomsCount,
      surfaceArea: item.surfaceArea,
      city: item.city,
      district: item.district,
    },
    language,
  );
  const texts = clientTexts(language);
  // Pour l'acquéreur, un bien n'est jamais « un concurrent ».
  return label === texts.common.competitorFallback ? texts.buyer.screens.propertyFallback : label;
}

export const criteriaCountLabel = (item: DeckItem, language: TextLanguage = 'fr'): string =>
  deckTexts(language).criteriaCount(item.okCount, item.total);

// « affiché le 24/10/2026 » : le jour où le prix a été vu (M118), rien de plus.
function seenOn(priceSeenOn: string, t: DeckTexts, language: TextLanguage): string | null {
  const date = new Date(`${priceSeenOn}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return t.seenOn(formatDay(date.toISOString(), language, 'numeric'));
}

export const markSymbol = (mark: GridMark): string => GRID_SYMBOLS[mark];
