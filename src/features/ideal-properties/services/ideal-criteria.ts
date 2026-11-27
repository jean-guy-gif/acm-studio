import type { BuyerInput } from '@/features/buyers/types';
import {
  DEFAULT_SEARCH_FILTERS,
  OUTDOOR_CHOICES,
  type SearchFilters,
} from '@/features/competitor-search/services/search-filters';
import type { SearchSettings } from '@/features/competitor-search/services/search-settings';
import type { CompetitorSearchCriteria } from '@/features/competitor-search/types';
import { DPE_CLASSES, type DpeClass } from '@/features/dpe/services/dpe';

// Mission 118 — les réglages de la recherche Stream Estate (M99, M110), DÉDUITS de la fiche
// acquéreur : un seul type (la recherche ne connaît qu'appartement ou maison, M54), les communes
// de la fiche, le budget plafond + 5 % (une seule fois : la fiche ne le porte pas, M117), les pièces,
// la surface en minimum, le DPE (la plus mauvaise lettre acceptée et les meilleures), l'étage, un
// extérieur, la piscine. Ce sont des réglages : fixes, aucun élargissement ne les desserre (M99) ;
// « Chercher encore » poursuit la même recherche.
export const BUDGET_MARGIN_PERCENT = 5;
// Les bornes hautes des réglages « au moins » : la base les relit (M99), elles doivent être finies.
export const ROOMS_CEILING = 50;
export const SURFACE_CEILING = 10_000;

export type IdealCriteria = {
  criteria: CompetitorSearchCriteria;
  settings: SearchSettings;
  cities: string[];
  budgetCeiling: number | null;
};

export type IdealCriteriaResult =
  ({ ok: true } & IdealCriteria) | { ok: false; reason: 'no_type' | 'two_types' | 'no_city' };

export const IDEAL_CRITERIA_MESSAGES: Record<'no_type' | 'two_types' | 'no_city', string> = {
  no_type:
    'Indiquez le type de bien recherché (appartement ou maison) sur la fiche\u00a0: la recherche du marché en a besoin.',
  two_types:
    'La recherche du marché ne cherche qu’un type à la fois\u00a0: gardez appartement ou maison sur la fiche.',
  no_city: 'Indiquez au moins une commune sur la fiche.',
};

// Le plafond de la recherche : le budget plafond + 5 %, arrondi à l'euro supérieur.
export function budgetCeiling(budgetMax: number | null): number | null {
  return budgetMax == null ? null : Math.ceil(budgetMax * (1 + BUDGET_MARGIN_PERCENT / 100));
}

// Les classes acceptées : de A à la plus mauvaise lettre acceptée, incluse.
export function acceptedDpeClasses(worst: DpeClass | null): DpeClass[] | null {
  if (worst == null) return null;
  const index = DPE_CLASSES.indexOf(worst);
  return index < 0 ? null : [...DPE_CLASSES.slice(0, index + 1)];
}

export function idealSearchCriteria(buyer: BuyerInput): IdealCriteriaResult {
  if (buyer.cities.length === 0) return { ok: false, reason: 'no_city' };
  if (buyer.propertyTypes.length === 0) return { ok: false, reason: 'no_type' };
  if (buyer.propertyTypes.length > 1) return { ok: false, reason: 'two_types' };
  const ceiling = budgetCeiling(buyer.budgetMax);
  const filters: SearchFilters = {
    ...DEFAULT_SEARCH_FILTERS,
    dpe: acceptedDpeClasses(buyer.energyRatingMax),
    minFloor: buyer.floorMin,
    outdoor: buyer.outdoor === true ? [...OUTDOOR_CHOICES] : null,
    pool: buyer.pool === true,
  };
  const settings: SearchSettings = {
    sector: { kind: 'commune' },
    price: ceiling != null ? { min: 1, max: ceiling } : null,
    rooms:
      buyer.roomsMin != null && buyer.roomsMin > 0
        ? { min: buyer.roomsMin, max: ROOMS_CEILING }
        : null,
    surface:
      buyer.surfaceMin != null && buyer.surfaceMin > 0
        ? { min: Math.floor(buyer.surfaceMin), max: SURFACE_CEILING }
        : null,
    autoWiden: true,
    filters,
  };
  const criteria: CompetitorSearchCriteria = {
    city: buyer.cities[0]!,
    postalCode: null,
    propertyType: buyer.propertyTypes[0]!,
    district: null,
    surfaceArea: buyer.surfaceMin,
    roomsCount: buyer.roomsMin,
    advisorPriceMin: ceiling != null ? 1 : null,
    advisorPriceMax: ceiling,
    energyClass: buyer.energyRatingMax,
    subject: {
      parkingTypes: buyer.parking === true ? ['garage'] : [],
      outdoorSpaces: buyer.outdoor === true ? ['terrace'] : [],
      generalCondition: null,
      floor: buyer.floorMin,
      hasElevator: buyer.elevator,
      hasPool: buyer.pool,
      exposure: null,
      constructionYear: null,
    },
  };
  return { ok: true, criteria, settings, cities: buyer.cities, budgetCeiling: ceiling };
}
