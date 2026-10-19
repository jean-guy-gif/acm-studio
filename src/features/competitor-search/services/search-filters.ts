import { z } from 'zod';

import { DPE_CLASSES, type DpeClass } from '@/features/dpe/services/dpe';
import type { CompetitorCandidate } from '@/features/competitor-search/types';
import { formatSquareMeters } from '@/lib/format';

// MISSION 110 (partie C) — DES CRITÈRES DE PLUS, pour les experts : DPE, étage minimum, extérieur,
// terrain minimum, piscine. Partie PURE : leur forme, leur validation, ce que l'écran en dit, et
// le tri des biens reçus.
//
// Ce que Stream Estate sait filtrer (documentation publique du 19/10 — schéma des filtres de son
// serveur MCP officiel — puis 5 appels d'une annonce, appartements à Nice, maisons à Vence) :
//   • DPE : `energyCategories[]`, plusieurs classes s'additionnent (7 049 biens ; D seul : 1 776 ;
//     A et B : 1 228). Un bien sans classe publiée n'est donc pas renvoyé : il n'est pas facturé.
//   • Étage minimum : aucun filtre (`floorsMin` est sans effet : 7 049 → 7 049).
//   • Extérieur, terrain minimum, piscine : aucun filtre.
// Ces quatre-là se trient APRÈS COUP, sur la réponse déjà payée, sans repayer : un bien qui ne
// remplit pas le critère est écarté et compté ; un bien dont la donnée n'est pas indiquée est gardé,
// après les autres, et sa carte le dit (décision de Laurent, 19/10).
//
// Ces critères sont fixes : aucun élargissement ne les desserre (M99). Ils ne valent que pour
// Stream Estate, comme les autres réglages.

export const OUTDOOR_CHOICES = ['balcony', 'terrace', 'garden'] as const;
export type OutdoorChoice = (typeof OUTDOOR_CHOICES)[number];

export const OUTDOOR_CHOICE_LABELS: Record<OutdoorChoice, string> = {
  balcony: 'Balcon',
  terrace: 'Terrasse',
  garden: 'Jardin',
};

export type SearchFilters = {
  dpe: DpeClass[] | null; // null : toutes les classes, et les biens sans DPE
  minFloor: number | null; // 0 = rez-de-chaussée
  outdoor: OutdoorChoice[] | null; // au moins l'un d'eux
  minLand: number | null; // m²
  pool: boolean; // true : piscine exigée
};

export const DEFAULT_SEARCH_FILTERS: SearchFilters = {
  dpe: null,
  minFloor: null,
  outdoor: null,
  minLand: null,
  pool: false,
};

const nonEmptyUnique = <T extends string>(values: readonly [T, ...T[]]) =>
  z
    .array(z.enum(values))
    .min(1)
    .refine((list) => new Set(list).size === list.length);

export const searchFiltersSchema = z.object({
  dpe: nonEmptyUnique(DPE_CLASSES).nullable(),
  minFloor: z.number().int().min(0).max(60).nullable(),
  outdoor: nonEmptyUnique(OUTDOOR_CHOICES).nullable(),
  minLand: z.number().int().min(1).max(1_000_000).nullable(),
  pool: z.boolean(),
});

export function isDefaultFilters(filters: SearchFilters | null | undefined): boolean {
  return (
    filters == null ||
    (filters.dpe == null &&
      filters.minFloor == null &&
      filters.outdoor == null &&
      filters.minLand == null &&
      !filters.pool)
  );
}

export type FilterName = 'dpe' | 'minFloor' | 'outdoor' | 'minLand' | 'pool';

// --- Ce que l'écran et le bilan en disent ---------------------------------------------------

const floorLabel = (floor: number): string =>
  floor === 0
    ? 'Rez-de-chaussée ou plus'
    : floor === 1
      ? '1er étage ou plus'
      : `${floor}e étage ou plus`;

const orList = (labels: string[]): string =>
  labels.length <= 1
    ? (labels[0] ?? '')
    : `${labels.slice(0, -1).join(', ')} ou ${labels.at(-1)!.toLowerCase()}`;

export function describeFilters(filters: SearchFilters): string[] {
  return [
    filters.dpe ? `DPE ${filters.dpe.join(', ')}` : null,
    filters.minFloor != null ? floorLabel(filters.minFloor) : null,
    filters.outdoor ? orList(filters.outdoor.map((space) => OUTDOOR_CHOICE_LABELS[space])) : null,
    filters.minLand != null ? `Terrain de ${formatSquareMeters(filters.minLand)} ou plus` : null,
    filters.pool ? 'Piscine' : null,
  ].filter((part): part is string => part != null);
}

// Ce que dit la carte d'un bien gardé dont la donnée manque.
export const UNKNOWN_LABELS: Record<FilterName, string> = {
  dpe: 'DPE non indiqué',
  minFloor: 'Étage non indiqué',
  outdoor: 'Extérieur non indiqué',
  minLand: 'Terrain non indiqué',
  pool: 'Piscine non indiquée',
};

// --- Le tri des biens reçus -----------------------------------------------------------------

export type FilterVerdict =
  | { kind: 'meets' }
  | { kind: 'fails'; failing: FilterName[] }
  | { kind: 'unknown'; unknown: FilterName[] };

// Une donnée connue qui ne remplit pas le critère écarte ; une donnée absente garde le bien, marqué.
export function checkFilters(
  filters: SearchFilters,
  candidate: CompetitorCandidate,
): FilterVerdict {
  const failing: FilterName[] = [];
  const unknown: FilterName[] = [];
  const judge = (name: FilterName, value: boolean | null) => {
    if (value === false) failing.push(name);
    else if (value == null) unknown.push(name);
  };

  if (filters.dpe) {
    const energy = candidate.energyClass ?? null;
    judge('dpe', energy == null ? null : filters.dpe.includes(energy));
  }
  if (filters.minFloor != null) {
    const floor = candidate.features?.floor ?? null;
    judge('minFloor', floor == null ? null : floor >= filters.minFloor);
  }
  if (filters.outdoor) {
    const wanted = filters.outdoor;
    const outdoor = candidate.features?.outdoor ?? null;
    const present = outdoor?.present ?? [];
    const absent = outdoor?.absent ?? [];
    judge(
      'outdoor',
      wanted.some((space) => present.includes(space))
        ? true
        : wanted.every((space) => absent.includes(space))
          ? false
          : null,
    );
  }
  if (filters.minLand != null) {
    const land = candidate.landArea;
    judge('minLand', land == null ? null : land >= filters.minLand);
  }
  if (filters.pool) {
    judge('pool', candidate.features?.hasPool ?? null);
  }

  if (failing.length > 0) return { kind: 'fails', failing };
  if (unknown.length > 0) return { kind: 'unknown', unknown };
  return { kind: 'meets' };
}

// La requête : seul le DPE se filtre chez Stream Estate.
export function appendFilterParams(params: URLSearchParams, filters: SearchFilters | null): void {
  for (const energy of filters?.dpe ?? []) params.append('energyCategories[]', energy);
}

// --- La saisie de l'écran --------------------------------------------------------------------

export type SearchFiltersInput = {
  dpe: string[];
  minFloor: string;
  outdoor: string[];
  minLand: string;
  pool: boolean;
};

export type ReadFiltersResult = { ok: true; filters: SearchFilters } | { ok: false; error: string };

const digits = (text: string): string => text.replace(/[\s  m²]/g, '');

function readWhole(text: string, label: string, min: number): number | null | { error: string } {
  const value = digits(text);
  if (value === '') return null;
  if (!/^\d+$/.test(value) || Number(value) < min) {
    return { error: `${label} : un nombre entier${min > 0 ? ` d'au moins ${min}` : ''}.` };
  }
  return Number(value);
}

export function readSearchFiltersInput(input: SearchFiltersInput): ReadFiltersResult {
  const minFloor = readWhole(input.minFloor, 'Étage minimum', 0);
  if (typeof minFloor === 'object' && minFloor != null) return { ok: false, error: minFloor.error };
  const minLand = readWhole(input.minLand, 'Terrain minimum', 1);
  if (typeof minLand === 'object' && minLand != null) return { ok: false, error: minLand.error };
  const parsed = searchFiltersSchema.safeParse({
    dpe: input.dpe.length > 0 ? DPE_CLASSES.filter((value) => input.dpe.includes(value)) : null,
    minFloor,
    outdoor:
      input.outdoor.length > 0
        ? OUTDOOR_CHOICES.filter((value) => input.outdoor.includes(value))
        : null,
    minLand,
    pool: input.pool,
  });
  return parsed.success
    ? { ok: true, filters: parsed.data }
    : { ok: false, error: 'Critères non reconnus : vérifiez les valeurs saisies.' };
}

export function filtersToInput(filters: SearchFilters): SearchFiltersInput {
  return {
    dpe: filters.dpe ?? [],
    minFloor: filters.minFloor == null ? '' : String(filters.minFloor),
    outdoor: filters.outdoor ?? [],
    minLand: filters.minLand == null ? '' : String(filters.minLand),
    pool: filters.pool,
  };
}
