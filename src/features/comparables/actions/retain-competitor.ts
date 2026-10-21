'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { maybePromoteToReady } from '@/features/projects/services/project-readiness';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export type RetainCompetitorResult = { ok: true } | { ok: false; error: string };

const FAILURE = 'Le concurrent n’a pas pu être retenu. Réessayez.';

// Mission 108 — « Déjà dans le dossier (écartée) : la retenir ? ». Le conseiller retient la fiche
// qui existait déjà pour cette annonce ; rien d'autre n'est touché. Mission 112 — retenue en plein
// Live, elle est hors Live, à la fin de l'ordre (la base le décide).
export async function retainCompetitor(
  projectId: string,
  comparableId: string,
): Promise<RetainCompetitorResult> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) return { ok: false, error: FAILURE };
  if (!z.uuid().safeParse(comparableId).success || !z.uuid().safeParse(projectId).success) {
    return { ok: false, error: FAILURE };
  }
  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .neq('status', 'archived')
    .maybeSingle();
  if (!project) return { ok: false, error: FAILURE };

  const { data, error } = await supabase
    .from('comparables')
    .update({ is_selected: true, updated_at: new Date().toISOString() })
    .eq('id', comparableId)
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id)
    .select('id, listing_url');
  if (error || !data || data.length === 0) return { ok: false, error: FAILURE };
  // Mission 112 — la ligne d'attente de cette annonce, gardée jusqu'à la réponse, part avec elle.
  const listingUrl = data[0].listing_url;
  if (listingUrl) {
    await supabase
      .from('pending_competitor_imports')
      .delete()
      .eq('project_id', projectId)
      .eq('agency_id', profile.agency_id)
      .eq('listing_url', listingUrl);
  }

  await maybePromoteToReady(supabase, projectId, profile.agency_id);
  revalidatePath(`/builder/${projectId}/comparables`);
  revalidatePath(`/builder/${projectId}/avant-rendez-vous`);
  revalidatePath(`/builder/${projectId}`);
  revalidatePath('/builder');
  return { ok: true };
}
