import 'server-only';

import { toItemResponse } from '@/features/buyer-deck/services/response-row';
import type { ItemResponse } from '@/features/buyer-deck/types';
import { createClient } from '@/lib/supabase/server';

export type OtherAnswerLine = ItemResponse & {
  buyerId: string;
  buyerName: string;
  itemLabel: string;
};

// Mission 122 — « Peut-être » et « Pas pour moi », lus sur Visites : les réponses de l'agence qui
// ne sont pas une visite, la dernière par bien, fiches archivées exclues (la RLS cloisonne).
export async function getOtherAnswers(): Promise<OtherAnswerLine[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('buyer_item_responses')
    .select('*, buyers!inner(name, archived_at), buyer_selection_items!inner(label)')
    .order('answered_at', { ascending: false });
  const latest = new Map<string, OtherAnswerLine>();
  for (const row of data ?? []) {
    const buyer = row.buyers as unknown as { name: string; archived_at: string | null };
    if (buyer.archived_at != null || latest.has(row.selection_item_id)) continue;
    latest.set(row.selection_item_id, {
      ...toItemResponse(row),
      buyerId: row.buyer_id,
      buyerName: buyer.name,
      itemLabel: (row.buyer_selection_items as unknown as { label: string }).label,
    });
  }
  return [...latest.values()].filter((line) => line.answer !== 'visit');
}
