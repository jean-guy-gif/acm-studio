'use server';

import { revalidatePath } from 'next/cache';

import { getProfile } from '@/lib/auth/get-profile';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type SetExpertModeResult = { ok: true; expert: boolean } | { ok: false; error: string };

// MISSION 110 — le mode expert se règle dans « Mon profil », pour le conseiller connecté et lui
// seul. La colonne `profiles.expert_mode` n'est pas modifiable par le navigateur (M88) : seul le
// serveur l'écrit, sur le profil de l'appelant, après avoir relu la valeur envoyée.
export async function setExpertMode(enabled: unknown): Promise<SetExpertModeResult> {
  if (typeof enabled !== 'boolean') {
    return { ok: false, error: 'Valeur non reconnue.' };
  }
  const profile = await getProfile();
  if (!profile || profile.removed_at) {
    return { ok: false, error: 'Vous devez être connecté.' };
  }
  const { data, error } = await createServiceRoleClient()
    .from('profiles')
    .update({ expert_mode: enabled })
    .eq('id', profile.id)
    .eq('agency_id', profile.agency_id)
    .is('removed_at', null)
    .select('expert_mode')
    .maybeSingle();
  if (error || !data) {
    return { ok: false, error: 'Le mode expert n’a pas pu être enregistré.' };
  }
  revalidatePath('/', 'layout');
  return { ok: true, expert: data.expert_mode };
}
