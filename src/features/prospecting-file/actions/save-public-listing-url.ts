'use server';

import { revalidatePath } from 'next/cache';

import { publicListingUrlSchema } from '@/features/prospecting-file/schemas/prospecting-file-input';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export type SavePublicListingUrlResult = { ok: true } | { ok: false; error: string };

// Mission 84 — le lien de l'annonce publiée de notre bien, saisi sur la page du dossier conclu.
// Sans lien, aucun dossier de prospection. Un champ vidé retire le lien.
export async function savePublicListingUrl(
  projectId: string,
  raw: unknown,
): Promise<SavePublicListingUrlResult> {
  const profile = await getProfile();
  if (!profile) {
    return { ok: false, error: 'Vous devez être connecté.' };
  }
  const parsed = publicListingUrlSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Lien invalide : collez l’adresse complète de l’annonce (https://…).',
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('subject_properties')
    .update({ public_listing_url: parsed.data === '' ? null : parsed.data })
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id)
    .select('id');
  if (error) {
    return { ok: false, error: 'Le lien n’a pas été enregistré. Réessayez.' };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: 'Ce dossier n’a pas encore de bien vendeur.' };
  }

  revalidatePath(`/builder/${projectId}`);
  revalidatePath(`/builder/${projectId}/prospection`);
  return { ok: true };
}
