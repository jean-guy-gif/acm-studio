'use server';

import { revalidatePath } from 'next/cache';

import {
  buyerLetterOriginsOf,
  removeBuyerLetterPhotos,
} from '@/features/buyer-prospecting/services/remove-buyer-letter-photos';
import { removeCompetitorPhotos } from '@/features/prospecting-file/services/remove-their-photos';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';
import { detachBuyerOrigins } from '@/features/buyer-prospecting/services/detach-buyer-origins';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { deleteLivingHereSheets } from '@/features/living-here/services/delete-sheets';

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
  // Mission 120 B — écartés, ils ne portent plus de carte : les recherches acquéreur gardent la leur.
  await detachBuyerOrigins(createServiceRoleClient(), profile.agency_id, targets);

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
  // Mission 120 B — avant la suppression, les recherches acquéreur passent sur une autre copie ou
  // sur un bien démarché, avec leurs courriers : elles ne partent plus en cascade.
  await detachBuyerOrigins(createServiceRoleClient(), profile.agency_id, targets, {
    beforeDelete: true,
  });
  // Mission 120 — ce qui n'a pas pu se détacher part en cascade : les origines se lisent avant,
  // leurs photos se retirent après.
  const buyerOrigins = await buyerLetterOriginsOf(supabase, profile.agency_id, {
    comparableIds: targets,
  });
  // Mission 142 — leurs fiches « Vivre ici », par leur clé (aucun lien en base).
  await deleteLivingHereSheets(
    profile.agency_id,
    targets.map((id) => `competitor:${id}`),
  );
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
  // Mission 87 — leurs dossiers de prospection sont partis avec eux (cascade) : leurs photos aussi.
  await removeCompetitorPhotos(supabase.storage, profile.agency_id, projectId, targets);
  await removeBuyerLetterPhotos(supabase.storage, profile.agency_id, buyerOrigins);

  revalidatePath(`/builder/${projectId}/comparables`);
  return { ok: true, count: targets.length };
}
