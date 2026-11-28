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
//   4. un achat comptant n'est jamais « Validé » ; comment il finance (lot B) n'est gardé qu'avec
//      sa ligne d'origine, qui le dit — comptant, ou un prêt —, comme une ★ ;
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

const WORKS_NUANCE =
  /(^|[^a-z])(gros|ok|ca va|accept\w*|sauf|mais|refaire|rafraich\w*|peinture|petits?|legers?|coup de)([^a-z]|$)/;

// Mission 151 — une ★ veut une ligne qui la dit ferme (Jean-Guy, 12/11) : un mot qui l'exige,
// « +++ », « !! », ou un mot écrit en MAJUSCULES (hors sigles : RDC, DPE, T3, FAI, ASL…).
const FIRM =
  /indispensable|obligatoire|oblige|imperati|absolu|non[ -]negociable|exige|exigence|il (le )?faut|faut absolument|necessaire|essentiel|incontournable|primordial|a tout prix|sine qua non|ferme|uniquement|seulement|pas un euro|!!|\+\+\+/;
const ACRONYMS = /\b(RDC|DPE|GES|FAI|ASL|CRM|SDB|OK|T\d|F\d)\b/g;
export function saysFirm(line: string): boolean {
  return FIRM.test(fold(line)) || /\b[A-ZÀ-Ý]{3,}\b/.test(line.replace(ACRONYMS, ''));
}

// Lot B (Jean-Guy, 27/11) — comment il finance : la ligne d'origine doit le dire. « Sans prêt »,
// « pas de banque » sont un achat comptant, jamais un prêt.
const SAYS_CASH =
  /comptant|cash|fonds propres|(sans|pas|pas besoin) (de |d'|d’|d'un |d’un )?(banque|pret|credit|emprunt)/;
const SAYS_LOAN = /pret|credit|emprunt|banque|bancaire|courtier|accord de principe/;
export function saysMode(mode: 'cash' | 'loan', line: string): boolean {
  const folded = fold(line);
  return mode === 'cash'
    ? SAYS_CASH.test(folded)
    : SAYS_LOAN.test(folded) && !SAYS_CASH.test(folded);
}

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
  const nuances: string[] = [];
  for (const field of NO_FIELDS) {
    const value = bool(flags[field]);
    if (value === true) values[field] = true;
    if (value === false) {
      const line = sourceOf.get(modelName[field]);
      // Les travaux : un « non » nuancé dans la même ligne (« gros travaux non, cuisine à refaire
      // OK ») n'en est pas un ; il reste inconnu (N6, 12/11).
      const nuanced = field === 'worksAccepted' && line != null && WORKS_NUANCE.test(fold(line));
      if (line && NEGATION.test(fold(line)) && !nuanced) values[field] = false;
      // La nuance ne se perd pas : elle va dans Notes, « (à vérifier) », comme une condition
      // (Jean-Guy, 12/11).
      if (nuanced && line) nuances.push(`${line} (à vérifier)`);
    }
  }

  // 5. Ce qui s'enregistre : les Notes et leurs mots, jamais une mention refusée.
  let skipped = integer(out.personal_mentions_skipped, 0, 99) ?? 0;
  const notes = text(out.notes, BUYER_TEXT_MAX);
  if (notes) {
    if (refusedWordIn(notes)) skipped += 1;
    else values.notes = notes;
  }
  for (const nuance of nuances) {
    if (refusedWordIn(nuance) || fold(values.notes ?? '').includes(fold(nuance.slice(0, 30)))) {
      continue;
    }
    const joined = values.notes ? `${values.notes} ${nuance}` : nuance;
    if (joined.length <= BUYER_TEXT_MAX) values.notes = joined;
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
  const unfirmSources: Partial<Record<(typeof STAR_EQUIPMENTS)[number], string>> = {};
  for (const key of Array.isArray(out.must_have) ? out.must_have : []) {
    const star = oneOf<NoteStar>(NOTE_STAR_CRITERIA, key);
    if (!star || mustHave.some((kept) => kept.key === star)) continue;
    const line = sourceOf.get(`must_have:${star}`);
    if (!line) continue;
    // Sans ligne ferme, pas de ★ ; mais l'équipement voulu reste proposé « oui » (Jean-Guy, 12/11).
    if (!saysFirm(line)) {
      if ((STAR_EQUIPMENTS as readonly string[]).includes(star)) {
        const field = star as (typeof STAR_EQUIPMENTS)[number];
        if (values[field] === undefined) {
          values[field] = true;
          unfirmSources[field] = line;
        }
      }
      continue;
    }
    if (star === 'budget' && values.budgetMax == null) continue;
    // La copropriété ★ veut un « non » gardé (dit en toutes lettres, sa source comprise).
    if (star === 'condominium' && values.condominiumAccepted !== false) continue;
    if (mustHave.length >= NOTE_STARS_MAX) break;
    mustHave.push({ key: star, source: line });
  }

  // 4. Le financement : l'état (validé, en cours) ; un achat comptant n'est jamais « Validé ».
  const financingRead = typeof out.financing === 'string' ? out.financing : null;
  const financing =
    financingRead === 'validated' || financingRead === 'in_progress' ? financingRead : null;
  // Lot B — comment il finance : gardé seulement si sa ligne d'origine le dit.
  const modeRead = oneOf(['cash', 'loan'] as const, out.financing_mode);
  const modeLine = sourceOf.get('financing_mode') ?? null;
  const financingMode = modeRead && modeLine && saysMode(modeRead, modeLine) ? modeRead : null;

  // Les sources de chaque champ gardé, et d'eux seuls.
  const sources: NoteProposal['sources'] = {};
  for (const [modelField, field] of Object.entries(SOURCE_FIELDS)) {
    const line = sourceOf.get(modelField);
    if (line && values[field] !== undefined) sources[field] = line;
  }
  for (const [field, line] of Object.entries(unfirmSources)) {
    const key = field as (typeof STAR_EQUIPMENTS)[number];
    if (sources[key] === undefined && values[key] === true) sources[key] = line;
  }
  if (sources.notes === undefined && values.notes !== undefined && nuances.length > 0) {
    sources.notes = nuances[0]!.replace(/ \(à vérifier\)$/, '');
  }
  // Une ★ sur un équipement le dit voulu : le champ est « oui », avec la ligne de la ★ pour
  // source, et sa carte le montre (sinon la ★ écrivait « oui » sans carte à vérifier, C5 du 12/11) ;
  // un « non » gardé contredit la ★, qui tombe.
  for (const star of [...mustHave]) {
    if (!(STAR_EQUIPMENTS as readonly string[]).includes(star.key)) continue;
    const field = star.key as (typeof STAR_EQUIPMENTS)[number];
    if (values[field] === false) {
      mustHave.splice(mustHave.indexOf(star), 1);
      continue;
    }
    if (values[field] === undefined) {
      values[field] = true;
      sources[field] = star.source;
    }
  }
  const financingLine = sourceOf.get('financing');
  const financingSource = financing && financingLine ? financingLine : null;

  return {
    values,
    sources,
    mustHave,
    financing,
    financingSource,
    financingMode,
    financingModeSource: financingMode ? modeLine : null,
    softCriteria,
    personalMentionsSkipped: skipped,
  };
}

const STAR_EQUIPMENTS = ['outdoor', 'parking', 'pool', 'elevator'] as const;

// Les noms des champs proposés, pour la trace : jamais une valeur.
export function proposedFieldNames(proposal: Omit<NoteProposal, 'communes'>): string[] {
  const names: string[] = Object.keys(proposal.values);
  if (proposal.financing) names.push('financing');
  if (proposal.financingMode) names.push('financing_mode');
  for (const star of proposal.mustHave) names.push(`must_have:${star.key}`);
  for (const soft of proposal.softCriteria) names.push(`soft:${soft.key}`);
  return names.slice(0, 60);
}
