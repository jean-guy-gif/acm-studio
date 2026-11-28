import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/supabase/database.types';

// Lot C — les mandats signés de l'agence qui ne se proposent plus à un acquéreur : sous compromis,
// vendus ou terminés sans vente (comme ceux qu'une offre acceptée tient, M145 A). Le compromis
// tombé, le mandat se propose de nouveau. Une lecture en échec : null, et aucun mandat n'est
// proposé (M98).
export async function getMandatesBeyondSigned(
  supabase: SupabaseClient<Database>,
  agencyId: string,
): Promise<Set<string> | null> {
  const { data, error } = await supabase
    .from('project_meeting_conclusions')
    .select('project_id, compromise_signed_on, deed_signed_on, mandate_ended_on')
    .eq('agency_id', agencyId)
    .eq('outcome', 'signed');
  if (error || !data) return null;
  return new Set(
    data
      .filter((row) => row.compromise_signed_on || row.deed_signed_on || row.mandate_ended_on)
      .map((row) => row.project_id),
  );
}

// Les mandats qui ne se proposent pas : tenus par une offre acceptée, ou au-delà.
export function heldMandates(underOffer: ReadonlySet<string>, beyond: ReadonlySet<string>) {
  return new Set([...underOffer, ...beyond]);
}
