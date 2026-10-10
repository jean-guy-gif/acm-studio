'use server';

import { revalidatePath } from 'next/cache';

import { isProspectingOpen } from '@/features/competitor-locator/services/build-prospecting-rows';
import {
  applyProspectingMove,
  isProspectingMove,
  prospectingStatus,
} from '@/features/prospecting/services/prospecting-status';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export type SetProspectingStatusResult = { ok: true } | { ok: false; error: string };

const FAILURE = 'Le statut n’a pas été enregistré. Réessayez.';

// Mission 86 — le conseiller fait avancer (ou reculer d'un cran) la prospection d'un concurrent :
// dossier remis, rendez-vous obtenu, mandat rentré, pas intéressé. Le geste vient du navigateur :
// revalidé ici sur une liste, puis confronté au statut COURANT relu en base — jamais à celui que
// l'écran croyait. Lecture et écriture cadrées sur l'agence de l'appelant ; le dossier doit être
// conclu « mandat signé », seul cas où la prospection existe (M75).
export async function setProspectingStatus(
  projectId: string,
  competitorId: string,
  move: unknown,
): Promise<SetProspectingStatusResult> {
  const profile = await getProfile();
  if (!profile) {
    return { ok: false, error: 'Vous devez être connecté.' };
  }
  if (!isProspectingMove(move)) {
    return { ok: false, error: FAILURE };
  }

  const supabase = await createClient();
  const [{ data: project }, { data: conclusion }, { data: competitor }] = await Promise.all([
    supabase
      .from('projects')
      .select('status')
      .eq('id', projectId)
      .eq('agency_id', profile.agency_id)
      .maybeSingle(),
    supabase
      .from('project_meeting_conclusions')
      .select('outcome')
      .eq('project_id', projectId)
      .eq('agency_id', profile.agency_id)
      .maybeSingle(),
    supabase
      .from('comparables')
      .select(
        'is_selected, locator_address, locator_confirmed, prospecting_handed_at, prospecting_meeting_at, prospecting_mandate_at, prospecting_declined_at',
      )
      .eq('id', competitorId)
      .eq('project_id', projectId)
      .eq('agency_id', profile.agency_id)
      .maybeSingle(),
  ]);
  if (!project || !competitor || !competitor.is_selected) {
    return { ok: false, error: 'Concurrent introuvable pour votre agence.' };
  }
  if (!isProspectingOpen(project.status, conclusion?.outcome)) {
    return { ok: false, error: 'La prospection s’ouvre une fois le mandat signé.' };
  }

  const status = prospectingStatus(
    competitor,
    competitor.locator_confirmed === true && (competitor.locator_address?.trim() ?? '') !== '',
  );
  const result = applyProspectingMove(status, move, new Date().toISOString());
  if (!result.ok) {
    return result;
  }

  const { data, error } = await supabase
    .from('comparables')
    .update(result.patch)
    .eq('id', competitorId)
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id)
    .select('id');
  if (error || !data || data.length === 0) {
    return { ok: false, error: FAILURE };
  }

  revalidatePath('/prospection');
  revalidatePath('/suivi');
  revalidatePath(`/builder/${projectId}`);
  return { ok: true };
}
