import 'server-only';

import { createClient } from '@/lib/supabase/server';

// Mission 105 — les oppositions de l'agence dont la commune tapée est restée inconnue après la
// revérification de la nuit : le manager les voit. Seule la commune tapée sort d'ici, jamais la
// clé (qui dit l'adresse).
export async function getUnknownCommuneOppositions(agencyId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('prospecting_oppositions')
    .select('commune_typed')
    .eq('agency_id', agencyId)
    .eq('commune_unknown', true);
  return (data ?? []).map((row) => row.commune_typed ?? '—');
}
