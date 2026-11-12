import type { Buyer } from '@/features/buyers/types';
import type { NoteField, NoteProposal, NoteValues } from '@/features/buyer-notes/types';

// Mission 151 — la proposition (planche 2) devient le formulaire que « Créer la fiche » ou
// « Compléter la fiche » envoie, relu au serveur comme toute fiche (M117). Pur.
//
// Sur une fiche existante (A.8, Jean-Guy, 10/11) : une valeur différente de celle de la fiche est
// proposée DÉCOCHÉE (« 650 000 € → 750 000 € ») et ne change rien sans coche ; un champ vide de la
// fiche est proposé coché. Les sources ne sont jamais dans le formulaire (principe 2).

// Le nom du champ du formulaire de la fiche (`BUYER_FORM_FIELDS`), par champ de la proposition.
export const NOTE_FORM_FIELDS: Record<NoteField, string> = {
  name: 'name',
  phone: 'phone',
  email: 'email',
  purpose: 'purpose',
  timeline: 'timeline',
  language: 'language',
  propertyTypes: 'property_types',
  cities: 'cities',
  budgetIdeal: 'budget_ideal',
  budgetMax: 'budget_max',
  roomsMin: 'rooms_min',
  bedroomsMin: 'bedrooms_min',
  surfaceMin: 'surface_min',
  outdoor: 'outdoor',
  parking: 'parking',
  pool: 'pool',
  floorMin: 'floor_min',
  elevator: 'elevator',
  energyRatingMax: 'energy_rating_max',
  worksAccepted: 'works_accepted',
  condominiumAccepted: 'condominium_accepted',
  notes: 'notes',
};

const NOTE_FIELDS = Object.keys(NOTE_FORM_FIELDS) as NoteField[];

export type ExistingBuyer = Pick<
  Buyer,
  | 'id'
  | 'name'
  | 'phone'
  | 'email'
  | 'purpose'
  | 'timeline'
  | 'language'
  | 'propertyTypes'
  | 'cities'
  | 'budgetIdeal'
  | 'budgetMax'
  | 'roomsMin'
  | 'bedroomsMin'
  | 'surfaceMin'
  | 'outdoor'
  | 'parking'
  | 'pool'
  | 'floorMin'
  | 'elevator'
  | 'energyRatingMax'
  | 'worksAccepted'
  | 'condominiumAccepted'
  | 'notes'
  | 'mustHave'
  | 'dealBreakers'
  | 'condominiumMustHave'
  | 'softCriteria'
>;

const isEmpty = (value: unknown): boolean =>
  value == null || value === '' || (Array.isArray(value) && value.length === 0);

const sameValue = (a: unknown, b: unknown): boolean =>
  JSON.stringify(Array.isArray(a) ? [...a].sort() : a) ===
  JSON.stringify(Array.isArray(b) ? [...b].sort() : b);

// La ligne de la fiche à comparer : la langue « fr » par défaut vaut « non renseigné ».
function existingValue(existing: ExistingBuyer, field: NoteField): unknown {
  if (field === 'language') return existing.language === 'fr' ? null : existing.language;
  return existing[field];
}

export type ProposalLine = {
  field: NoteField;
  proposed: NoteValues[NoteField];
  // Sur une fiche existante : la valeur d'avant (null : vide), et la coche par défaut.
  before: unknown;
  changes: boolean;
  checkedByDefault: boolean;
};

export function proposalLines(
  proposal: Pick<NoteProposal, 'values'>,
  existing: ExistingBuyer | null,
): ProposalLine[] {
  return NOTE_FIELDS.flatMap((field): ProposalLine[] => {
    const proposed = proposal.values[field];
    if (proposed === undefined) return [];
    if (!existing)
      return [{ field, proposed, before: null, changes: true, checkedByDefault: true }];
    const before = existingValue(existing, field);
    if (!isEmpty(before) && sameValue(before, proposed)) {
      return [{ field, proposed, before, changes: false, checkedByDefault: false }];
    }
    return [{ field, proposed, before, changes: true, checkedByDefault: isEmpty(before) }];
  });
}

const toForm = (value: unknown): string | string[] => {
  if (Array.isArray(value)) return value.map(String);
  if (value === true) return 'yes';
  if (value === false) return 'no';
  return value == null ? '' : String(value);
};

export type ProposalChoices = {
  // Les champs retenus (cochés) ; en création, tous les champs proposés.
  kept: Set<NoteField>;
  starsKept: boolean;
  softKept: boolean;
  // « Comptant, à vérifier » transformé en « Validé » par le conseiller.
  cashValidated: boolean;
  // Saisis par le conseiller quand la lecture ne les a pas trouvés (obligatoires, M117).
  typedName?: string;
  typedCities?: string;
};

// Le formulaire envoyé : la fiche d'avant, et par-dessus les champs retenus.
export function proposalForm(
  proposal: Omit<NoteProposal, 'communes'>,
  existing: ExistingBuyer | null,
  choices: ProposalChoices,
): { fields: Record<string, string | string[]>; toVerify: string[] } {
  const fields: Record<string, string | string[]> = {};
  if (existing) {
    for (const field of NOTE_FIELDS) {
      const before = existingValue(existing, field);
      if (!isEmpty(before)) fields[NOTE_FORM_FIELDS[field]] = toForm(before);
    }
    fields.must_have = existing.mustHave.map(String);
    if (existing.dealBreakers) fields.deal_breakers = existing.dealBreakers;
    if (existing.condominiumMustHave) fields.condominium_must_have = 'yes';
  }
  const toVerify: string[] = [];
  for (const field of NOTE_FIELDS) {
    const proposed = proposal.values[field];
    if (proposed === undefined || !choices.kept.has(field)) continue;
    fields[NOTE_FORM_FIELDS[field]] = toForm(proposed);
    toVerify.push(NOTE_FORM_FIELDS[field]);
  }
  if (!fields.name && choices.typedName?.trim()) fields.name = choices.typedName.trim();
  if ((!fields.cities || fields.cities.length === 0) && choices.typedCities?.trim()) {
    fields.cities = choices.typedCities.trim();
  }
  if (choices.starsKept && proposal.mustHave.length > 0) {
    const stars = new Set([
      ...((fields.must_have as string[] | undefined) ?? []),
      ...proposal.mustHave.map((star) => star.key),
    ]);
    fields.must_have = [...stars];
    // Un ★ sur un équipement le met à « oui » (M132).
    for (const star of proposal.mustHave) {
      if (['outdoor', 'parking', 'pool', 'elevator'].includes(star.key)) fields[star.key] = 'yes';
    }
    toVerify.push('must_have');
  }
  if (choices.softKept && proposal.softCriteria.length > 0) {
    const merged = new Map((existing?.softCriteria ?? []).map((soft) => [soft.key, soft.words]));
    for (const soft of proposal.softCriteria) merged.set(soft.key, soft.words);
    fields.soft_criteria = JSON.stringify([...merged].map(([key, words]) => ({ key, words })));
    toVerify.push('soft_criteria');
  } else if (existing && existing.softCriteria.length > 0) {
    fields.soft_criteria = JSON.stringify(existing.softCriteria);
  }
  const financing =
    proposal.financing ?? (proposal.cashSuggestion && choices.cashValidated ? 'validated' : null);
  if (financing) {
    fields.financing = financing;
    toVerify.push('financing');
  }
  return { fields, toVerify };
}
