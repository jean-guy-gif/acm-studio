import { BUYER_LANGUAGES } from '@/features/buyer-messages/languages';
import { z } from 'zod';

import { BUYER_NAME_MAX, BUYER_TEXT_MAX } from '@/features/buyers/constants';
import { splitCities } from '@/features/buyers/services/buyer-criteria';
import {
  BUYER_CRITERIA,
  BUYER_PROPERTY_TYPES,
  BUYER_PURPOSES,
  BUYER_TIMELINES,
  ENERGY_RATINGS,
  type BuyerInput,
} from '@/features/buyers/types';

// Mission 117 — ce que le formulaire envoie est relu ici, côté serveur, avant toute écriture :
// le nom et au moins une commune sont obligatoires ; le budget idéal ne dépasse pas le plafond ;
// il n'y a pas plus de chambres que de pièces. Tout le reste est facultatif : une case vide reste
// vide, jamais devinée.

export { BUYER_NAME_MAX, BUYER_TEXT_MAX };
export const BUYER_FORM_FIELDS = [
  'name',
  'phone',
  'email',
  'purpose',
  'language',
  'timeline',
  'notes',
  'property_types',
  'cities',
  'budget_ideal',
  'budget_max',
  'rooms_min',
  'bedrooms_min',
  'surface_min',
  'outdoor',
  'parking',
  'pool',
  'floor_min',
  'elevator',
  'energy_rating_max',
  'works_accepted',
  'must_have',
  'deal_breakers',
] as const;
export type BuyerFormField = (typeof BUYER_FORM_FIELDS)[number];

export type BuyerFormErrors = Partial<Record<BuyerFormField, string>>;
export type ParsedBuyerInput =
  { ok: true; input: BuyerInput } | { ok: false; errors: BuyerFormErrors; error: string };

const trimmed = (max: number) =>
  z
    .union([z.string().trim().max(max), z.null(), z.undefined()])
    .transform((value) => (value == null || value === '' ? null : value));

// « 400 000 », « 65,5 » → nombre ; vide → null ; autre chose → erreur.
const frNumber = (field: string, options: { integer?: boolean; min?: number; max?: number }) =>
  z.union([z.string(), z.number(), z.null(), z.undefined()]).transform((value, ctx) => {
    if (value == null) return null;
    if (typeof value === 'string' && value.trim() === '') return null;
    const text = typeof value === 'number' ? String(value) : value;
    const parsed = Number(text.replace(/[\s  ]/g, '').replace(',', '.'));
    if (!Number.isFinite(parsed)) {
      ctx.addIssue({ code: 'custom', message: `${field} : indiquez un nombre.` });
      return z.NEVER;
    }
    if (options.integer && !Number.isInteger(parsed)) {
      ctx.addIssue({ code: 'custom', message: `${field} : indiquez un nombre entier.` });
      return z.NEVER;
    }
    if (options.min != null && parsed < options.min) {
      ctx.addIssue({ code: 'custom', message: `${field} : au moins ${options.min}.` });
      return z.NEVER;
    }
    if (options.max != null && parsed > options.max) {
      ctx.addIssue({ code: 'custom', message: `${field} : au plus ${options.max}.` });
      return z.NEVER;
    }
    return parsed;
  });

// « yes » / « no » / vide → oui / non / non renseigné.
const triState = z
  .union([z.literal('yes'), z.literal('no'), z.literal(''), z.boolean(), z.null(), z.undefined()])
  .transform((value) =>
    value === 'yes' || value === true ? true : value === 'no' || value === false ? false : null,
  );

// Une valeur hors liste n'est ni écrite ni devinée : elle vaut « non renseigné » (liste
// d'autorisation, M51).
const oneOf = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value): T[number] | null =>
      value != null && (values as readonly string[]).includes(value) ? (value as T[number]) : null,
    );

const listOf = <T extends readonly [string, ...string[]]>(values: T) =>
  z.union([z.array(z.string()), z.null(), z.undefined()]).transform((list) => {
    const kept = [...new Set(list ?? [])].filter((value): value is T[number] =>
      (values as readonly string[]).includes(value),
    );
    return kept as T[number][];
  });

const schema = z
  .object({
    name: z
      .string({ error: 'Indiquez le nom de l’acquéreur.' })
      .trim()
      .min(1, 'Indiquez le nom de l’acquéreur.')
      .max(BUYER_NAME_MAX, `Le nom tient en ${BUYER_NAME_MAX} caractères au plus.`),
    phone: trimmed(40),
    email: trimmed(120).refine(
      (value) => value == null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      'Indiquez une adresse e-mail valable.',
    ),
    purpose: oneOf(BUYER_PURPOSES),
    // Mission 139 — une langue de la liste ; vide : celle de la fiche ne change pas.
    language: oneOf(BUYER_LANGUAGES),
    timeline: oneOf(BUYER_TIMELINES),
    notes: trimmed(BUYER_TEXT_MAX),
    property_types: listOf(BUYER_PROPERTY_TYPES),
    cities: z
      .union([z.string(), z.array(z.string()), z.null(), z.undefined()])
      .transform((value) => splitCities(Array.isArray(value) ? value.join(', ') : (value ?? '')))
      .refine((cities) => cities.length >= 1, 'Indiquez au moins une commune.'),
    budget_ideal: frNumber('Budget idéal', { integer: true, min: 0 }),
    budget_max: frNumber('Budget plafond', { integer: true, min: 0 }),
    rooms_min: frNumber('Pièces', { integer: true, min: 0, max: 50 }),
    bedrooms_min: frNumber('Chambres', { integer: true, min: 0, max: 50 }),
    surface_min: frNumber('Surface', { min: 0 }),
    outdoor: triState,
    parking: triState,
    pool: triState,
    floor_min: frNumber('Étage', { integer: true, min: 0, max: 60 }),
    elevator: triState,
    energy_rating_max: oneOf(ENERGY_RATINGS),
    works_accepted: triState,
    must_have: listOf(BUYER_CRITERIA),
    deal_breakers: trimmed(BUYER_TEXT_MAX),
  })
  .superRefine((value, ctx) => {
    if (
      value.budget_ideal != null &&
      value.budget_max != null &&
      value.budget_ideal > value.budget_max
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['budget_max'],
        message: 'Le budget plafond est au moins le budget idéal.',
      });
    }
    if (
      value.rooms_min != null &&
      value.bedrooms_min != null &&
      value.bedrooms_min > value.rooms_min
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['bedrooms_min'],
        message: 'Pas plus de chambres que de pièces.',
      });
    }
  });

export type BuyerFormValues = z.input<typeof schema>;

export const BUYER_FORM_ERROR = 'Vérifiez la fiche : un champ est à corriger.';

export function parseBuyerInput(raw: unknown): ParsedBuyerInput {
  // Une clé absente vaut « non renseigné » : chaque champ est posé à null avant la relecture.
  const given = typeof raw === 'object' && raw != null ? (raw as Record<string, unknown>) : {};
  const complete = Object.fromEntries(
    BUYER_FORM_FIELDS.map((field) => [field, given[field] ?? null]),
  );
  const result = schema.safeParse(complete);
  if (!result.success) {
    const errors: BuyerFormErrors = {};
    for (const issue of result.error.issues) {
      const field = String(issue.path[0] ?? '');
      if (
        (BUYER_FORM_FIELDS as readonly string[]).includes(field) &&
        !errors[field as BuyerFormField]
      ) {
        errors[field as BuyerFormField] = issue.message;
      }
    }
    return { ok: false, errors, error: BUYER_FORM_ERROR };
  }
  const v = result.data;
  return {
    ok: true,
    input: {
      name: v.name,
      phone: v.phone,
      email: v.email,
      purpose: v.purpose,
      ...(v.language ? { language: v.language } : {}),
      timeline: v.timeline,
      notes: v.notes,
      propertyTypes: v.property_types,
      cities: v.cities,
      budgetIdeal: v.budget_ideal,
      budgetMax: v.budget_max,
      roomsMin: v.rooms_min,
      bedroomsMin: v.bedrooms_min,
      surfaceMin: v.surface_min,
      outdoor: v.outdoor,
      parking: v.parking,
      pool: v.pool,
      floorMin: v.floor_min,
      elevator: v.elevator,
      energyRatingMax: v.energy_rating_max,
      worksAccepted: v.works_accepted,
      mustHave: v.must_have,
      dealBreakers: v.deal_breakers,
    },
  };
}

// Le formulaire → un objet brut, que `parseBuyerInput` relit. Les listes viennent des cases
// cochées (`property_types`, `must_have`), le reste de champs texte.
export function readBuyerFormData(formData: FormData): Record<string, unknown> {
  const text = (name: string): string | null => {
    const value = formData.get(name);
    return typeof value === 'string' ? value : null;
  };
  const list = (name: string): string[] =>
    formData.getAll(name).filter((value): value is string => typeof value === 'string');
  return {
    name: text('name') ?? '',
    phone: text('phone'),
    email: text('email'),
    purpose: text('purpose'),
    language: text('language'),
    timeline: text('timeline'),
    notes: text('notes'),
    property_types: list('property_types'),
    cities: text('cities') ?? '',
    budget_ideal: text('budget_ideal'),
    budget_max: text('budget_max'),
    rooms_min: text('rooms_min'),
    bedrooms_min: text('bedrooms_min'),
    surface_min: text('surface_min'),
    outdoor: text('outdoor') ?? '',
    parking: text('parking') ?? '',
    pool: text('pool') ?? '',
    floor_min: text('floor_min'),
    elevator: text('elevator') ?? '',
    energy_rating_max: text('energy_rating_max'),
    works_accepted: text('works_accepted') ?? '',
    must_have: list('must_have'),
    deal_breakers: text('deal_breakers'),
  };
}

// Mission 132 — la saisie rapide (« La fiche en 30 secondes ») : nom, téléphone, type, secteur,
// budget plafond, et deux ★ au plus parmi le secteur, le budget et quatre équipements ; une ★ sur
// un équipement le met à « oui ». Le reste se complète plus tard (« Compléter sa recherche »),
// par le formulaire complet. Relue par le même schéma que la fiche, plus ces deux règles.
export const QUICK_STAR_CRITERIA = [
  'cities',
  'budget',
  'outdoor',
  'parking',
  'pool',
  'elevator',
] as const satisfies readonly (typeof BUYER_CRITERIA)[number][];
export const QUICK_STARS_MAX = 2;
export const QUICK_STARS_ERROR = `Deux indispensables au plus : le reste se complète ensuite.`;

export function parseQuickBuyerInput(raw: unknown): ParsedBuyerInput {
  const parsed = parseBuyerInput(raw);
  if (!parsed.ok) return parsed;
  const stars = parsed.input.mustHave;
  if (
    stars.length > QUICK_STARS_MAX ||
    stars.some((star) => !(QUICK_STAR_CRITERIA as readonly string[]).includes(star))
  ) {
    return { ok: false, errors: { must_have: QUICK_STARS_ERROR }, error: BUYER_FORM_ERROR };
  }
  // Une ★ sur le budget sans montant ne dirait rien : le budget est demandé.
  if (stars.includes('budget') && parsed.input.budgetMax == null) {
    return {
      ok: false,
      errors: { budget_max: 'Indiquez le budget maximum pour le rendre indispensable.' },
      error: BUYER_FORM_ERROR,
    };
  }
  const starred = (criterion: (typeof QUICK_STAR_CRITERIA)[number]) =>
    stars.includes(criterion) ? true : null;
  return {
    ok: true,
    input: {
      ...parsed.input,
      outdoor: starred('outdoor'),
      parking: starred('parking'),
      pool: starred('pool'),
      elevator: starred('elevator'),
    },
  };
}
