'use server';

import { revalidatePath } from 'next/cache';

import { isWorkspaceMode, type WorkspaceMode } from '@/features/workspace-mode/types';
import { getProfile } from '@/lib/auth/get-profile';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type SetWorkspaceModeResult =
  { ok: true; mode: WorkspaceMode } | { ok: false; error: string };

// Mission 118 — l'interrupteur écrit le mode du conseiller connecté, et de lui seul. La colonne
// n'est pas modifiable par le navigateur (M88) : seul le serveur l'écrit, après relecture.
export async function setWorkspaceMode(mode: unknown): Promise<SetWorkspaceModeResult> {
  if (!isWorkspaceMode(mode)) {
    return { ok: false, error: 'Mode non reconnu.' };
  }
  const profile = await getProfile();
  if (!profile || profile.removed_at) {
    return { ok: false, error: 'Vous devez être connecté.' };
  }
  const { data, error } = await createServiceRoleClient()
    .from('profiles')
    .update({ workspace_mode: mode })
    .eq('id', profile.id)
    .eq('agency_id', profile.agency_id)
    .is('removed_at', null)
    .select('workspace_mode')
    .maybeSingle();
  if (error || !data || !isWorkspaceMode(data.workspace_mode)) {
    return { ok: false, error: 'Le mode n’a pas pu être enregistré.' };
  }
  revalidatePath('/', 'layout');
  return { ok: true, mode: data.workspace_mode };
}
