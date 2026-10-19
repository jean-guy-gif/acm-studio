'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { LIVE_ORDER_FROZEN } from '@/features/live-seller/services/live-timing';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export type ReorderLiveCompetitorsResult = { ok: true } | { ok: false; error: string };

const FAILURE = 'Le nouvel ordre n’a pas pu être enregistré. Réessayez.';

// MISSION 110 — l'ordre des concurrents au Live, choisi par glisser-déposer en mode expert. La liste
// envoyée doit être exactement celle des concurrents retenus du dossier ; la base les réordonne
// d'un coup (`reorder_retained_comparables`, droits de l'appelant) et refuse une fois le Live
// commencé : la reprise compte sur cet ordre (M89, M92).
export async function reorderLiveCompetitors(
  projectId: string,
  orderedIds: unknown,
): Promise<ReorderLiveCompetitorsResult> {
  const profile = await getProfile();
  if (!profile || profile.removed_at || !z.uuid().safeParse(projectId).success) {
    return { ok: false, error: FAILURE };
  }
  const ids = z.array(z.uuid()).min(1).max(200).safeParse(orderedIds);
  if (!ids.success || new Set(ids.data).size !== ids.data.length) {
    return { ok: false, error: FAILURE };
  }
  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .in('status', ['draft', 'ready_for_meeting'])
    .maybeSingle();
  if (!project) {
    return { ok: false, error: FAILURE };
  }
  const { error } = await supabase.rpc('reorder_retained_comparables', {
    p_project_id: projectId,
    p_ids: ids.data,
  });
  if (error) {
    return {
      ok: false,
      error: error.message.includes('live_started') ? LIVE_ORDER_FROZEN : FAILURE,
    };
  }
  revalidatePath(`/builder/${projectId}`, 'layout');
  return { ok: true };
}
