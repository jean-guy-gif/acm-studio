'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { getConclusion } from '@/features/meeting-conclusion/queries/get-conclusion';
import { getProject } from '@/features/projects/queries/get-project';
import { getProfile } from '@/lib/auth/get-profile';
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
    return { ok: false, error: 'Ce dossier n’est plus « à relancer ».' };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('follow_up_contacts').insert({
    project_id: projectId,
    agency_id: profile.agency_id,
    author_id: profile.id,
    note: note.data,
  });
  if (error) {
    return { ok: false, error: 'La relance n’a pas pu être enregistrée. Réessayez.' };
  }

  revalidatePath('/suivi');
  revalidatePath(`/builder/${projectId}/conclusion`);
  return { ok: true };
}
