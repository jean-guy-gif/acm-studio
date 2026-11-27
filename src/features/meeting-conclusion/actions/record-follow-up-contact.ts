'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { getConclusion } from '@/features/meeting-conclusion/queries/get-conclusion';
import { parseNextFollowUpOn } from '@/features/meeting-conclusion/services/follow-up-contacts';
import { getProject } from '@/features/projects/queries/get-project';
import { getPropertyBuyers } from '@/features/buyers/queries/get-property-buyers';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import { getProfile } from '@/lib/auth/get-profile';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { createClient } from '@/lib/supabase/server';

export type RecordFollowUpResult = { ok: true } | { ok: false; error: string };

// Une note d'UNE ligne, facultative : les retours à la ligne deviennent des espaces.
const noteSchema = z
  .string()
  .max(1000)
  .optional()
  .transform((value) => {
    const line = value?.replace(/\s+/g, ' ').trim();
    return line ? line : null;
  })
  .pipe(z.union([z.null(), z.string().max(200)]));

// Mission 96 — « Relancé aujourd'hui » : une ligne de plus dans l'historique des relances d'un
// dossier « à relancer ». La date est celle de la base, l'auteur est le conseiller connecté :
// le navigateur ne choisit ni l'une ni l'autre (droits de la table). Rien n'est envoyé au
// vendeur ; une relance ne se modifie ni ne se retire depuis l'écran.
export async function recordFollowUpContact(
  projectId: string,
  formData: FormData,
): Promise<RecordFollowUpResult> {
  const profile = await getProfile();
  if (!profile) {
    return { ok: false, error: 'Vous devez être connecté.' };
  }

  const note = noteSchema.safeParse(formData.get('note') ?? undefined);
  if (!note.success) {
    return { ok: false, error: 'La note tient en une ligne de 200 caractères au plus.' };
  }

  const project = await getProject(projectId);
  if (!project) {
    return { ok: false, error: 'Dossier introuvable pour votre agence.' };
  }
  if (project.status !== 'meeting_completed') {
    return { ok: false, error: 'Ce dossier n’est pas dans le Suivi.' };
  }
  const conclusion = await getConclusion(projectId);
  if (conclusion?.outcome !== 'follow_up') {
    return { ok: false, error: 'Ce dossier n’est plus «\u00a0à relancer\u00a0».' };
  }

  // Mission 105 — la date de prochaine relance : celle de l'écran, relue ; vide, la date proposée
  // (1 mois si le vendeur réfléchit au prix, 7 jours sinon).
  const next = parseNextFollowUpOn(
    formData.get('next_follow_up_on'),
    conclusion.followUpMotive,
    new Date(),
  );
  if (!next.ok) {
    return {
      ok: false,
      error: 'Choisissez une date de prochaine relance, d’aujourd’hui à dans un an.',
    };
  }

  const supabase = await createClient();
  const { data: inserted, error } = await supabase
    .from('follow_up_contacts')
    .insert({
      project_id: projectId,
      agency_id: profile.agency_id,
      author_id: profile.id,
      note: note.data,
      next_follow_up_on: next.day,
    })
    .select('contacted_at')
    .single();
  if (error) {
    return { ok: false, error: 'La relance n’a pas pu être enregistrée. Réessayez.' };
  }

  // Mission 145 (partie B) — une relance faite vaut « Garder la date » pour les acquéreurs prêts
  // qu'elle a déjà comptés : « Relancer plus tôt ? » ne revient qu'avec un acquéreur prêt de plus,
  // jamais le jour même. Un échec ici ne défait pas la relance ; il entre au journal.
  await keepDateAfterRelance(projectId, profile.agency_id, inserted?.contacted_at ?? null);

  revalidatePath('/suivi');

  revalidatePath('/aujourdhui');
  revalidatePath(`/builder/${projectId}/conclusion`);
  return { ok: true };
}

async function keepDateAfterRelance(
  projectId: string,
  agencyId: string,
  contactedAt: string | null,
): Promise<void> {
  if (!contactedAt) return;
  try {
    const buyers = await getPropertyBuyers(agencyId, projectId, new Date());
    const ready = buyers?.ready.length ?? 0;
    if (ready < 1) return;
    const { error } = await createServiceRoleClient()
      .from('project_meeting_conclusions')
      .update({ early_follow_up_kept_at: contactedAt, early_follow_up_kept_ready: ready })
      .eq('project_id', projectId)
      .eq('agency_id', agencyId);
    if (error) throw error;
  } catch (cause) {
    await reportServerError('record-follow-up-contact: garder la date', cause);
  }
}
