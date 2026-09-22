'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { loadLivePresentation } from '@/features/live-seller/services/load-live-presentation';
import { conclusionDecisionSchema } from '@/features/meeting-conclusion/schemas/conclusion-input';
import { liveDerivedAmounts } from '@/features/meeting-conclusion/services/resolve-conclusion-amounts';
import { getProject } from '@/features/projects/queries/get-project';
import { getProfile } from '@/lib/auth/get-profile';
import type { Database } from '@/lib/supabase/database.types';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

type ConcludeArgs = Database['public']['Functions']['conclude_meeting']['Args'];

export type ConcludeResult = { ok: false; error: string };

// Mission 53 §2 — écran conseiller (jamais vu du vendeur) : consigner l'issue et faire
// passer le dossier en Suivi. La bascule status + l'écriture de l'issue sont UNE SEULE
// transaction (fonction conclude_meeting) : un meeting_completed sans conclusion serait
// « en Suivi sans issue » (dossier invisible M52). Succès → redirige vers /suivi.
export async function concludeMeeting(
  projectId: string,
  formData: FormData,
): Promise<ConcludeResult> {
  const profile = await getProfile();
  if (!profile) {
    return { ok: false, error: 'Vous devez être connecté.' };
  }

  const parsed = conclusionDecisionSchema.safeParse({
    outcome: formData.get('outcome'),
    follow_up_reason: formData.get('follow_up_reason') ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: 'Choisissez « Mandat signé » ou « À relancer ».' };
  }

  // Autorisation + garde de position : on ne conclut qu'un dossier dans le Live (prêt) ou
  // déjà conclu (pour corriger l'issue). getProject est cadré sur l'agence.
  const project = await getProject(projectId);
  if (!project) {
    return { ok: false, error: 'Dossier introuvable pour votre agence.' };
  }
  if (project.status !== 'ready_for_meeting' && project.status !== 'meeting_completed') {
    return { ok: false, error: 'Ce dossier n’est pas prêt à être conclu.' };
  }

  // ①②③ courants, au cas où l'étape 1 (prix au Live) ne les a pas déjà figés.
  const presentation = await loadLivePresentation(projectId);
  const amounts = liveDerivedAmounts(presentation?.live ?? null);

  const serviceClient = createServiceRoleClient();
  const args: ConcludeArgs = {
    p_project_id: projectId,
    p_agency_id: profile.agency_id,
    p_outcome: parsed.data.outcome,
    // p_reason / p_price acceptent null en base ; cast de typage seulement.
    p_reason: parsed.data.followUpReason as string,
    p_price: null as unknown as number, // le prix vient du Live ; la fonction garde l'existant.
    p_market_computed: amounts.marketComputed as number,
    p_advisor_analysis: amounts.advisorAnalysis as number,
    p_advisor_price: amounts.advisorPrice as number,
  };
  const { error } = await serviceClient.rpc('conclude_meeting', args);
  if (error) {
    return { ok: false, error: 'La conclusion a échoué. Réessayez.' };
  }

  revalidatePath('/live');
  revalidatePath('/builder');
  revalidatePath(`/builder/${projectId}`);
  revalidatePath('/suivi');
  redirect('/suivi');
}
