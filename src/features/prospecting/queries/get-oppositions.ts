import 'server-only';

import { buildOppositions, type Oppositions } from '@/features/prospecting/services/opposition';
import type { createClient } from '@/lib/supabase/server';

type Client = Awaited<ReturnType<typeof createClient>>;

// Mission 108 — la base ne rend pas plus de 1 000 lignes par lecture : la liste se lit par pages,
// jusqu'à la dernière. Les clés sont relues avec la normalisation courante (M102) : la
// vérification se fait donc ici, sur la liste ENTIÈRE, jamais sur une première page.
export const OPPOSITIONS_PAGE_SIZE = 1000;

// Mission 98 — la liste « Ne plus solliciter » de l'agence de l'appelant. La RLS cloisonne déjà
// par agence ; le filtre le redit. Une lecture en échec n'est JAMAIS lue comme une liste vide :
// elle laisserait partir un courrier vers quelqu'un qui a dit non. On s'arrête.
export async function getOppositions(supabase: Client, agencyId: string): Promise<Oppositions> {
  const rows: { address_key: string | null; listing_key: string | null; requested_at: string }[] =
    [];
  for (let from = 0; ; from += OPPOSITIONS_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('prospecting_oppositions')
      .select('address_key, listing_key, requested_at')
      .eq('agency_id', agencyId)
      .order('id', { ascending: true })
      .range(from, from + OPPOSITIONS_PAGE_SIZE - 1);
    if (error || !data) {
      throw new Error('La liste «\u00a0Ne plus solliciter\u00a0» n’a pas pu être lue.');
    }
    rows.push(...data);
    if (data.length < OPPOSITIONS_PAGE_SIZE) {
      return buildOppositions(rows);
    }
  }
}
