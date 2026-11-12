import { buyerLanguage } from '@/features/buyer-messages/languages';
import {
  BUYER_CRITERIA,
  BUYER_FINANCINGS,
  BUYER_PROPERTY_TYPES,
  BUYER_PURPOSES,
  BUYER_STATUSES,
  BUYER_TIMELINES,
  BUYER_SOFT_CRITERIA,
  BUYER_SOFT_WORDS_MAX,
  ENERGY_RATINGS,
  type Buyer,
  type BuyerSoftCriterion,
  type BuyerCriterion,
  type BuyerInput,
  type BuyerPropertyType,
  type BuyerRow,
} from '@/features/buyers/types';

const oneOf = <T extends string>(list: readonly T[], value: string | null): T | null =>
  value != null && (list as readonly string[]).includes(value) ? (value as T) : null;

const allOf = <T extends string>(list: readonly T[], values: string[] | null): T[] =>
  (values ?? []).filter((value): value is T => (list as readonly string[]).includes(value));

const number = (value: number | string | null): number | null => {
  if (value == null) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

// Mission 151 — « Ce qui compte pour eux », relu par liste d'autorisation à l'écriture comme à la
// lecture : une clé hors liste ou en double est absente, les mots sont bornés.
export function sanitizeSoftCriteria(raw: unknown): BuyerSoftCriterion[] {
  if (!Array.isArray(raw)) return [];
  const kept: BuyerSoftCriterion[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item == null) continue;
    const { key, words } = item as { key?: unknown; words?: unknown };
    if (typeof key !== 'string' || !(BUYER_SOFT_CRITERIA as readonly string[]).includes(key))
      continue;
    if (kept.some((criterion) => criterion.key === key)) continue;
    const text = typeof words === 'string' ? words.trim().slice(0, BUYER_SOFT_WORDS_MAX) : '';
    kept.push({ key: key as BuyerSoftCriterion['key'], words: text });
  }
  return kept.slice(0, BUYER_SOFT_CRITERIA.length);
}

// La ligne de la base, relue par liste d'autorisation : une valeur hors liste est absente.
export function toBuyer(row: BuyerRow): Buyer {
  return {
    id: row.id,
    agencyId: row.agency_id,
    advisorId: row.advisor_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
    status: oneOf(BUYER_STATUSES, row.status) ?? 'searching',
    statusChangedAt: row.status_changed_at,
    demo: row.demo,
    ignoredSuggestions: row.ignored_suggestions ?? [],
    financing: oneOf(BUYER_FINANCINGS, row.financing) ?? 'unknown',
    financingChangedAt: row.financing_changed_at,
    contactedAt: row.contacted_at,
    language: buyerLanguage(row.language),
    name: row.name,
    phone: row.phone,
    email: row.email,
    purpose: oneOf(BUYER_PURPOSES, row.purpose),
    timeline: oneOf(BUYER_TIMELINES, row.timeline),
    notes: row.notes,
    propertyTypes: allOf<BuyerPropertyType>(BUYER_PROPERTY_TYPES, row.property_types),
    cities: row.cities,
    budgetIdeal: row.budget_ideal,
    budgetMax: row.budget_max,
    roomsMin: row.rooms_min,
    bedroomsMin: row.bedrooms_min,
    surfaceMin: number(row.surface_min),
    outdoor: row.outdoor,
    parking: row.parking,
    pool: row.pool,
    floorMin: row.floor_min,
    elevator: row.elevator,
    energyRatingMax: oneOf(ENERGY_RATINGS, row.energy_rating_max),
    worksAccepted: row.works_accepted,
    mustHave: allOf<BuyerCriterion>(BUYER_CRITERIA, row.must_have),
    dealBreakers: row.deal_breakers,
    condominiumAccepted: row.condominium_accepted ?? null,
    condominiumMustHave: row.condominium_must_have ?? false,
    softCriteria: sanitizeSoftCriteria(row.soft_criteria),
    fieldsToVerify: row.fields_to_verify ?? [],
  };
}

// Les colonnes qu'une fiche écrit — jamais l'agence, le conseiller, le statut ni la marque de démo.
export function buyerColumns(input: BuyerInput) {
  return {
    // Mission 139 — la langue, seulement quand le formulaire la donne.
    ...(input.language ? { language: input.language } : {}),
    name: input.name,
    phone: input.phone,
    email: input.email,
    purpose: input.purpose,
    timeline: input.timeline,
    notes: input.notes,
    property_types: input.propertyTypes,
    cities: input.cities,
    budget_ideal: input.budgetIdeal,
    budget_max: input.budgetMax,
    rooms_min: input.roomsMin,
    bedrooms_min: input.bedroomsMin,
    surface_min: input.surfaceMin,
    outdoor: input.outdoor,
    parking: input.parking,
    pool: input.pool,
    floor_min: input.floorMin,
    elevator: input.elevator,
    energy_rating_max: input.energyRatingMax,
    works_accepted: input.worksAccepted,
    must_have: input.mustHave,
    deal_breakers: input.dealBreakers,
    // Mission 151 — seulement quand la saisie les donne.
    ...(input.condominiumAccepted !== undefined
      ? { condominium_accepted: input.condominiumAccepted }
      : {}),
    ...(input.condominiumMustHave !== undefined
      ? { condominium_must_have: input.condominiumMustHave }
      : {}),
    ...(input.softCriteria !== undefined
      ? { soft_criteria: sanitizeSoftCriteria(input.softCriteria) }
      : {}),
  };
}
