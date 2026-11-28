import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/supabase/database.types';

// Lot C (question 17) — les acquéreurs que « Noter le compromis » peut nommer : ceux de l'agence
// qui ont visité ce mandat (une visite faite, non annulée, sur une fiche non archivée), la visite
// la plus récente d'abord ; et le nom de l'acquéreur déjà noté au compromis. Une lecture en échec :
// null, jamais « personne » (M98).

export type MandateVisitor = { buyerId: string; name: string; visitedAt: string };

type Client = SupabaseClient<Database>;

export async function getMandateVisitors(
  supabase: Client,
  agencyId: string,
  projectId: string,
): Promise<MandateVisitor[] | null> {
  const { data, error } = await supabase
    .from('buyer_visit_requests')
    .select(
      'buyer_id, visited_at, buyer_selection_items!inner(source, reference), buyers!inner(name, archived_at)',
    )
    .eq('agency_id', agencyId)
    .eq('buyer_selection_items.source', 'project')
    .eq('buyer_selection_items.reference', projectId)
    .is('cancelled_at', null)
    .not('visited_at', 'is', null)
    .is('buyers.archived_at', null)
    .order('visited_at', { ascending: false });
  if (error || !data) return null;
  const seen = new Map<string, MandateVisitor>();
  for (const row of data) {
    const buyer = Array.isArray(row.buyers) ? row.buyers[0] : row.buyers;
    if (!row.visited_at || !buyer?.name || seen.has(row.buyer_id)) continue;
    seen.set(row.buyer_id, { buyerId: row.buyer_id, name: buyer.name, visitedAt: row.visited_at });
  }
  return [...seen.values()];
}

export async function getBuyerName(
  supabase: Client,
  agencyId: string,
  buyerId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('buyers')
    .select('name')
    .eq('id', buyerId)
    .eq('agency_id', agencyId)
    .maybeSingle();
  if (error || !data) return null;
  return data.name;
}
