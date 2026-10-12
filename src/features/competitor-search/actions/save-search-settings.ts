'use server';

import {
  readSearchSettingsInput,
  settingsToStore,
  type SearchSettings,
  type SearchSettingsInput,
} from '@/features/competitor-search/services/search-settings';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export type SaveSearchSettingsResult =
  { ok: true; settings: SearchSettings } | { ok: false; error: string };

// MISSION 99 — les réglages de la recherche s'enregistrent sur le dossier. Ce que l'écran envoie
// est relu ici (bornes, paires complètes, liste des rayons) ; tout automatique = rien en base.
// Cadré sur l'agence de l'appelant ; un dossier archivé ne se règle plus.
export async function saveSearchSettings(
  projectId: string,
  input: SearchSettingsInput,
): Promise<SaveSearchSettingsResult> {
  const profile = await getProfile();
  if (!profile) {
    return { ok: false, error: 'Vous devez être connecté.' };
  }
  const read = readSearchSettingsInput(input);
  if (!read.ok) {
    return read;
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('projects')
    .update({ search_settings: settingsToStore(read.settings) })
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .neq('status', 'archived')
    .select('id')
    .maybeSingle();
  if (error || !data) {
    return { ok: false, error: 'Les réglages n’ont pas pu être enregistrés.' };
  }
  return { ok: true, settings: read.settings };
}
