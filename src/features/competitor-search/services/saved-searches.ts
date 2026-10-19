import {
  describeSearchCriteria,
  DEFAULT_SEARCH_SETTINGS,
  parseSavedSearchSettings,
  type SavedSearchSettings,
} from '@/features/competitor-search/services/search-settings';

// Mission 110 — une recherche nommée, telle que l'écran la propose : son nom et ce qu'elle règle
// (« Rayon 2 km · DPE A, B, C · Piscine · sans élargissement »). Jamais un prix, des pièces ni une
// surface : ils n'y sont pas.
export type SavedSearch = {
  id: string;
  name: string;
  settings: SavedSearchSettings;
  summary: string;
};

export const SAVED_SEARCH_NAME_MAX = 60;

export function readSavedSearchName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const name = raw.replace(/\s+/g, ' ').trim();
  return name.length >= 1 && name.length <= SAVED_SEARCH_NAME_MAX ? name : null;
}

export function describeSavedSearch(settings: SavedSearchSettings): string {
  return [
    ...describeSearchCriteria(
      { ...DEFAULT_SEARCH_SETTINGS, ...settings },
      // Le secteur automatique se dit sans le bien : « 1 km autour du bien, puis élargi ».
      { located: true, price: null, rooms: null, surface: null },
    ),
    settings.autoWiden ? null : 'sans élargissement',
  ]
    .filter((part): part is string => part != null)
    .join(' · ');
}

// Les lignes lues en base : une ligne illisible n'est pas proposée.
export function toSavedSearches(
  rows: { id: string; name: string; settings: unknown }[],
): SavedSearch[] {
  return rows.flatMap((row) => {
    const settings = parseSavedSearchSettings(row.settings);
    return settings
      ? [{ id: row.id, name: row.name, settings, summary: describeSavedSearch(settings) }]
      : [];
  });
}
