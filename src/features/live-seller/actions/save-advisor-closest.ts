'use server';

import { isLiveClosed, LIVE_CLOSED_MESSAGE } from '@/features/live-seller/services/live-closed';
import { priceShown } from '@/features/live-seller/services/presentation-mode';
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
    .select('id, status, live_presentation_mode')
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (!project) {
    return { ok: false, error: 'Projet introuvable pour votre agence.' };
  }
  if (isLiveClosed(project.status)) {
    return { ok: false, error: LIVE_CLOSED_MESSAGE };
  }
  // Une proposition du conseiller en présentation directe seulement ; la retirer reste possible.
  if (comparableId != null && project.live_presentation_mode !== 'direct') {
    return { ok: false, error: 'Le Live n’est pas en présentation directe.' };
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
    // Son prix a été montré au vendeur (deviné ou en directe), et il ne l'a pas écarté par « Non ».
    const { data: response } = await supabase
      .from('live_seller_responses')
      .select('seller_estimated_listing_price, shown_directly_at, seller_serious_competitor')
      .eq('project_id', projectId)
      .eq('comparable_id', comparableId)
      .eq('agency_id', profile.agency_id)
      .maybeSingle();
    if (!priceShown(response) || response?.seller_serious_competitor === 'no') {
      return { ok: false, error: 'Ce concurrent n’a pas encore été montré.' };
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
