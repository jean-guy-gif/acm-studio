'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export type SaveLiveShortlistResult = { ok: true } | { ok: false; error: string };

const LOCKED = 'Le Live a commencé\u00a0: les concurrents montrés ne se modifient plus.';
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
    .select('id')
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .in('status', ['draft', 'ready_for_meeting'])
    .maybeSingle();
  if (!project) {
    return { ok: false, error: FAILURE };
  }
  // Mission 112 — une seule opération en base (`save_live_shortlist`) : elle relit les concurrents
  // retenus, en garde au moins un, date le choix, et refuse une fois le Live commencé — la base
  // fige ensuite les concurrents montrés, comme l'ordre et le rythme.
  const { error } = await supabase.rpc('save_live_shortlist', {
    p_project_id: projectId,
    p_shown: [...new Set(ids.data)],
  });
  if (error) {
    return {
      ok: false,
      error: error.message.includes('live_started')
        ? LOCKED
        : error.message.includes('empty_shortlist')
          ? 'Gardez au moins un concurrent pour le Live.'
          : FAILURE,
    };
  }
  revalidatePath(`/builder/${projectId}/lancer-le-live`);
  revalidatePath(`/builder/${projectId}/avant-rendez-vous`);
  revalidatePath('/live');
  return { ok: true };
}
