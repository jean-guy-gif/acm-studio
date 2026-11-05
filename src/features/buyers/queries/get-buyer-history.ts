import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/supabase/database.types';

export type BuyerHistoryFacts = {
  // Toutes ses sélections, de la plus ancienne à la plus récente.
  selections: { createdAt: string; agencyCount: number; marketCount: number }[];
  // Les courriers préparés depuis sa recherche (M120) : quand, et pour quel bien.
  letters: { at: string; label: string }[];
  failed: boolean;
};

// Mission 130 B — « Ce qui s'est passé » : les sélections et les courriers d'un acquéreur, lus dans
// les tables existantes, cadrés sur l'agence. Une lecture en échec le dit (`failed`).
export async function getBuyerHistory(
  supabase: SupabaseClient<Database>,
  agencyId: string,
  buyerId: string,
): Promise<BuyerHistoryFacts> {
  const [selectionsRes, originsRes] = await Promise.all([
    supabase
      .from('buyer_selections')
      .select('id, created_at')
      .eq('agency_id', agencyId)
      .eq('buyer_id', buyerId)
      .order('created_at', { ascending: true }),
    supabase
      .from('buyer_prospect_origins')
      .select('created_at, selection_item_id')
      .eq('agency_id', agencyId)
      .eq('buyer_id', buyerId),
  ]);
  const selections = selectionsRes.data ?? [];
  const origins = originsRes.data ?? [];
  const itemIds = origins.map((row) => row.selection_item_id).filter(Boolean) as string[];
  const [itemsRes, labelsRes] = await Promise.all([
    selections.length > 0
      ? supabase
          .from('buyer_selection_items')
          .select('selection_id, source')
          .eq('agency_id', agencyId)
          .in(
            'selection_id',
            selections.map((row) => row.id),
          )
      : Promise.resolve({ data: [], error: null }),
    itemIds.length > 0
      ? supabase
          .from('buyer_selection_items')
          .select('id, label')
          .eq('agency_id', agencyId)
          .in('id', itemIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const items = itemsRes.data ?? [];
  const labels = new Map((labelsRes.data ?? []).map((row) => [row.id, row.label]));
  return {
    selections: selections.map((selection) => {
      const own = items.filter((item) => item.selection_id === selection.id);
      const agencyCount = own.filter((item) => item.source === 'project').length;
      return {
        createdAt: selection.created_at,
        agencyCount,
        marketCount: own.length - agencyCount,
      };
    }),
    letters: origins.map((row) => ({
      at: row.created_at,
      label: (row.selection_item_id && labels.get(row.selection_item_id)) || 'un bien',
    })),
    failed:
      selectionsRes.error != null ||
      originsRes.error != null ||
      itemsRes.error != null ||
      labelsRes.error != null,
  };
}
