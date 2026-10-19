'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { canChangeLiveRhythm } from '@/features/live-seller/services/live-timing';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export type SaveLiveShortlistResult = { ok: true } | { ok: false; error: string };

const LOCKED = 'Le Live a commencé : les concurrents montrés ne se modifient plus.';
const FAILURE = 'Le choix n’a pas pu être enregistré. Réessayez.';

// Mission 110 — les concurrents montrés pendant le Live, au-delà de 6. `shown` : les identifiants
// gardés, relus ici parmi les concurrents RETENUS du dossier ; les autres retenus sont marqués
// « hors Live » et restent retenus. Garder tout le monde est un choix aussi. Au moins un concurrent
// reste montré. Refusé une fois le Live commencé (comme le rythme, M95).
export async function saveLiveShortlist(
  projectId: string,
  shown: unknown,
): Promise<SaveLiveShortlistResult> {
  const profile = await getProfile();
  if (!profile || profile.removed_at || !z.uuid().safeParse(projectId).success) {
    return { ok: false, error: FAILURE };
  }
  const ids = z.array(z.uuid()).max(200).safeParse(shown);
  if (!ids.success) {
    return { ok: false, error: FAILURE };
  }
  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('id, live_started_at')
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .in('status', ['draft', 'ready_for_meeting'])
    .maybeSingle();
  if (!project) {
    return { ok: false, error: FAILURE };
  }
  const [{ count: responses }, { count: summaries }, { data: retained }] = await Promise.all([
    supabase
      .from('live_seller_responses')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('agency_id', profile.agency_id),
    supabase
      .from('live_seller_summary')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('agency_id', profile.agency_id),
    supabase
      .from('comparables')
      .select('id')
      .eq('project_id', projectId)
      .eq('agency_id', profile.agency_id)
      .eq('is_selected', true),
  ]);
  if (
    !canChangeLiveRhythm({
      liveStartedAt: project.live_started_at,
      hasSellerAnswers: (responses ?? 0) + (summaries ?? 0) > 0,
    })
  ) {
    return { ok: false, error: LOCKED };
  }
  const retainedIds = (retained ?? []).map((row) => row.id);
  const kept = new Set(ids.data.filter((id) => retainedIds.includes(id)));
  if (kept.size === 0) {
    return { ok: false, error: 'Gardez au moins un concurrent pour le Live.' };
  }
  const hidden = retainedIds.filter((id) => !kept.has(id));
  const writes = [
    supabase
      .from('comparables')
      .update({ excluded_from_live: false })
      .eq('project_id', projectId)
      .eq('agency_id', profile.agency_id)
      .in('id', [...kept]),
    ...(hidden.length > 0
      ? [
          supabase
            .from('comparables')
            .update({ excluded_from_live: true })
            .eq('project_id', projectId)
            .eq('agency_id', profile.agency_id)
            .in('id', hidden),
        ]
      : []),
    supabase
      .from('projects')
      .update({ live_shortlist_at: new Date().toISOString() })
      .eq('id', projectId)
      .eq('agency_id', profile.agency_id),
  ];
  const results = await Promise.all(writes);
  if (results.some((result) => result.error)) {
    return { ok: false, error: FAILURE };
  }
  revalidatePath(`/builder/${projectId}/lancer-le-live`);
  revalidatePath(`/builder/${projectId}/avant-rendez-vous`);
  revalidatePath('/live');
  return { ok: true };
}
