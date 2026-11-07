'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { loadLivePresentation } from '@/features/live-seller/services/load-live-presentation';
import { getConclusion } from '@/features/meeting-conclusion/queries/get-conclusion';
import { readDecisionForm } from '@/features/meeting-conclusion/schemas/conclusion-input';
import { canConcludeProject } from '@/features/meeting-conclusion/services/can-conclude-project';
import {
  OUTCOME_REQUIRED_MESSAGE,
  PRICE_INVALID_MESSAGE,
  checkDecision,
} from '@/features/meeting-conclusion/services/conclusion-requirements';
import {
  liveCapturedFacts,
  liveDerivedAmounts,
} from '@/features/meeting-conclusion/services/resolve-conclusion-amounts';
import { getProject } from '@/features/projects/queries/get-project';
import {
  FIRST_FOLLOW_UP_INVALID,
  readFirstFollowUpOn,
} from '@/features/meeting-conclusion/services/follow-up-contacts';
import { readObjections } from '@/features/meeting-conclusion/services/objections';
import { absorbBuyerProspectsForProject } from '@/features/buyer-prospecting/services/absorb-buyer-prospects';
import { detachBuyerOriginsForProject } from '@/features/buyer-prospecting/services/detach-buyer-origins';
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

  const parsed = readDecisionForm(formData);
  if (!parsed.success) {
    // Mission 90 — le message cite les quatre issues ; un prix mal formé le dit.
    const priceIssue = parsed.error.issues.some(
      (issue) => issue.path[0] === 'commercialization_price',
    );
    return { ok: false, error: priceIssue ? PRICE_INVALID_MESSAGE : OUTCOME_REQUIRED_MESSAGE };
  }

  // Autorisation + garde de position : on conclut un dossier prêt, déjà conclu (pour corriger
  // l'issue) ou — mission 81 — encore en préparation, puisque le Live peut y être lancé.
  // getProject est cadré sur l'agence.
  const project = await getProject(projectId);
  if (!project) {
    return { ok: false, error: 'Dossier introuvable pour votre agence.' };
  }
  if (!canConcludeProject(project.status)) {
    return { ok: false, error: 'Ce dossier ne peut pas être conclu.' };
  }

  // Mission 90 — un mandat signé exige exclusif ou simple, et un prix : celui déjà enregistré
  // (saisi au Live), ou celui du formulaire s'il manque.
  const known = await getConclusion(projectId);
  const decision = checkDecision(parsed.data, {
    commercializationPrice: known?.commercializationPrice ?? null,
    mandateType: known?.mandateType ?? null,
  });
  if (!decision.ok) {
    return { ok: false, error: decision.error };
  }
  // Mission 108 — « à relancer » : la date de première relance, proposée par l'écran et relue ici.
  const firstFollowUp = readFirstFollowUpOn(
    formData.get('next_follow_up_on'),
    decision.value.outcome,
    decision.value.motive,
    new Date(),
  );
  if (!firstFollowUp.ok) {
    return { ok: false, error: FIRST_FOLLOW_UP_INVALID };
  }
  const objections = readObjections(formData);

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
    p_outcome: decision.value.outcome,
    // Les paramètres nullables acceptent null en base ; cast de typage seulement.
    p_reason: decision.value.reason as string,
    // Un prix saisi ici remplace celui du Live ; null = la fonction garde l'existant.
    p_price: decision.value.price as number,
    p_mandate_type: decision.value.mandateType as string,
    p_follow_up_motive: decision.value.motive as string,
    p_follow_up_motive_detail: decision.value.motiveDetail as string,
    p_next_follow_up_on: firstFollowUp.day as string,
    // Mission 110 — ce qui freine le vendeur ; un mandat signé n'en change pas les objections.
    ...(decision.value.outcome === 'signed'
      ? {}
      : {
          p_objections: objections.objections,
          p_objection_note: objections.note as string,
        }),
    p_market_computed: amounts.marketComputed as number,
    p_advisor_analysis: amounts.advisorAnalysis as number,
    p_advisor_price: amounts.advisorPrice as number,
    // Mission 56 — quatre faits de plus, figés au même instant.
    p_seller_wanted: facts.sellerWanted as number,
    p_seller_perceived: facts.sellerPerceived as number,
    p_retained: facts.retained as number,
    p_exploitable: facts.exploitable as number,
  };
  const { data: enteredFollowUp, error } = await serviceClient.rpc('conclude_meeting', args);
  if (error) {
    return { ok: false, error: 'La conclusion a échoué. Réessayez.' };
  }
  // La fonction retourne true quand le dossier vient d'entrer dans le Suivi. Un dossier qui
  // n'y était pas déjà et n'y est pas entré serait « conclu hors du Suivi » : on le dit au
  // lieu de rediriger vers un Suivi où il n'apparaît pas.
  if (project.status !== 'meeting_completed' && enteredFollowUp !== true) {
    return {
      ok: false,
      error: 'L’issue est notée, mais le dossier n’est pas passé dans le Suivi. Réessayez.',
    };
  }

  // Mission 120 — mandat signé : ses concurrents retenus arrivent en Prospection, et chacun
  // reprend la carte d'une recherche acquéreur sur la même annonce, s'il y en a une.
  if (decision.value.outcome === 'signed') {
    await absorbBuyerProspectsForProject(serviceClient, profile.agency_id, projectId);
    revalidatePath('/prospection');
  } else {
    // Mission 120 B (relecteur) — l'écran de conclusion corrige aussi l'issue d'un dossier conclu :
    // un mandat signé corrigé en « vendu ailleurs » ou « retiré » ne porte plus de carte, et les
    // recherches acquéreur gardent la leur (décision du 29/10). Sans origine, rien n'est écrit.
    await detachBuyerOriginsForProject(serviceClient, profile.agency_id, projectId);
    revalidatePath('/prospection');
  }
  revalidatePath('/live');
  revalidatePath('/builder');
  revalidatePath(`/builder/${projectId}`);
  revalidatePath('/suivi');
  revalidatePath('/aujourdhui');
  redirect('/suivi');
}
