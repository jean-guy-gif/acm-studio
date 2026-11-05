'use server';

import { revalidatePath } from 'next/cache';

import { isLiveClosed } from '@/features/live-seller/services/live-closed';
import {
  isLivePresentationMode,
  PRESENTATION_MODE_CONCLUDED_MESSAGE,
  PRESENTATION_MODE_STARTED_MESSAGE,
  type LivePresentationMode,
} from '@/features/live-seller/services/presentation-mode';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// Mission 131 — la façon de présenter, sur « Avant le rendez-vous » ET pendant le Live (« Passer
// en présentation directe », « Reprendre le Live interactif ») : ce qui a déjà été répondu est
// gardé, seuls les écrans suivants changent. Refusée sur un dossier conclu ou archivé ; « Document
// seul » refusé une fois le Live commencé. La base le revérifie (déclencheur, 42501).
export type SetPresentationModeResult = { ok: true } | { ok: false; error: string };

export async function setLivePresentationMode(
  projectId: string,
  requested: LivePresentationMode,
): Promise<SetPresentationModeResult> {
  const profile = await getProfile();
  if (!profile) {
    return { ok: false, error: 'Vous devez être connecté.' };
  }
  if (!isLivePresentationMode(requested)) {
    return { ok: false, error: 'Façon de présenter inconnue.' };
  }
  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('id, status, live_started_at, live_presentation_mode')
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (!project) {
    return { ok: false, error: 'Projet introuvable pour votre agence.' };
  }
  if (isLiveClosed(project.status)) {
    return { ok: false, error: PRESENTATION_MODE_CONCLUDED_MESSAGE };
  }
  if (project.live_presentation_mode === requested) {
    return { ok: true };
  }
  if (requested === 'document') {
    const { count } = await supabase
      .from('live_seller_responses')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('agency_id', profile.agency_id);
    if (project.live_started_at != null || (count ?? 0) > 0) {
      return { ok: false, error: PRESENTATION_MODE_STARTED_MESSAGE };
    }
  }
  const { error } = await supabase
    .from('projects')
    .update({ live_presentation_mode: requested })
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id);
  if (error) {
    return {
      ok: false,
      error:
        error.code === '42501'
          ? requested === 'document'
            ? PRESENTATION_MODE_STARTED_MESSAGE
            : PRESENTATION_MODE_CONCLUDED_MESSAGE
          : 'La façon de présenter n’a pas pu être enregistrée.',
    };
  }
  revalidatePath(`/builder/${projectId}`);
  revalidatePath(`/builder/${projectId}/avant-rendez-vous`);
  revalidatePath('/live');
  return { ok: true };
}
