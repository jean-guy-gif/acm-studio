'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { getProfile } from '@/lib/auth/get-profile';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type RemoveSynthesisLinkResult = { ok: true } | { ok: false; error: string };

// Mission 110 — « Retirer le lien » : le lien de la synthèse devient inutilisable tout de suite
// (la ligne est supprimée ; la page publique ne le reconnaît plus). Un membre non retiré de
// l'agence, sur un lien d'un dossier de son agence.
export async function removeSynthesisLink(
  projectId: string,
  linkId: string,
): Promise<RemoveSynthesisLinkResult> {
  const profile = await getProfile();
  if (
    !profile ||
    profile.removed_at ||
    !z.uuid().safeParse(projectId).success ||
    !z.uuid().safeParse(linkId).success
  ) {
    return { ok: false, error: 'Le lien n’a pas pu être retiré.' };
  }
  const { data, error } = await createServiceRoleClient()
    .from('seller_synthesis_links')
    .delete()
    .eq('id', linkId)
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id)
    .select('id');
  if (error || !data || data.length === 0) {
    return { ok: false, error: 'Le lien n’a pas pu être retiré.' };
  }
  revalidatePath(`/builder/${projectId}/synthese`);
  return { ok: true };
}
