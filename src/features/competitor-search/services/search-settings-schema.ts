import { z } from 'zod';

import {
  readSearchFiltersInput,
  searchFiltersSchema,
} from '@/features/competitor-search/services/search-filters-schema';
import { DEFAULT_SEARCH_FILTERS } from '@/features/competitor-search/services/search-filters';
import {
  DEFAULT_SEARCH_SETTINGS,
  type ReadSettingsResult,
  type SavedSearchSettings,
  type SearchRadiusKm,
  type SearchSector,
  type SearchSettings,
  type SearchSettingsInput,
  type SettingRange,
} from '@/features/competitor-search/services/search-settings';

// Mission 128 B — la validation des réglages (M99, M110), seule partie qui a besoin de zod : ce que
// la base garde et ce que le formulaire envoie, relus ici. Le reste (`search-settings.ts`) est pur
// et se lit dans le navigateur sans zod. Pur.

const range = (max: number) =>
  z
    .object({ min: z.number().int().min(1).max(max), max: z.number().int().min(1).max(max) })
    .refine((value) => value.min <= value.max);

const sectorSchema = z.union([
  z.object({ kind: z.literal('commune') }),
  z.object({
    kind: z.literal('radius'),
    km: z.union([z.literal(1), z.literal(2), z.literal(5), z.literal(10)]),
  }),
]);

export const searchSettingsSchema = z.object({
  sector: sectorSchema.nullable(),
  price: range(100_000_000).nullable(),
  rooms: range(30).nullable(),
  surface: range(5_000).nullable(),
  autoWiden: z.boolean(),
  // Des réglages d'avant la mission 110 n'ont pas de critères : aucun.
  filters: searchFiltersSchema.default(DEFAULT_SEARCH_FILTERS),
});

// Ce que la base garde (`projects.search_settings`), relu : illisible ou absent = automatique.
export function parseSearchSettings(value: unknown): SearchSettings {
  const parsed = searchSettingsSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_SEARCH_SETTINGS;
}

const digits = (text: string): string => text.replace(/[\s  €m²]/g, '');

function readPair(
  minText: string,
  maxText: string,
  label: string,
): { ok: true; range: SettingRange | null } | { ok: false; error: string } {
  const min = digits(minText);
  const max = digits(maxText);
  if (min === '' && max === '') return { ok: true, range: null };
  if (min === '' || max === '') {
    return { ok: false, error: `${label} : indiquez les deux valeurs, ou aucune.` };
  }
  if (!/^\d+$/.test(min) || !/^\d+$/.test(max)) {
    return { ok: false, error: `${label} : des nombres entiers.` };
  }
  const value = { min: Number(min), max: Number(max) };
  if (value.min > value.max) {
    return { ok: false, error: `${label} : la première valeur dépasse la seconde.` };
  }
  return { ok: true, range: value };
}

export function readSearchSettingsInput(input: SearchSettingsInput): ReadSettingsResult {
  const price = readPair(input.priceMin, input.priceMax, 'Prix');
  if (!price.ok) return price;
  const rooms = readPair(input.roomsMin, input.roomsMax, 'Pièces');
  if (!rooms.ok) return rooms;
  const surface = readPair(input.surfaceMin, input.surfaceMax, 'Surface');
  if (!surface.ok) return surface;
  const filters = input.filters
    ? readSearchFiltersInput(input.filters)
    : { ok: true as const, filters: DEFAULT_SEARCH_FILTERS };
  if (!filters.ok) return filters;
  const sector: SearchSector | null =
    input.sector === 'auto'
      ? null
      : input.sector === 'commune'
        ? { kind: 'commune' }
        : { kind: 'radius', km: Number(input.sector) as SearchRadiusKm };
  const parsed = searchSettingsSchema.safeParse({
    sector,
    price: price.range,
    rooms: rooms.range,
    surface: surface.range,
    autoWiden: input.autoWiden,
    filters: filters.filters,
  });
  return parsed.success
    ? { ok: true, settings: parsed.data }
    : { ok: false, error: 'Réglages non reconnus : vérifiez les valeurs saisies.' };
}

// Mission 110 — une recherche nommée ne garde ni prix, ni pièces, ni surface (M109).
export const savedSearchSettingsSchema = searchSettingsSchema
  .pick({ sector: true, autoWiden: true, filters: true })
  .strict();

// Ce que la base garde, relu : illisible = rien (la recherche n'est pas proposée).
export function parseSavedSearchSettings(value: unknown): SavedSearchSettings | null {
  const parsed = savedSearchSettingsSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
