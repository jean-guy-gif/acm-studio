'use server';

import { revalidatePath } from 'next/cache';

import {
  DECISION_LOCKED_MESSAGE,
  isDecisionLocked,
} from '@/features/price-positioning/services/decision-lock';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type DeletePositioningResult = { ok: true } | { ok: false; error: string };

// Authenticates and authorises with the USER client (agency + project ownership),
// then deletes via the server-only service-role client. No public delete RPC and
// no direct client write. No-op (clean success) when nothing exists.
export async function deletePricePositioning(projectId: string): Promise<DeletePositioningResult> {
  const profile = await getProfile();
  if (!profile) {
    return { ok: false, error: 'Vous devez être connecté.' };
  }

  const userClient = await createClient();
  const { data: project } = await userClient
    .from('projects')
    .select('id, status')
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (!project) {
    return { ok: false, error: 'Projet introuvable pour votre agence.' };
  }
  // Mission 111 — conclu ou archivé : la décision de prix ne se modifie plus.
  if (isDecisionLocked(project.status)) {
    return { ok: false, error: DECISION_LOCKED_MESSAGE };
  }

  const serviceClient = createServiceRoleClient();
  const { error } = await serviceClient
    .from('project_price_positionings')
    .delete()
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id);
  if (error) {
    return { ok: false, error: 'La suppression a échoué. Réessayez.' };
  }

  revalidatePath(`/builder/${projectId}/avant-rendez-vous`);
  return { ok: true };
}
