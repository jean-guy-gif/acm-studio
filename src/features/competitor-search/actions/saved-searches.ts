'use server';

import {
  readSavedSearchName,
  SAVED_SEARCH_NAME_MAX,
  toSavedSearches,
  type SavedSearch,
} from '@/features/competitor-search/services/saved-searches';
import {
  applySavedSearch,
  savedSearchSettings,
  settingsToStore,
  type SearchSettings,
  type SearchSettingsInput,
} from '@/features/competitor-search/services/search-settings';
import {
  parseSavedSearchSettings,
  parseSearchSettings,
  readSearchSettingsInput,
} from '@/features/competitor-search/services/search-settings-schema';
import { getProfile } from '@/lib/auth/get-profile';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type SavedSearchesResult =
  { ok: true; searches: SavedSearch[] } | { ok: false; error: string };
export type ApplySavedSearchResult =
  { ok: true; settings: SearchSettings } | { ok: false; error: string };

const NOT_CONNECTED = 'Vous devez être connecté.';

async function activeProfile() {
  const profile = await getProfile();
  return profile && !profile.removed_at ? profile : null;
}

async function ownSearches(ownerId: string, agencyId: string): Promise<SavedSearch[] | null> {
  const { data, error } = await createServiceRoleClient()
    .from('saved_searches')
    .select('id, name, settings')
    .eq('owner_id', ownerId)
    .eq('agency_id', agencyId)
    .order('name');
  return error ? null : toSavedSearches(data ?? []);
}

// MISSION 110 — « Enregistrer cette recherche » sous un nom : le secteur, l'élargissement et les
// critères de ce que l'écran envoie, relus ici. Jamais un prix, des pièces ni une surface (la base
// le refuse aussi). Un nom déjà pris par le conseiller est remplacé : c'est sa recherche, mise à
// jour. Seul le serveur écrit la table, sur le profil de l'appelant.
export async function saveNamedSearch(
  rawName: string,
  input: SearchSettingsInput,
): Promise<SavedSearchesResult> {
  const profile = await activeProfile();
  if (!profile) return { ok: false, error: NOT_CONNECTED };
  const name = readSavedSearchName(rawName);
  if (name == null) {
    return {
      ok: false,
      error: `Donnez un nom à la recherche (${SAVED_SEARCH_NAME_MAX} caractères au plus).`,
    };
  }
  const read = readSearchSettingsInput(input);
  if (!read.ok) return read;
  const settings = savedSearchSettings(read.settings);

  const client = createServiceRoleClient();
  const { data: existing, error: readError } = await client
    .from('saved_searches')
    .select('id, name')
    .eq('owner_id', profile.id)
    .eq('agency_id', profile.agency_id);
  if (readError) return { ok: false, error: 'La recherche n’a pas pu être enregistrée.' };
  const same = (existing ?? []).find((row) => row.name.toLowerCase() === name.toLowerCase());
  const { error } = same
    ? await client
        .from('saved_searches')
        .update({ name, settings, updated_at: new Date().toISOString() })
        .eq('id', same.id)
        .eq('owner_id', profile.id)
    : await client.from('saved_searches').insert({
        agency_id: profile.agency_id,
        owner_id: profile.id,
        name,
        settings,
      });
  if (error) return { ok: false, error: 'La recherche n’a pas pu être enregistrée.' };
  const searches = await ownSearches(profile.id, profile.agency_id);
  return searches
    ? { ok: true, searches }
    : { ok: false, error: 'Vos recherches n’ont pas pu être relues.' };
}

// Rappeler une recherche sur un dossier : secteur, élargissement et critères viennent d'elle ; le
// prix, les pièces et la surface réglés sur ce dossier restent les siens. Le dossier est cadré sur
// l'agence de l'appelant, la recherche sur l'appelant lui-même.
export async function applyNamedSearch(
  projectId: string,
  searchId: string,
): Promise<ApplySavedSearchResult> {
  const profile = await activeProfile();
  if (!profile) return { ok: false, error: NOT_CONNECTED };
  const client = createServiceRoleClient();
  const { data: search } = await client
    .from('saved_searches')
    .select('settings')
    .eq('id', searchId)
    .eq('owner_id', profile.id)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  const saved = parseSavedSearchSettings(search?.settings);
  if (!saved) {
    return { ok: false, error: 'Cette recherche n’a pas pu être appliquée.' };
  }
  const { data: project } = await client
    .from('projects')
    .select('search_settings')
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .neq('status', 'archived')
    .maybeSingle();
  if (!project) {
    return { ok: false, error: 'Cette recherche n’a pas pu être appliquée.' };
  }
  const settings = applySavedSearch(parseSearchSettings(project.search_settings), saved);
  const { data, error } = await client
    .from('projects')
    .update({ search_settings: settingsToStore(settings) })
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .neq('status', 'archived')
    .select('id')
    .maybeSingle();
  if (error || !data) return { ok: false, error: 'Cette recherche n’a pas pu être appliquée.' };
  return { ok: true, settings };
}

export async function deleteNamedSearch(searchId: string): Promise<SavedSearchesResult> {
  const profile = await activeProfile();
  if (!profile) return { ok: false, error: NOT_CONNECTED };
  const { error } = await createServiceRoleClient()
    .from('saved_searches')
    .delete()
    .eq('id', searchId)
    .eq('owner_id', profile.id)
    .eq('agency_id', profile.agency_id);
  if (error) return { ok: false, error: 'La recherche n’a pas pu être retirée.' };
  const searches = await ownSearches(profile.id, profile.agency_id);
  return searches
    ? { ok: true, searches }
    : { ok: false, error: 'Vos recherches n’ont pas pu être relues.' };
}
