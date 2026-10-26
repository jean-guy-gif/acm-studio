import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { NO_PROGRESS, type BuyerProgressFacts } from '@/features/buyers/services/buyer-progress';
import type { Database } from '@/lib/supabase/database.types';

// Essai de Jean-Guy (26/10) — les faits des trois étapes de chaque fiche (`buyerSteps`), cadrés
// sur l'agence : la sélection la plus récente, son nombre de biens, un lien valable du dossier
// acquéreur pour elle, et sa réponse depuis le lien. Quatre lectures, quelle que soit la longueur
// de la liste. Une lecture en échec vaut « pas encore fait » : seul un bouton change de libellé.
export async function getBuyersProgress(
  supabase: SupabaseClient<Database>,
  agencyId: string,
  buyerIds: string[],
): Promise<Map<string, BuyerProgressFacts>> {
  const progress = new Map<string, BuyerProgressFacts>(
    buyerIds.map((id) => [id, { ...NO_PROGRESS }]),
  );
  if (buyerIds.length === 0) return progress;
  const { data: selections } = await supabase
    .from('buyer_selections')
    .select('id, buyer_id, presented_at, created_at')
    .eq('agency_id', agencyId)
    .in('buyer_id', buyerIds)
    .order('created_at', { ascending: false });
  const latest = new Map<string, { id: string; presentedAt: string | null }>();
  for (const row of selections ?? []) {
    if (!latest.has(row.buyer_id)) {
      latest.set(row.buyer_id, { id: row.id, presentedAt: row.presented_at });
    }
  }
  const selectionIds = [...latest.values()].map((selection) => selection.id);
  if (selectionIds.length === 0) return progress;
  const [{ data: items }, { data: links }] = await Promise.all([
    supabase
      .from('buyer_selection_items')
      .select('id, selection_id, removed_at')
      .eq('agency_id', agencyId)
      .in('selection_id', selectionIds),
    supabase
      .from('buyer_dossier_links')
      .select('selection_id')
      .eq('agency_id', agencyId)
      .in('selection_id', selectionIds)
      .gt('expires_at', new Date().toISOString()),
  ]);
  const itemIds = (items ?? []).map((item) => item.id);
  const { data: responses } =
    itemIds.length > 0
      ? await supabase
          .from('buyer_item_responses')
          .select('selection_item_id')
          .eq('agency_id', agencyId)
          .eq('answered_during', 'dossier')
          .in('selection_item_id', itemIds)
      : { data: [] };
  const selectionOfItem = new Map((items ?? []).map((item) => [item.id, item.selection_id]));
  const answered = new Set(
    (responses ?? []).map((row) => selectionOfItem.get(row.selection_item_id)),
  );
  const linked = new Set((links ?? []).map((row) => row.selection_id));
  for (const [buyerId, selection] of latest) {
    progress.set(buyerId, {
      selectionCount: (items ?? []).filter(
        (item) => item.selection_id === selection.id && item.removed_at == null,
      ).length,
      presentedAt: selection.presentedAt,
      linkCreated: linked.has(selection.id),
      answeredOnLink: answered.has(selection.id),
    });
  }
  return progress;
}
