'use server';

import { revalidatePath } from 'next/cache';

import { getConclusion } from '@/features/meeting-conclusion/queries/get-conclusion';
import {
  isOutcomeLockError,
  OUTCOME_LOCKED,
  outcomeChangeRefusal,
} from '@/features/mandate-life/services/outcome-lock';
import { readDecisionForm } from '@/features/meeting-conclusion/schemas/conclusion-input';
import {
  OUTCOME_REQUIRED_MESSAGE,
  PRICE_INVALID_MESSAGE,
  checkDecision,
} from '@/features/meeting-conclusion/services/conclusion-requirements';
import { getProject } from '@/features/projects/queries/get-project';
import {
  FIRST_FOLLOW_UP_INVALID,
  readFirstFollowUpOn,
} from '@/features/meeting-conclusion/services/follow-up-contacts';
import { readObjections } from '@/features/meeting-conclusion/services/objections';
import { absorbBuyerProspectsForProject } from '@/features/buyer-prospecting/services/absorb-buyer-prospects';
import { getProfile } from '@/lib/auth/get-profile';
import type { Database } from '@/lib/supabase/database.types';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { detachBuyerOriginsForProject } from '@/features/buyer-prospecting/services/detach-buyer-origins';

type ChangeArgs = Database['public']['Functions']['change_meeting_outcome']['Args'];

export type ChangeOutcomeResult = { ok: true } | { ok: false; error: string };

// Mission 54 §1 — l'acte NORMAL du suivi : changer l'issue d'un dossier conclu (un « à
// relancer » qui signe, un « vendu ailleurs » qui se clôt). Écrit l'issue, le motif, la date de
// changement et — mission 90 — le type de mandat et le prix de commercialisation d'un mandat
// qui se signe. Ne touche jamais les montants figés (l'histoire du rendez-vous
// ne se réécrit pas), ni `projects.status` (règle M53 : le statut porte la position).
export async function changeMeetingOutcome(
  projectId: string,
  formData: FormData,
): Promise<ChangeOutcomeResult> {
  const profile = await getProfile();
  if (!profile) {
    return { ok: false, error: 'Vous devez être connecté.' };
  }

  const parsed = readDecisionForm(formData);
  if (!parsed.success) {
    const priceIssue = parsed.error.issues.some(
      (issue) => issue.path[0] === 'commercialization_price',
    );
    return { ok: false, error: priceIssue ? PRICE_INVALID_MESSAGE : OUTCOME_REQUIRED_MESSAGE };
  }

  // Autorisation + garde de position : on ne change l'issue que d'un dossier en Suivi.
  const project = await getProject(projectId);
  if (!project) {
    return { ok: false, error: 'Dossier introuvable pour votre agence.' };
  }
  if (project.status !== 'meeting_completed') {
    return { ok: false, error: 'Ce dossier n’est pas encore dans le Suivi.' };
  }

  // Mission 90 — mêmes exigences qu'à la conclusion : un « à relancer » qui signe dit exclusif
  // ou simple, et son prix s'il manque.
  const known = await getConclusion(projectId);
  const decision = checkDecision(parsed.data, {
    commercializationPrice: known?.commercializationPrice ?? null,
    mandateType: known?.mandateType ?? null,
  });
  if (!decision.ok) {
    return { ok: false, error: decision.error };
  }
  // Lot C — sous compromis ou vendu, l'issue reste « mandat signé » : le compromis tombe d'abord.
  const locked = outcomeChangeRefusal(known?.life, decision.value.outcome);
  if (locked) {
    return { ok: false, error: locked };
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

  const serviceClient = createServiceRoleClient();
  // null accepté en base pour les trois derniers (cast de typage seulement).
  const args: ChangeArgs = {
    p_project_id: projectId,
    p_agency_id: profile.agency_id,
    p_outcome: decision.value.outcome,
    p_reason: decision.value.reason as string,
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
    p_price: decision.value.price as number,
  };
  const { error } = await serviceClient.rpc('change_meeting_outcome', args);
  if (error) {
    return {
      ok: false,
      error: isOutcomeLockError(error)
        ? OUTCOME_LOCKED.compromise
        : 'Le changement d’issue a échoué. Réessayez.',
    };
  }

  // Mission 120 — passé « mandat signé », ses concurrents retenus arrivent en Prospection.
  if (decision.value.outcome === 'signed') {
    await absorbBuyerProspectsForProject(serviceClient, profile.agency_id, projectId);
    revalidatePath('/prospection');
  } else {
    // Mission 120 B — passé « vendu ailleurs », « à relancer » ou « retiré », ses concurrents ne
    // portent plus de carte : les recherches acquéreur gardent la leur (décision du 29/10).
    await detachBuyerOriginsForProject(serviceClient, profile.agency_id, projectId);
    revalidatePath('/prospection');
  }
  revalidatePath('/suivi');
  revalidatePath('/aujourdhui');
  revalidatePath(`/builder/${projectId}/conclusion`);
  return { ok: true };
}
