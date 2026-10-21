import { z } from 'zod';

import {
  sortedFiltersChanged,
  DEFAULT_SEARCH_FILTERS,
  describeFilters,
  filtersToInput,
  isDefaultFilters,
  readSearchFiltersInput,
  searchFiltersSchema,
  type SearchFilters,
  type SearchFiltersInput,
} from '@/features/competitor-search/services/search-filters';
import { formatEuro, formatNumber, formatSquareMeters } from '@/lib/format';

// MISSION 99 — LES RÉGLAGES DE LA RECHERCHE (décision de Laurent, 12/10). Un conseiller
// expérimenté règle lui-même sa recherche Stream Estate, comme sur un portail : secteur, prix,
// pièces, surface, et l'élargissement automatique. Partie PURE : la forme des réglages, leur
// validation (tout ce qui vient du navigateur ou de la base est relu ici), et ce que l'écran en dit.
//
// Un critère laissé à `null` est AUTOMATIQUE : la recherche est exactement celle d'avant la
// mission. Un critère RÉGLÉ est fixe : les élargissements ne le touchent plus (un rayon réglé ne
// s'agrandit pas, un prix réglé ne passe pas à ±5 %). Les réglages ne valent que pour Stream
// Estate et son classement : les portails gardent leurs filtres.

export const SEARCH_RADIUS_CHOICES = [1, 2, 5, 10] as const;
export type SearchRadiusKm = (typeof SEARCH_RADIUS_CHOICES)[number];

export type SearchSector = { kind: 'commune' } | { kind: 'radius'; km: SearchRadiusKm };
export type SettingRange = { min: number; max: number };

export type SearchSettings = {
  sector: SearchSector | null; // null : automatique (1 km autour du bien, puis élargi)
  price: SettingRange | null; // null : la fourchette de la fiche
  rooms: SettingRange | null; // null : le nombre de pièces du bien
  surface: SettingRange | null; // null : la surface du bien à ±10 %
  autoWiden: boolean; // false : la première recherche seulement, sans élargissement
  // Mission 110 — DPE, étage, extérieur, terrain, piscine (search-filters.ts) : fixes.
  filters: SearchFilters;
};

export const DEFAULT_SEARCH_SETTINGS: SearchSettings = {
  sector: null,
  price: null,
  rooms: null,
  surface: null,
  autoWiden: true,
  filters: DEFAULT_SEARCH_FILTERS,
};

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

export type SettingName = 'sector' | 'price' | 'rooms' | 'surface' | 'autoWiden' | 'filters';

// « réglé par vous » : le critère n'est plus celui que l'outil utiliserait seul.
export function isSettingCustom(settings: SearchSettings, name: SettingName): boolean {
  if (name === 'autoWiden') return !settings.autoWiden;
  if (name === 'filters') return !isDefaultFilters(settings.filters);
  return settings[name] != null;
}

export function isDefaultSettings(settings: SearchSettings | null | undefined): boolean {
  return (
    settings == null ||
    (settings.sector == null &&
      settings.price == null &&
      settings.rooms == null &&
      settings.surface == null &&
      settings.autoWiden &&
      isDefaultFilters(settings.filters))
  );
}

// Ce qui s'écrit en base : rien du tout quand tout est automatique. Mission 110 — sans critère
// réglé, la clé `filters` n'est pas écrite : la base garde la forme d'avant la mission.
export type StoredSearchSettings = Omit<SearchSettings, 'filters'> & { filters?: SearchFilters };

export function settingsToStore(settings: SearchSettings): StoredSearchSettings | null {
  if (isDefaultSettings(settings)) return null;
  if (!isDefaultFilters(settings.filters)) return settings;
  return {
    sector: settings.sector,
    price: settings.price,
    rooms: settings.rooms,
    surface: settings.surface,
    autoWiden: settings.autoWiden,
  };
}

// --- Ce que l'outil utiliserait seul, et ce qu'il a utilisé ---------------------------------

// Les valeurs de départ de la recherche automatique, calculées côté serveur depuis la fiche
// (stream-estate-tiers.ts) : c'est ce que le bloc « Réglages de la recherche » affiche replié.
export type SearchDefaults = {
  located: boolean; // l'adresse du bien est-elle géocodée sûrement ?
  // Paris, Lyon, Marseille : la « commune » du bien est son arrondissement.
  arrondissement?: boolean;
  price: SettingRange | null; // null : pas de fourchette sur la fiche
  rooms: number | null;
  surface: SettingRange | null;
};

const roomsLabel = (rooms: SettingRange): string =>
  rooms.min === rooms.max
    ? `${rooms.min} pièce${rooms.min > 1 ? 's' : ''}`
    : `${rooms.min} à ${rooms.max} pièces`;

const surfaceLabel = (surface: SettingRange): string =>
  `${formatNumber(surface.min)} à ${formatSquareMeters(surface.max)}`;

const priceLabel = (price: SettingRange): string =>
  `${formatNumber(price.min)} – ${formatEuro(price.max)}`;

export const wholeCommuneLabel = (arrondissement: boolean): string =>
  arrondissement ? 'Tout l’arrondissement' : 'Toute la commune';

export function sectorLabel(
  sector: SearchSector | null,
  located: boolean,
  arrondissement = false,
): string {
  if (sector == null) {
    return located
      ? '1 km autour du bien, puis élargi'
      : `${wholeCommuneLabel(arrondissement)}, puis élargi`;
  }
  return sector.kind === 'commune' ? wholeCommuneLabel(arrondissement) : `Rayon ${sector.km} km`;
}

// Les critères de départ de la recherche, tels que le bilan et le bloc replié les disent :
// « Rayon 2 km · 300 000 – 380 000 € · 3 à 4 pièces · 60 à 80 m² ». Un critère absent (pas de
// fourchette, pas de surface sur la fiche) n'est pas dit.
export function describeSearchCriteria(
  settings: SearchSettings,
  defaults: SearchDefaults,
): string[] {
  const price = settings.price ?? defaults.price;
  const rooms =
    settings.rooms ??
    (defaults.rooms != null ? { min: defaults.rooms, max: defaults.rooms } : null);
  const surface = settings.surface ?? defaults.surface;
  return [
    sectorLabel(settings.sector, defaults.located, defaults.arrondissement ?? false),
    price ? priceLabel(price) : null,
    rooms ? roomsLabel(rooms) : null,
    surface ? surfaceLabel(surface) : null,
    ...describeFilters(settings.filters),
  ].filter((part): part is string => part != null);
}

// --- La saisie de l'écran --------------------------------------------------------------------

// Ce que le formulaire envoie : des textes. Une paire vide = automatique ; une seule borne = erreur
// (comme la fourchette de la fiche, M93).
export type SearchSettingsInput = {
  sector: 'auto' | 'commune' | `${SearchRadiusKm}`;
  priceMin: string;
  priceMax: string;
  roomsMin: string;
  roomsMax: string;
  surfaceMin: string;
  surfaceMax: string;
  autoWiden: boolean;
  // Mission 110 — absents d'un appel d'avant : aucun critère.
  filters?: SearchFiltersInput;
};

export type ReadSettingsResult =
  { ok: true; settings: SearchSettings } | { ok: false; error: string };

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

export function settingsToInput(settings: SearchSettings): SearchSettingsInput {
  const text = (value: number | undefined): string => (value == null ? '' : String(value));
  return {
    sector:
      settings.sector == null
        ? 'auto'
        : settings.sector.kind === 'commune'
          ? 'commune'
          : (String(settings.sector.km) as `${SearchRadiusKm}`),
    priceMin: text(settings.price?.min),
    priceMax: text(settings.price?.max),
    roomsMin: text(settings.rooms?.min),
    roomsMax: text(settings.rooms?.max),
    surfaceMin: text(settings.surface?.min),
    surfaceMax: text(settings.surface?.max),
    autoWiden: settings.autoWiden,
    filters: filtersToInput(settings.filters),
  };
}

// Mission 109 — ce qui vaut pour TOUS les biens d'un conseiller : le secteur et l'élargissement
// automatique. Jamais un prix, des pièces ni une surface : ils sont propres à un bien (une villa
// ne se cherche pas avec les critères d'un appartement).
export function advisorDefaultSettings(settings: SearchSettings): SearchSettings {
  return { ...DEFAULT_SEARCH_SETTINGS, sector: settings.sector, autoWiden: settings.autoWiden };
}

// Mission 110 — une RECHERCHE NOMMÉE (« Villas Vence ») garde le secteur, l'élargissement et les
// critères (DPE, étage, extérieur, terrain, piscine). Jamais un prix, des pièces ni une surface :
// ils sont propres à un bien (leçon de la M109).
export type SavedSearchSettings = Pick<SearchSettings, 'sector' | 'autoWiden' | 'filters'>;

export const savedSearchSettingsSchema = searchSettingsSchema
  .pick({ sector: true, autoWiden: true, filters: true })
  .strict();

export function savedSearchSettings(settings: SearchSettings): SavedSearchSettings {
  return { sector: settings.sector, autoWiden: settings.autoWiden, filters: settings.filters };
}

// Ce que la base garde, relu : illisible = rien (la recherche n'est pas proposée).
export function parseSavedSearchSettings(value: unknown): SavedSearchSettings | null {
  const parsed = savedSearchSettingsSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

// Rappeler une recherche sur un dossier : secteur, élargissement et critères viennent d'elle ; le
// prix, les pièces et la surface réglés sur CE dossier restent les siens.
export function applySavedSearch(
  current: SearchSettings,
  saved: SavedSearchSettings,
): SearchSettings {
  return { ...current, sector: saved.sector, autoWiden: saved.autoWiden, filters: saved.filters };
}

// Mission 111 — ce que change un nouveau réglage, quand un résultat payé est affiché :
//   • 'none'   : rien ;
//   • 'sorted' : seuls l'étage, l'extérieur, le terrain ou la piscine ont changé — les biens déjà
//                reçus sont triés à nouveau, sans aucun appel payant ;
//   • 'paid'   : un critère de la requête a changé (secteur, élargissement, DPE, prix, pièces,
//                surface) — il faut une nouvelle recherche payante, et l'écran prévient d'abord.
export type SettingsChange = 'none' | 'sorted' | 'paid';

export function settingsChangeKind(before: SearchSettings, after: SearchSettings): SettingsChange {
  const queryPart = (settings: SearchSettings) =>
    JSON.stringify([
      settings.sector,
      settings.autoWiden,
      settings.price,
      settings.rooms,
      settings.surface,
      settings.filters.dpe,
    ]);
  if (queryPart(before) !== queryPart(after)) return 'paid';
  return sortedFiltersChanged(before.filters, after.filters) ? 'sorted' : 'none';
}
