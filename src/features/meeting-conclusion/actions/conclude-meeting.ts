'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { loadLivePresentation } from '@/features/live-seller/services/load-live-presentation';
import { conclusionDecisionSchema } from '@/features/meeting-conclusion/schemas/conclusion-input';
import {
  liveCapturedFacts,
  liveDerivedAmounts,
} from '@/features/meeting-conclusion/services/resolve-conclusion-amounts';
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

  // Les valeurs COURANTES, au cas où l'étape 1 (prix au Live) ne les a pas déjà figées.
  // La fonction fige au premier passage (COALESCE) et ne réécrit jamais.
  const presentation = await loadLivePresentation(projectId);
  const live = presentation?.live ?? null;
  const amounts = liveDerivedAmounts(live);
  const facts = liveCapturedFacts(live);

  const serviceClient = createServiceRoleClient();
  const args: ConcludeArgs = {
    p_project_id: projectId,
    p_agency_id: profile.agency_id,
    p_outcome: parsed.data.outcome,
    // Les paramètres nullables acceptent null en base ; cast de typage seulement.
    p_reason: parsed.data.followUpReason as string,
    p_price: null as unknown as number, // le prix vient du Live ; la fonction garde l'existant.
    p_market_computed: amounts.marketComputed as number,
    p_advisor_analysis: amounts.advisorAnalysis as number,
    p_advisor_price: amounts.advisorPrice as number,
    // Mission 56 — quatre faits de plus, figés au même instant.
    p_seller_wanted: facts.sellerWanted as number,
    p_seller_perceived: facts.sellerPerceived as number,
    p_retained: facts.retained as number,
    p_exploitable: facts.exploitable as number,
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
