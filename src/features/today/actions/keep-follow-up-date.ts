'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { getPropertyBuyers } from '@/features/buyers/queries/get-property-buyers';
import { getProject } from '@/features/projects/queries/get-project';
import { getProfile } from '@/lib/auth/get-profile';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type KeepFollowUpDateResult = { ok: true } | { ok: false; error: string };

const KEEP_DATE_FAILED = 'La date n’a pas pu être gardée. Réessayez.';

// Mission 145 (partie B) — « Garder la date » sur « Relancer plus tôt ? » : la ligne se cache pour
// toute l'agence jusqu'à la date de relance prévue ; un acquéreur prêt de plus, ou une nouvelle
// relance, la fait revenir (décisions de Jean-Guy, 07/11). Le dossier est relu dans l'agence de
// l'appelant (RLS) : conclu « à relancer », ni archivé ni d'exemple. Le nombre d'acquéreurs prêts
// est recalculé ici, jamais reçu du navigateur ; le moment est celui du serveur. La conclusion ne
// s'écrit que par la clé de service, après ce garde (le navigateur n'y écrit rien, M53).
export async function keepFollowUpDate(projectId: unknown): Promise<KeepFollowUpDateResult> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) return { ok: false, error: 'Vous devez être connecté.' };
  if (!z.uuid().safeParse(projectId).success) return { ok: false, error: KEEP_DATE_FAILED };
  const id = projectId as string;
  const project = await getProject(id);
  if (!project || project.status !== 'meeting_completed' || project.is_example) {
    return { ok: false, error: 'Dossier introuvable dans votre Suivi.' };
  }
  const client = createServiceRoleClient();
  const { data: conclusion, error: readError } = await client
    .from('project_meeting_conclusions')
    .select('outcome')
    .eq('project_id', id)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (readError) return { ok: false, error: KEEP_DATE_FAILED };
  if (conclusion?.outcome !== 'follow_up') {
    return { ok: false, error: 'Ce vendeur n’est plus à relancer.' };
  }
  const buyers = await getPropertyBuyers(profile.agency_id, id, new Date());
  if (!buyers) return { ok: false, error: KEEP_DATE_FAILED };
  const ready = buyers.ready.length;
  if (ready < 1) return { ok: false, error: 'Plus aucun acquéreur prêt ne correspond à ce bien.' };
  const { error } = await client
    .from('project_meeting_conclusions')
    .update({
      early_follow_up_kept_at: new Date().toISOString(),
      early_follow_up_kept_ready: ready,
    })
    .eq('project_id', id)
    .eq('agency_id', profile.agency_id);
  if (error) return { ok: false, error: KEEP_DATE_FAILED };
  revalidatePath('/aujourdhui');
  return { ok: true };
}
