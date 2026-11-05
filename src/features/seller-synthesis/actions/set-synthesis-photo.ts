'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export type SetSynthesisPhotoResult = { ok: true } | { ok: false; error: string };

const FAILURE = 'Le choix de la photo n’a pas pu être enregistré. Réessayez.';

const input = z.object({
  projectId: z.uuid(),
  comparableId: z.uuid(),
  hidden: z.boolean(),
});

// Mission 113 — « Sans photo » : le conseiller retire la photo d'un concurrent de la synthèse, du
// document imprimé comme du lien déjà envoyé (la page publique relit le choix à chaque ouverture).
// Rien d'autre n'est touché ; le dossier et le concurrent doivent être ceux de son agence.
export async function setSynthesisPhoto(
  projectId: string,
  comparableId: string,
  hidden: boolean,
): Promise<SetSynthesisPhotoResult> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) return { ok: false, error: FAILURE };
  const parsed = input.safeParse({ projectId, comparableId, hidden });
  if (!parsed.success) return { ok: false, error: FAILURE };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('comparables')
    .update({ synthesis_hide_photo: parsed.data.hidden })
    .eq('id', parsed.data.comparableId)
    .eq('project_id', parsed.data.projectId)
    .eq('agency_id', profile.agency_id)
    .select('id');
  if (error || !data || data.length === 0) return { ok: false, error: FAILURE };

  revalidatePath(`/builder/${parsed.data.projectId}/synthese`);
  // Mission 127 — le Point marché lit le même choix.
  revalidatePath(`/builder/${parsed.data.projectId}/point-marche`);
  // Mission 131 — l'Étude de marché aussi.
  revalidatePath(`/builder/${parsed.data.projectId}/etude-de-marche`);
  return { ok: true };
}
