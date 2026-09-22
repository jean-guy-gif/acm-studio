'use server';

import { revalidatePath } from 'next/cache';

import { changeOutcomeSchema } from '@/features/meeting-conclusion/schemas/conclusion-input';
import { getProject } from '@/features/projects/queries/get-project';
import { getProfile } from '@/lib/auth/get-profile';
import type { Database } from '@/lib/supabase/database.types';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

type ChangeArgs = Database['public']['Functions']['change_meeting_outcome']['Args'];

export type ChangeOutcomeResult = { ok: true } | { ok: false; error: string };

// Mission 54 §1 — l'acte NORMAL du suivi : changer l'issue d'un dossier conclu (un « à
// relancer » qui signe, un « vendu ailleurs » qui se clôt). N'écrit QUE l'issue, le motif
// et la date de changement. Ne touche jamais les montants figés (l'histoire du rendez-vous
// ne se réécrit pas), ni `projects.status` (règle M53 : le statut porte la position).
export async function changeMeetingOutcome(
  projectId: string,
  formData: FormData,
): Promise<ChangeOutcomeResult> {
  const profile = await getProfile();
  if (!profile) {
    return { ok: false, error: 'Vous devez être connecté.' };
  }

  const parsed = changeOutcomeSchema.safeParse({
    outcome: formData.get('outcome'),
    follow_up_reason: formData.get('follow_up_reason') ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: 'Choisissez une issue valide.' };
  }

  // Autorisation + garde de position : on ne change l'issue que d'un dossier en Suivi.
  const project = await getProject(projectId);
  if (!project) {
    return { ok: false, error: 'Dossier introuvable pour votre agence.' };
  }
  if (project.status !== 'meeting_completed') {
    return { ok: false, error: 'Ce dossier n’est pas encore dans le Suivi.' };
  }

  const serviceClient = createServiceRoleClient();
  const args: ChangeArgs = {
    p_project_id: projectId,
    p_agency_id: profile.agency_id,
    p_outcome: parsed.data.outcome,
    p_reason: parsed.data.followUpReason as string, // null accepté en base (cast de typage).
  };
  const { error } = await serviceClient.rpc('change_meeting_outcome', args);
  if (error) {
    return { ok: false, error: 'Le changement d’issue a échoué. Réessayez.' };
  }

  revalidatePath('/suivi');
  revalidatePath(`/builder/${projectId}/conclusion`);
  return { ok: true };
}
