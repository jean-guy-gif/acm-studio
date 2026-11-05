import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { NO_PROGRESS, type BuyerProgressFacts } from '@/features/buyers/services/buyer-progress';
import type { Database } from '@/lib/supabase/database.types';

// Essai de Jean-Guy (26/10) ; Mission 130 B — les faits du parcours de chaque fiche (`buyerJourney`), cadrés
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
  // Ses demandes de visite, toutes sélections confondues : à organiser, et faites (M130).
  const { data: visits, error: visitsError } = await supabase
    .from('buyer_visit_requests')
    .select('buyer_id, visited_at')
    .eq('agency_id', agencyId)
    .in('buyer_id', buyerIds)
    .is('cancelled_at', null);
  for (const row of visits ?? []) {
    const facts = progress.get(row.buyer_id);
    if (!facts) continue;
    if (row.visited_at) facts.visitsDone = (facts.visitsDone ?? 0) + 1;
    else facts.visitsToOrganize += 1;
  }
  const { data: selections, error: selectionsError } = await supabase
    .from('buyer_selections')
    .select('id, buyer_id, presented_at, created_at')
    .eq('agency_id', agencyId)
    .in('buyer_id', buyerIds)
    .order('created_at', { ascending: false });
  const latest = new Map<string, { id: string; presentedAt: string | null; createdAt: string }>();
  for (const row of selections ?? []) {
    if (!latest.has(row.buyer_id)) {
      latest.set(row.buyer_id, {
        id: row.id,
        presentedAt: row.presented_at,
        createdAt: row.created_at,
      });
    }
  }
  // Une lecture en échec n'est jamais « rien de fait » (M98) : chaque fiche le porte.
  const markUnread = () => {
    for (const facts of progress.values()) facts.unread = true;
    return progress;
  };
  if (visitsError || selectionsError) return markUnread();
  const selectionIds = [...latest.values()].map((selection) => selection.id);
  if (selectionIds.length === 0) return progress;
  const [{ data: items, error: itemsError }, { data: links, error: linksError }] =
    await Promise.all([
      supabase
        .from('buyer_selection_items')
        .select('id, selection_id, removed_at')
        .eq('agency_id', agencyId)
        .in('selection_id', selectionIds),
      supabase
        .from('buyer_dossier_links')
        .select('selection_id, created_at')
        .eq('agency_id', agencyId)
        .in('selection_id', selectionIds)
        .gt('expires_at', new Date().toISOString()),
    ]);
  const itemIds = (items ?? []).map((item) => item.id);
  if (itemsError || linksError) return markUnread();
  const { data: responses, error: responsesError } =
    itemIds.length > 0
      ? await supabase
          .from('buyer_item_responses')
          .select('selection_item_id, answered_at')
          .eq('agency_id', agencyId)
          .eq('answered_during', 'dossier')
          .in('selection_item_id', itemIds)
      : { data: [], error: null };
  if (responsesError) return markUnread();
  const selectionOfItem = new Map((items ?? []).map((item) => [item.id, item.selection_id]));
  // La plus récente réponse par le lien, et le plus récent lien, par sélection.
  const answered = new Map<string, string>();
  for (const row of responses ?? []) {
    const selectionId = selectionOfItem.get(row.selection_item_id);
    if (!selectionId) continue;
    const known = answered.get(selectionId);
    if (!known || row.answered_at > known) answered.set(selectionId, row.answered_at);
  }
  const linked = new Map<string, string>();
  for (const row of links ?? []) {
    const known = linked.get(row.selection_id);
    if (!known || row.created_at > known) linked.set(row.selection_id, row.created_at);
  }
  for (const [buyerId, selection] of latest) {
    progress.set(buyerId, {
      selectionCount: (items ?? []).filter(
        (item) => item.selection_id === selection.id && item.removed_at == null,
      ).length,
      presentedAt: selection.presentedAt,
      linkCreated: linked.has(selection.id),
      answeredOnLink: answered.has(selection.id),
      visitsToOrganize: progress.get(buyerId)?.visitsToOrganize ?? 0,
      visitsDone: progress.get(buyerId)?.visitsDone ?? 0,
      selectionAt: selection.createdAt,
      linkAt: linked.get(selection.id) ?? null,
      answeredAt: answered.get(selection.id) ?? null,
    });
  }
  return progress;
}
