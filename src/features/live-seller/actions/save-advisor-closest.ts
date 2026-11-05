'use server';

import { isLiveClosed, LIVE_CLOSED_MESSAGE } from '@/features/live-seller/services/live-closed';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// Mission 131 — en présentation directe, « le concurrent le plus proche de votre bien » est proposé
// par le CONSEILLER : il s'écrit à part (`advisor_closest_comparable_id`), jamais dans le choix du
// vendeur (`seller_most_dangerous_comparable_id`, M96, M113, M129). Facultatif, rien n'est choisi
// d'avance ; `null` retire la proposition. Le concurrent doit être retenu et montré au Live, dans
// ce dossier ; la base le revérifie (déclencheur) et ne le change plus une fois conclu (M109).
export type SaveAdvisorClosestResult = { ok: true } | { ok: false; error: string };

export async function saveAdvisorClosest(
  projectId: string,
  comparableId: string | null,
): Promise<SaveAdvisorClosestResult> {
  const profile = await getProfile();
  if (!profile) {
    return { ok: false, error: 'Vous devez être connecté.' };
  }
  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('id, status')
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (!project) {
    return { ok: false, error: 'Projet introuvable pour votre agence.' };
  }
  if (isLiveClosed(project.status)) {
    return { ok: false, error: LIVE_CLOSED_MESSAGE };
  }
  if (comparableId != null) {
    const { data: comparable } = await supabase
      .from('comparables')
      .select('id, is_selected, excluded_from_live')
      .eq('id', comparableId)
      .eq('project_id', projectId)
      .eq('agency_id', profile.agency_id)
      .maybeSingle();
    if (!comparable || !comparable.is_selected || comparable.excluded_from_live) {
      return { ok: false, error: 'Ce concurrent n’est pas montré dans ce rendez-vous.' };
    }
  }

  const patch = {
    advisor_closest_comparable_id: comparableId,
    updated_at: new Date().toISOString(),
  };
  const { data: updated, error: updateError } = await supabase
    .from('live_seller_summary')
    .update(patch)
    .select('id')
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (updateError) {
    return { ok: false, error: 'L’enregistrement a échoué.' };
  }
  if (!updated) {
    const { error: insertError } = await supabase.from('live_seller_summary').insert({
      ...patch,
      project_id: projectId,
      agency_id: profile.agency_id,
    });
    if (insertError?.code === '23505') {
      const { error: retryError } = await supabase
        .from('live_seller_summary')
        .update(patch)
        .eq('project_id', projectId)
        .eq('agency_id', profile.agency_id);
      if (retryError) {
        return { ok: false, error: 'L’enregistrement a échoué.' };
      }
    } else if (insertError) {
      return { ok: false, error: 'L’enregistrement a échoué.' };
    }
  }
  return { ok: true };
}
