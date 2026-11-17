'use server';

import { revalidatePath } from 'next/cache';

import { ACADEMIA_LIVING_HERE_ERROR, academiaLivingHereUrl } from '@/lib/academia';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// Mission 147 (partie A) — le lien client « Vivre ici » d'Academia, collé une fois sur le mandat
// (décision de Jean-Guy, 09/11) : montré à l'acquéreur qui visite ce bien. Seulement un lien
// https://app.myacademia.ai/l/<jeton>, relu ici (la base garde la même règle) ; un lien vide le
// retire (`null`, jamais une chaîne vide). Tout dossier de l'agence non archivé, conclu compris.
// `updated_at` ne bouge pas : coller un lien n'est pas travailler le dossier (« ce qui dort », M59).
// Mission 156 — la date du collage, posée par la base, revient avec le lien : l'écran dit son âge
// (avertissements aux 25e et 30e jours).
export type SetAcademiaLinkResult =
  { ok: true; url: string | null; pastedAt: string | null } | { ok: false; error: string };

export async function setAcademiaLivingHereLink(
  projectId: unknown,
  rawUrl: unknown,
): Promise<SetAcademiaLinkResult> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) return { ok: false, error: 'Vous devez être connecté.' };
  if (typeof projectId !== 'string' || (rawUrl !== null && typeof rawUrl !== 'string')) {
    return { ok: false, error: 'Dossier introuvable.' };
  }
  const empty = rawUrl === null || rawUrl.trim() === '';
  const url = empty ? null : academiaLivingHereUrl(rawUrl);
  if (!empty && !url) return { ok: false, error: ACADEMIA_LIVING_HERE_ERROR };
  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('id, status')
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (!project || project.status === 'archived') {
    return { ok: false, error: 'Dossier introuvable.' };
  }
  const { data: written, error } = await supabase
    .from('projects')
    .update({ academia_living_here_url: url })
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .select('id, academia_living_here_pasted_at');
  if (error || !written || written.length !== 1) {
    if (error) await reportServerError('academia:set-link', error);
    return { ok: false, error: 'Le lien n’a pas pu être enregistré. Réessayez.' };
  }
  revalidatePath(`/builder/${projectId}/property`);
  return { ok: true, url, pastedAt: written[0].academia_living_here_pasted_at ?? null };
}
