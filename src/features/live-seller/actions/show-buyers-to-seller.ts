'use server';

import { z } from 'zod';

import { getPropertyBuyers } from '@/features/buyers/queries/get-property-buyers';
import { LIVE_BUYERS_THRESHOLD } from '@/features/buyers/services/property-buyers';
import { isLiveClosed, LIVE_CLOSED_MESSAGE } from '@/features/live-seller/services/live-closed';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// Mission 133 — « Montrer au vendeur » : le moment est noté sur le Live, avec le nombre
// d'acquéreurs prêts RECALCULÉ ici (jamais reçu du navigateur), pour le Suivi et la conclusion
// (« 7 acquéreurs montrés au rendez-vous »). La première présentation est gardée et l'heure est
// celle de la base (migration 20261122090000) ; rien ne s'écrit sous 5, ni sur un Live clos (M109).
export type ShowBuyersResult = { ok: true } | { ok: false; error: string };

const FAILED = 'L’enregistrement a échoué.';

export async function showBuyersToSeller(projectId: string): Promise<ShowBuyersResult> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) return { ok: false, error: 'Vous devez être connecté.' };
  if (!z.uuid().safeParse(projectId).success) {
    return { ok: false, error: 'Projet introuvable pour votre agence.' };
  }
  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('id, status, is_example')
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (!project || project.is_example) {
    return { ok: false, error: 'Projet introuvable pour votre agence.' };
  }
  if (isLiveClosed(project.status)) return { ok: false, error: LIVE_CLOSED_MESSAGE };

  const result = await getPropertyBuyers(profile.agency_id, projectId, new Date());
  if (result == null) return { ok: false, error: FAILED };
  const count = result.ready.length;
  if (count < LIVE_BUYERS_THRESHOLD) {
    return { ok: false, error: 'Moins de 5 acquéreurs prêts : rien à montrer.' };
  }

  // L'heure posée ici est remplacée par celle de la base.
  const patch = { buyers_shown_at: new Date().toISOString(), buyers_shown_count: count };
  const { data: updated, error: updateError } = await supabase
    .from('live_seller_summary')
    .update(patch)
    .select('id')
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (updateError) return { ok: false, error: FAILED };
  if (!updated) {
    const { error: insertError } = await supabase
      .from('live_seller_summary')
      .insert({ ...patch, project_id: projectId, agency_id: profile.agency_id });
    if (insertError?.code === '23505') {
      const { error: retryError } = await supabase
        .from('live_seller_summary')
        .update(patch)
        .eq('project_id', projectId)
        .eq('agency_id', profile.agency_id);
      if (retryError) return { ok: false, error: FAILED };
    } else if (insertError) {
      return { ok: false, error: FAILED };
    }
  }
  return { ok: true };
}
