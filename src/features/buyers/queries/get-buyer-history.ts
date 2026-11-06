import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/supabase/database.types';

export type BuyerHistoryFacts = {
  // Toutes ses sélections, de la plus ancienne à la plus récente.
  selections: { createdAt: string; agencyCount: number; marketCount: number }[];
  // Les courriers préparés depuis sa recherche (M120) : quand, et pour quel bien.
  letters: { at: string; label: string }[];
  // Mission 134 — les biens proposés (« Envoyé »), et sa réponse s'il a répondu par le lien.
  proposals: { at: string; label: string; answer: 'visit' | 'maybe' | 'no' | null }[];
  failed: boolean;
};

// Mission 130 B — « Ce qui s'est passé » : les sélections et les courriers d'un acquéreur, lus dans
// les tables existantes, cadrés sur l'agence. Une lecture en échec le dit (`failed`).
export async function getBuyerHistory(
  supabase: SupabaseClient<Database>,
  agencyId: string,
  buyerId: string,
): Promise<BuyerHistoryFacts> {
  const [selectionsRes, originsRes, proposalsRes] = await Promise.all([
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
    supabase
      .from('buyer_proposals')
      .select('sent_at, label, selection_item_id')
      .eq('agency_id', agencyId)
      .eq('buyer_id', buyerId)
      .order('sent_at', { ascending: false }),
  ]);
  const proposalRows = proposalsRes.data ?? [];
  const proposalItemIds = proposalRows
    .map((row) => row.selection_item_id)
    .filter((id): id is string => id != null);
  const answersRes =
    proposalItemIds.length > 0
      ? await supabase
          .from('buyer_item_responses')
          .select('selection_item_id, answer, answered_at')
          .eq('agency_id', agencyId)
          .eq('answered_during', 'dossier')
          .in('selection_item_id', proposalItemIds)
      : { data: [], error: null };
  const answerOf = new Map<string, { answer: string; at: string }>();
  for (const row of answersRes.data ?? []) {
    const known = answerOf.get(row.selection_item_id);
    if (!known || row.answered_at > known.at) {
      answerOf.set(row.selection_item_id, { answer: row.answer, at: row.answered_at });
    }
  }
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
    proposals: proposalRows.map((row) => {
      const answer = row.selection_item_id ? answerOf.get(row.selection_item_id)?.answer : null;
      return {
        at: row.sent_at,
        label: row.label,
        answer: answer === 'visit' || answer === 'maybe' || answer === 'no' ? answer : null,
      };
    }),
    failed:
      selectionsRes.error != null ||
      originsRes.error != null ||
      proposalsRes.error != null ||
      answersRes.error != null ||
      itemsRes.error != null ||
      labelsRes.error != null,
  };
}
