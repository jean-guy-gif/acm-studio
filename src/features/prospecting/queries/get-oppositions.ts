import 'server-only';

import type { Oppositions } from '@/features/prospecting/services/opposition';
import type { createClient } from '@/lib/supabase/server';

type Client = Awaited<ReturnType<typeof createClient>>;

// Mission 98 — la liste « Ne plus solliciter » de l'agence de l'appelant. La RLS cloisonne déjà
// par agence ; le filtre le redit. Une lecture en échec n'est JAMAIS lue comme une liste vide :
// elle laisserait partir un courrier vers quelqu'un qui a dit non. On s'arrête.
export async function getOppositions(supabase: Client, agencyId: string): Promise<Oppositions> {
  const { data, error } = await supabase
    .from('prospecting_oppositions')
    .select('address_key, requested_at')
    .eq('agency_id', agencyId);
  if (error) {
    throw new Error('La liste « Ne plus solliciter » n’a pas pu être lue.');
  }
  return new Map(data.map((row) => [row.address_key, row.requested_at]));
}
