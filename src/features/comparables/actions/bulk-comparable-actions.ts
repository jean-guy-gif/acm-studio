'use server';

import { revalidatePath } from 'next/cache';

import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export type BulkComparableResult = { ok: true; count: number } | { ok: false; error: string };

// MISSION — actions de LOT sur les biens concurrents du dossier. Même modèle que la
// recherche (§8) : le conseiller coche, agit sur le lot d'un clic. Deux actions :
//   · écarter (is_selected → false) : le bien passe dans « Biens écartés », la trace
//     reste ; c'est le geste courant, réversible ;
//   · supprimer : destructif, irréversible, confirmé côté écran par un compte nommé.
//
// On NE touche PAS competitor_decisions : on retire le bien du DOSSIER, on ne réécrit
// pas ce que l'agence a appris. Le périmètre agence/projet est vérifié à chaque appel.

function cleanIds(ids: string[]): string[] {
  return [...new Set((ids ?? []).map((id) => String(id).trim()).filter((id) => id !== ''))];
}

export async function bulkRejectComparables(
  projectId: string,
  ids: string[],
): Promise<BulkComparableResult> {
  const profile = await getProfile();
  if (!profile) {
    return { ok: false, error: 'Vous devez être connecté.' };
  }
  const targets = cleanIds(ids);
  if (targets.length === 0) {
    return { ok: true, count: 0 };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('comparables')
    .update({ is_selected: false })
    .in('id', targets)
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id);
  if (error) {
    return { ok: false, error: 'L’écartement des biens a échoué.' };
  }

  revalidatePath(`/builder/${projectId}/comparables`);
  return { ok: true, count: targets.length };
}

export async function bulkDeleteComparables(
  projectId: string,
  ids: string[],
): Promise<BulkComparableResult> {
  const profile = await getProfile();
  if (!profile) {
    return { ok: false, error: 'Vous devez être connecté.' };
  }
  const targets = cleanIds(ids);
  if (targets.length === 0) {
    return { ok: true, count: 0 };
  }

  const supabase = await createClient();
  // Suppression irréversible du bien dans le dossier. competitor_decisions n'est pas
  // touché : l'apprentissage de l'agence reste intact.
  const { error } = await supabase
    .from('comparables')
    .delete()
    .in('id', targets)
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id);
  if (error) {
    return { ok: false, error: 'La suppression des biens a échoué.' };
  }

  revalidatePath(`/builder/${projectId}/comparables`);
  return { ok: true, count: targets.length };
}
