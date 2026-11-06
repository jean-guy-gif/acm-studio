'use server';

import { revalidatePath } from 'next/cache';

import { isClientLanguage, offeredLanguages, type ClientLanguage } from '@/lib/client-language';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// Mission 140 — la langue du dossier vendeur : ce que voit ou reçoit le vendeur (le Live, ses
// documents et leurs liens) ; l'interface du conseiller reste en français. Elle change à tout moment,
// pendant le Live (« Réglages » : ce qui a été répondu est gardé) comme après la conclusion (les
// documents d'après) ; refusée sur un dossier archivé ; une langue cachée n'est acceptée que si elle
// est déjà celle du dossier. `updated_at` ne bouge pas : changer de langue n'est pas travailler le
// dossier (« ce qui dort », M59).
export type SetProjectLanguageResult = { ok: true } | { ok: false; error: string };

export async function setProjectLanguage(
  projectId: unknown,
  requested: unknown,
): Promise<SetProjectLanguageResult> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) return { ok: false, error: 'Vous devez être connecté.' };
  if (typeof projectId !== 'string' || !isClientLanguage(requested)) {
    return { ok: false, error: 'Langue inconnue.' };
  }
  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('id, status, language')
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (!project || project.status === 'archived') {
    return { ok: false, error: 'Dossier introuvable.' };
  }
  const current = isClientLanguage(project.language) ? project.language : 'fr';
  if (current === requested) return { ok: true };
  if (!offeredLanguages(current).includes(requested as ClientLanguage)) {
    return { ok: false, error: 'Cette langue n’est pas encore proposée.' };
  }
  const { error } = await supabase
    .from('projects')
    .update({ language: requested })
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id);
  if (error) return { ok: false, error: 'La langue n’a pas pu être changée. Réessayez.' };
  revalidatePath(`/builder/${projectId}`);
  revalidatePath(`/builder/${projectId}/avant-rendez-vous`);
  return { ok: true };
}
