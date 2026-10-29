import type { SupabaseClient } from '@supabase/supabase-js';

import {
  emptyStorageFolder,
  type PhotoStorage,
} from '@/features/prospecting-file/services/remove-their-photos';
import type { Database } from '@/lib/supabase/database.types';

// Mission 120 — quand une origine « Recherche acquéreur » part en cascade (son concurrent, sa
// fiche ou son bien retenu supprimé), la photo copiée de son courrier doit partir aussi du
// stockage (M93 : supprimer un concurrent retire ses photos de prospection). Les origines se
// lisent AVANT la suppression ; leurs dossiers se vident APRÈS, lus sur place, sous le dossier de
// l'agence de l'appelant : rien d'une autre agence ne peut être visé.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const buyerLetterFolder = (agencyId: string, originId: string): string =>
  `${agencyId}/buyer-prospecting/${originId}`;

// Les origines rattachées à ces concurrents, ou à ces fiches, dans l'agence : à lire avant la
// suppression, la cascade les emporte.
export async function buyerLetterOriginsOf(
  supabase: SupabaseClient<Database>,
  agencyId: string,
  by: { comparableIds: string[] } | { buyerIds: string[] },
): Promise<string[]> {
  const column = 'comparableIds' in by ? 'comparable_id' : 'buyer_id';
  const values = ('comparableIds' in by ? by.comparableIds : by.buyerIds).filter((id) =>
    UUID.test(id),
  );
  if (values.length === 0) {
    return [];
  }
  const { data } = await supabase
    .from('buyer_prospect_origins')
    .select('id')
    .eq('agency_id', agencyId)
    .in(column, values);
  return (data ?? []).map((row) => row.id);
}

// Les photos des courriers de ces origines. Un identifiant qui n'en est pas un est ignoré.
export async function removeBuyerLetterPhotos(
  storage: PhotoStorage,
  agencyId: string,
  originIds: string[],
): Promise<number> {
  let removed = 0;
  for (const originId of new Set(originIds.filter((id) => UUID.test(id)))) {
    removed += await emptyStorageFolder(storage, buyerLetterFolder(agencyId, originId));
  }
  return removed;
}
