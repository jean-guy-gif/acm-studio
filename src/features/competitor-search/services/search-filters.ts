import type { DpeClass } from '@/features/dpe/services/dpe';
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

// Sous le critère DPE (décision de Laurent, 19/10) : le filtre se fait chez Stream Estate, qui ne
// renvoie pas un bien sans classe publiée. Sans classe cochée, aucun filtre.
export const DPE_FILTER_HINT =
  'Les annonces sans DPE publié ne sont pas proposées avec ce critère.';
export const DPE_NO_FILTER_HINT = 'Aucune classe cochée : aucun filtre sur le DPE.';

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

export type { FilterName } from '@/features/competitor-search/services/filter-labels';
import type { FilterName } from '@/features/competitor-search/services/filter-labels';

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

// Mission 128 B — ce que dit la carte d'un bien gardé dont la donnée manque vit sans zod.
export { UNKNOWN_LABELS } from '@/features/competitor-search/services/filter-labels';

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

export function filtersToInput(filters: SearchFilters): SearchFiltersInput {
  return {
    dpe: filters.dpe ?? [],
    minFloor: filters.minFloor == null ? '' : String(filters.minFloor),
    outdoor: filters.outdoor ?? [],
    minLand: filters.minLand == null ? '' : String(filters.minLand),
    pool: filters.pool,
  };
}

// --- Le tri des biens déjà reçus (mission 111) ------------------------------------------------

// Le résultat payé garde TOUS les biens reçus ; l'écran les trie selon les critères en vigueur, à
// la réception comme à chaque réouverture : un bien qui ne remplit pas un critère connu est écarté
// et compté, un bien dont la donnée manque est gardé et sa carte le dit. Desserrer un critère fait
// revenir ce qui avait été écarté, sans nouvel appel. Les marques d'un tri précédent sont refaites.
export function sortReceived(
  candidates: CompetitorCandidate[],
  filters: SearchFilters | null | undefined,
): { candidates: CompetitorCandidate[]; outsideCriteria: number } {
  const active = filters && !isDefaultFilters(filters) ? filters : null;
  let outsideCriteria = 0;
  const kept: CompetitorCandidate[] = [];
  for (const candidate of candidates) {
    const facts = candidate.streamEstate;
    const clean: CompetitorCandidate = facts
      ? { ...candidate, streamEstate: { ...facts, criteriaUnknown: undefined } }
      : candidate;
    if (clean.streamEstate) delete clean.streamEstate.criteriaUnknown;
    // Seuls les biens Stream Estate sont triés : les critères ne valent que pour lui (M99).
    const verdict = active && facts ? checkFilters(active, clean) : null;
    if (verdict?.kind === 'fails') {
      outsideCriteria += 1;
      continue;
    }
    kept.push(
      verdict?.kind === 'unknown'
        ? { ...clean, streamEstate: { ...clean.streamEstate!, criteriaUnknown: verdict.unknown } }
        : clean,
    );
  }
  return { candidates: kept, outsideCriteria };
}

// --- Ce que change un nouveau réglage (mission 111) -------------------------------------------

// Les critères triés sur les biens déjà reçus : l'étage, l'extérieur, le terrain, la piscine. Le
// DPE, lui, part dans la requête (M110).
export const SORTED_FILTERS: FilterName[] = ['minFloor', 'outdoor', 'minLand', 'pool'];

// Les critères qui partent dans la requête payée : le DPE seul.
export function queryFilters(filters: SearchFilters): SearchFilters {
  return { ...DEFAULT_SEARCH_FILTERS, dpe: filters.dpe };
}

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

// Un critère trié s'est-il desserré ? Alors des biens déjà reçus, écartés, peuvent revenir.
export function sortedFiltersLoosened(before: SearchFilters, after: SearchFilters): boolean {
  const lower = (a: number | null, b: number | null) => a != null && (b == null || b < a);
  const outdoorLooser =
    before.outdoor != null &&
    (after.outdoor == null || after.outdoor.some((space) => !before.outdoor!.includes(space)));
  return (
    lower(before.minFloor, after.minFloor) ||
    lower(before.minLand, after.minLand) ||
    outdoorLooser ||
    (before.pool && !after.pool)
  );
}

export function sortedFiltersChanged(before: SearchFilters, after: SearchFilters): boolean {
  return SORTED_FILTERS.some((name) => !same(before[name], after[name]));
}
