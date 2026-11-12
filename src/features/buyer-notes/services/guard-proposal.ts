import { BUYER_LANGUAGES, type BuyerLanguage } from '@/features/buyer-messages/languages';
import { BUYER_NAME_MAX, BUYER_TEXT_MAX } from '@/features/buyers/constants';
import { NOTE_STAR_CRITERIA, NOTE_STARS_MAX } from '@/features/buyer-notes/note-stars';
import {
  BUYER_PROPERTY_TYPES,
  BUYER_PURPOSES,
  BUYER_SOFT_CRITERIA,
  BUYER_SOFT_WORDS_MAX,
  BUYER_TIMELINES,
  ENERGY_RATINGS,
  type BuyerPropertyType,
} from '@/features/buyers/types';
import { refusedWordIn } from '@/features/buyer-notes/services/refused-words';
import type { NoteField, NoteProposal, NoteStar, NoteValues } from '@/features/buyer-notes/types';

// Mission 151 — les gardes du serveur sur la réponse du modèle, quoi que dise la consigne (mesure
// provisoire du plan B, 12/11). Pur. La réponse est une DONNÉE : chaque champ est relu par liste
// d'autorisation, une valeur hors liste ou hors bornes est absente, jamais devinée (M38, M51).
//
//   1. un ★ sans sa ligne d'origine (« must_have:<clé> ») tombe ; deux ★ au plus, parmi ceux de
//      l'écran (M132) ; le budget ★ sans plafond tombe ;
//   2. un « non » (extérieur, parking, piscine, ascenseur, travaux, copropriété) n'est gardé que si
//      sa ligne d'origine le dit en toutes lettres ; sinon il devient « inconnu » ;
//   3. le motif, le délai et la langue sans ligne d'origine tombent : aucune valeur par défaut ;
//   4. « comptant » devient une suggestion, jamais « Validé » ;
//   5. ce qui s'enregistre (les Notes, leurs mots) ne contient aucune mention refusée : le texte
//      tombe et la mention est comptée ; les sources, seulement montrées, ne sont pas filtrées
//      (règle des deux comptes, Jean-Guy, 12/11).

const NO_FIELDS = [
  'outdoor',
  'parking',
  'pool',
  'elevator',
  'worksAccepted',
  'condominiumAccepted',
] as const satisfies readonly NoteField[];

// Les noms de la réponse du modèle (ceux de la base) vers ceux de la fiche.
const SOURCE_FIELDS: Record<string, NoteField> = {
  name: 'name',
  phone: 'phone',
  email: 'email',
  purpose: 'purpose',
  timeline: 'timeline',
  language: 'language',
  property_types: 'propertyTypes',
  cities: 'cities',
  budget_ideal: 'budgetIdeal',
  budget_max: 'budgetMax',
  rooms_min: 'roomsMin',
  bedrooms_min: 'bedroomsMin',
  surface_min: 'surfaceMin',
  outdoor: 'outdoor',
  parking: 'parking',
  pool: 'pool',
  floor_min: 'floorMin',
  elevator: 'elevator',
  energy_rating_max: 'energyRatingMax',
  works_accepted: 'worksAccepted',
  condominium_accepted: 'condominiumAccepted',
  notes: 'notes',
};

const SOURCE_MAX = 200;
const NEGATION =
  /(^|[^a-z])(pas|sans|non|aucun|aucune|ni|jamais|refus|refuse|refusent|exclu|exclus)([^a-z]|$)/;

const fold = (value: string): string => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const text = (value: unknown, max: number): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed.slice(0, max);
};

const integer = (value: unknown, min: number, max: number): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
    ? value
    : null;

const oneOf = <T extends string>(list: readonly T[], value: unknown): T | null =>
  typeof value === 'string' && (list as readonly string[]).includes(value) ? (value as T) : null;

const bool = (value: unknown): boolean | null => (typeof value === 'boolean' ? value : null);

export function guardProposal(raw: unknown): Omit<NoteProposal, 'communes'> {
  const out = typeof raw === 'object' && raw != null ? (raw as Record<string, unknown>) : {};

  // Les sources : la ligne des notes, par champ. La première vaut ; une source vide n'en est pas une.
  const sourceOf = new Map<string, string>();
  for (const item of Array.isArray(out.sources) ? out.sources : []) {
    if (typeof item !== 'object' || item == null) continue;
    const { field, quote } = item as { field?: unknown; quote?: unknown };
    const line = text(quote, SOURCE_MAX);
    if (typeof field !== 'string' || !line || sourceOf.has(field)) continue;
    sourceOf.set(field, line);
  }

  const values: Partial<NoteValues> = {};
  const name = text(out.name, BUYER_NAME_MAX);
  if (name) values.name = name;
  const phone = text(out.phone, 40);
  if (phone) values.phone = phone;
  const email = text(out.email, 120);
  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) values.email = email;

  // 3. Aucune valeur par défaut : sans ligne d'origine, le motif, le délai et la langue tombent.
  const purpose = oneOf(BUYER_PURPOSES, out.purpose);
  if (purpose && sourceOf.has('purpose')) values.purpose = purpose;
  const timeline = oneOf(BUYER_TIMELINES, out.timeline);
  if (timeline && sourceOf.has('timeline')) values.timeline = timeline;
  const language = oneOf<BuyerLanguage>(BUYER_LANGUAGES, out.language);
  if (language && language !== 'fr' && sourceOf.has('language')) values.language = language;

  const types = Array.isArray(out.property_types)
    ? [...new Set(out.property_types)].filter((type): type is BuyerPropertyType =>
        (BUYER_PROPERTY_TYPES as readonly unknown[]).includes(type),
      )
    : [];
  if (types.length > 0) values.propertyTypes = types;
  const cities = Array.isArray(out.cities)
    ? out.cities.map((city) => text(city, 80)).filter((city): city is string => city != null)
    : [];
  if (cities.length > 0) values.cities = [...new Set(cities)].slice(0, 12);

  const budgetIdeal = integer(out.budget_ideal, 1, 100_000_000);
  const budgetMax = integer(out.budget_max, 1, 100_000_000);
  if (budgetMax != null) values.budgetMax = budgetMax;
  // Un idéal au-dessus du plafond ne se devine pas : il tombe, le plafond reste.
  if (budgetIdeal != null && (budgetMax == null || budgetIdeal <= budgetMax)) {
    values.budgetIdeal = budgetIdeal;
  }
  const rooms = integer(out.rooms_min, 0, 50);
  const bedrooms = integer(out.bedrooms_min, 0, 50);
  if (rooms != null) values.roomsMin = rooms;
  if (bedrooms != null && (rooms == null || bedrooms <= rooms)) values.bedroomsMin = bedrooms;
  const surface = integer(out.surface_min, 1, 100_000);
  if (surface != null) values.surfaceMin = surface;
  const floor = integer(out.floor_min, 0, 60);
  if (floor != null) values.floorMin = floor;
  const rating = oneOf(ENERGY_RATINGS, out.energy_rating_max);
  if (rating) values.energyRatingMax = rating;

  // 2. Un « non » n'est gardé que si sa ligne d'origine le dit en toutes lettres.
  const flags: Record<(typeof NO_FIELDS)[number], unknown> = {
    outdoor: out.outdoor,
    parking: out.parking,
    pool: out.pool,
    elevator: out.elevator,
    worksAccepted: out.works_accepted,
    condominiumAccepted: out.condominium_accepted,
  };
  const modelName = Object.fromEntries(Object.entries(SOURCE_FIELDS).map(([k, v]) => [v, k]));
  for (const field of NO_FIELDS) {
    const value = bool(flags[field]);
    if (value === true) values[field] = true;
    if (value === false) {
      const line = sourceOf.get(modelName[field]);
      if (line && NEGATION.test(fold(line))) values[field] = false;
    }
  }

  // 5. Ce qui s'enregistre : les Notes et leurs mots, jamais une mention refusée.
  let skipped = integer(out.personal_mentions_skipped, 0, 99) ?? 0;
  const notes = text(out.notes, BUYER_TEXT_MAX);
  if (notes) {
    if (refusedWordIn(notes)) skipped += 1;
    else values.notes = notes;
  }
  const softCriteria: NoteProposal['softCriteria'] = [];
  for (const item of Array.isArray(out.soft_criteria) ? out.soft_criteria : []) {
    if (typeof item !== 'object' || item == null) continue;
    const { key, words } = item as { key?: unknown; words?: unknown };
    const criterion = oneOf(BUYER_SOFT_CRITERIA, key);
    if (!criterion || softCriteria.some((kept) => kept.key === criterion)) continue;
    const said = text(words, BUYER_SOFT_WORDS_MAX) ?? '';
    if (said && refusedWordIn(said)) {
      skipped += 1;
      continue;
    }
    softCriteria.push({
      key: criterion,
      words: said,
      source: sourceOf.get('soft_criteria') ?? null,
    });
  }

  // 1. Les ★ : sa ligne d'origine, deux au plus, parmi ceux de l'écran ; le budget ★ veut un plafond.
  const mustHave: NoteProposal['mustHave'] = [];
  for (const key of Array.isArray(out.must_have) ? out.must_have : []) {
    const star = oneOf<NoteStar>(NOTE_STAR_CRITERIA, key);
    if (!star || mustHave.some((kept) => kept.key === star)) continue;
    const line = sourceOf.get(`must_have:${star}`);
    if (!line) continue;
    if (star === 'budget' && values.budgetMax == null) continue;
    // La copropriété ★ veut un « non » gardé (dit en toutes lettres, sa source comprise).
    if (star === 'condominium' && values.condominiumAccepted !== false) continue;
    if (mustHave.length >= NOTE_STARS_MAX) break;
    mustHave.push({ key: star, source: line });
  }

  // 4. Le financement : « comptant » n'est qu'une suggestion.
  const financingRead = typeof out.financing === 'string' ? out.financing : null;
  const financing =
    financingRead === 'validated' || financingRead === 'in_progress' ? financingRead : null;
  const cashSuggestion = financingRead === 'cash_to_verify';

  // Les sources de chaque champ gardé, et d'eux seuls.
  const sources: NoteProposal['sources'] = {};
  for (const [modelField, field] of Object.entries(SOURCE_FIELDS)) {
    const line = sourceOf.get(modelField);
    if (line && values[field] !== undefined) sources[field] = line;
  }
  const financingLine = sourceOf.get('financing');
  const financingSource = (financing || cashSuggestion) && financingLine ? financingLine : null;

  return {
    values,
    sources,
    mustHave,
    financing,
    cashSuggestion,
    financingSource,
    softCriteria,
    personalMentionsSkipped: skipped,
  };
}

// Les noms des champs proposés, pour la trace : jamais une valeur.
export function proposedFieldNames(proposal: Omit<NoteProposal, 'communes'>): string[] {
  const names: string[] = Object.keys(proposal.values);
  if (proposal.financing || proposal.cashSuggestion) names.push('financing');
  for (const star of proposal.mustHave) names.push(`must_have:${star.key}`);
  for (const soft of proposal.softCriteria) names.push(`soft:${soft.key}`);
  return names.slice(0, 60);
}
