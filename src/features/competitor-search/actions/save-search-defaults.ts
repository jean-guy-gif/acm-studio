'use server';

import {
  advisorDefaultSettings,
  settingsToStore,
  type SearchSettings,
  type SearchSettingsInput,
} from '@/features/competitor-search/services/search-settings';
import { readSearchSettingsInput } from '@/features/competitor-search/services/search-settings-schema';
import { getProfile } from '@/lib/auth/get-profile';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type SaveSearchDefaultsResult =
  { ok: true; defaults: SearchSettings } | { ok: false; error: string };

// Mission 109 — seuls le secteur et l'élargissement sont gardés : jamais prix, pièces ni surface.
// Mission 108 — « Garder comme mes réglages par défaut » : les réglages de la recherche (M99),
// gardés pour le conseiller connecté et recopiés dans ses NOUVEAUX dossiers ; les dossiers
// existants ne changent pas. Tout automatique = plus de réglages par défaut. La colonne
// `profiles.search_defaults` n'est pas modifiable par le navigateur (M88) : seul le serveur
// l'écrit, sur le profil de l'appelant, après relecture de tout ce que l'écran envoie.
export async function saveSearchDefaults(
  input: SearchSettingsInput,
): Promise<SaveSearchDefaultsResult> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) {
    return { ok: false, error: 'Vous devez être connecté.' };
  }
  const read = readSearchSettingsInput(input);
  if (!read.ok) {
    return read;
  }
  const { data, error } = await createServiceRoleClient()
    .from('profiles')
    .update({ search_defaults: settingsToStore(advisorDefaultSettings(read.settings)) })
    .eq('id', profile.id)
    .eq('agency_id', profile.agency_id)
    .is('removed_at', null)
    .select('id')
    .maybeSingle();
  if (error || !data) {
    return { ok: false, error: 'Vos réglages par défaut n’ont pas pu être enregistrés.' };
  }
  return { ok: true, defaults: advisorDefaultSettings(read.settings) };
}
