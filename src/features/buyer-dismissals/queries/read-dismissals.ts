import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/supabase/database.types';
import { readPages } from '@/lib/supabase/read-pages';

// Mission 139 — les biens écartés pour les acquéreurs de l'agence : clé du bien → ses acquéreurs.
// Une lecture en échec rend null : jamais lue comme « rien d'écarté », un bien écarté reviendrait
// (M98).
export async function readDismissals(
  supabase: SupabaseClient<Database>,
  agencyId: string,
): Promise<Map<string, Set<string>> | null> {
  const { data, error } = await readPages((from, to) =>
    supabase
      .from('buyer_dismissals')
      .select('buyer_id, property_key')
      .eq('agency_id', agencyId)
      .order('id')
      .range(from, to),
  );
  if (error) return null;
  const byKey = new Map<string, Set<string>>();
  for (const row of data) {
    const buyers = byKey.get(row.property_key) ?? new Set<string>();
    buyers.add(row.buyer_id);
    byKey.set(row.property_key, buyers);
  }
  return byKey;
}
