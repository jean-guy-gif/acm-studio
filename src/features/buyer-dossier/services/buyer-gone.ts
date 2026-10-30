import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/supabase/database.types';

// Mission 120 B (reprise R5 de la partie A) — la page du dossier acquéreur restée ouverte sur une
// fiche qui n'existe plus (supprimée par une remise à zéro de la démo, ou archivée) : le geste ne
// dit pas « Pas de dossier sans sélection retenue », il dit que la fiche n'existe plus et ramène
// à la liste.
export const BUYER_GONE_MESSAGE = 'Cette fiche n’existe plus.';
export const BUYERS_LIST_HREF = '/acquereurs';

// Vrai seulement quand la base répond que la fiche n'est plus là : une lecture en échec ne dit
// jamais « elle n'existe plus ».
export async function buyerIsGone(
  client: SupabaseClient<Database>,
  buyerId: string,
  agencyId: string,
): Promise<boolean> {
  try {
    const { data, error } = await client
      .from('buyers')
      .select('id')
      .eq('id', buyerId)
      .eq('agency_id', agencyId)
      .is('archived_at', null)
      .maybeSingle();
    return !error && !data;
  } catch {
    return false;
  }
}
