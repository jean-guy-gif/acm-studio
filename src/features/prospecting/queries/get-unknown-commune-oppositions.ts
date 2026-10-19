import 'server-only';

import { createClient } from '@/lib/supabase/server';

export type UnknownCommuneOpposition = {
  id: string;
  // La clé gardée (M102 : l'adresse tapée ne l'est pas) — elle se lit comme une adresse.
  addressKey: string;
  communeTyped: string | null;
  requestedAt: string;
  author: string | null;
};

// Mission 105 — les oppositions de l'agence dont la commune tapée est restée inconnue après la
// revérification de la nuit : le manager les voit. Mission 107 — avec l'adresse (sa clé), qui l'a
// inscrite et quand, pour la corriger. Écran manager seulement, jamais côté vendeur.
export async function getUnknownCommuneOppositions(
  agencyId: string,
): Promise<UnknownCommuneOpposition[]> {
  const supabase = await createClient();
  const [{ data }, { data: profiles }] = await Promise.all([
    supabase
      .from('prospecting_oppositions')
      .select('id, address_key, commune_typed, requested_at, created_by')
      .eq('agency_id', agencyId)
      .eq('commune_unknown', true)
      .order('requested_at', { ascending: true }),
    supabase.from('profiles').select('id, first_name, last_name').eq('agency_id', agencyId),
  ]);
  const names = new Map(
    (profiles ?? []).map((row) => [row.id, `${row.first_name} ${row.last_name}`.trim()]),
  );
  return (data ?? [])
    .filter((row) => row.address_key != null)
    .map((row) => ({
      id: row.id,
      addressKey: row.address_key as string,
      communeTyped: row.commune_typed,
      requestedAt: row.requested_at,
      author: row.created_by ? (names.get(row.created_by) ?? null) : null,
    }));
}
