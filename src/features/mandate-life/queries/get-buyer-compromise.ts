import type { SupabaseClient } from '@supabase/supabase-js';

import { toAmount } from '@/features/mandate-life/services/mandate-row';
import type { Database } from '@/lib/supabase/database.types';

// Lot C (question 17) — le compromis noté pour un acquéreur de l'agence, sur un mandat signé : sa
// fiche le voit, et la vente quand elle est notée, sans que son statut change d'office. Le plus
// récent. Une lecture en échec : « unknown », jamais « aucun » (M98).

export type BuyerCompromise = {
  projectId: string;
  compromiseSignedOn: string;
  deedPlannedOn: string | null;
  deedSignedOn: string | null;
  salePrice: number | null;
};

export async function getBuyerCompromise(
  supabase: SupabaseClient<Database>,
  agencyId: string,
  buyerId: string,
): Promise<BuyerCompromise | null | 'unknown'> {
  const { data, error } = await supabase
    .from('project_meeting_conclusions')
    .select('project_id, compromise_signed_on, deed_planned_on, deed_signed_on, sale_price')
    .eq('agency_id', agencyId)
    .eq('outcome', 'signed')
    .eq('compromise_buyer_id', buyerId)
    .not('compromise_signed_on', 'is', null)
    .order('compromise_signed_on', { ascending: false })
    .limit(1);
  if (error || !data) return 'unknown';
  const row = data[0];
  if (!row?.compromise_signed_on) return null;
  return {
    projectId: row.project_id,
    compromiseSignedOn: row.compromise_signed_on,
    deedPlannedOn: row.deed_planned_on,
    deedSignedOn: row.deed_signed_on,
    salePrice: toAmount(row.sale_price),
  };
}

export const COMPROMISE_HOLDS_BUYER =
  'Un compromis est noté pour lui : il reste dans la vente. Si le compromis est tombé, notez-le d’abord sur le dossier du vendeur (« Le compromis est tombé »).';
