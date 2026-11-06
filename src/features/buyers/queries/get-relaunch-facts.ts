import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { RelaunchFacts } from '@/features/buyers/services/link-relaunch';
import type { Buyer } from '@/features/buyers/types';
import type { Database } from '@/lib/supabase/database.types';
import { readPages } from '@/lib/supabase/read-pages';

// Mission 135 — ce qu'il faut savoir de la DERNIÈRE sélection de chaque acquéreur pour sa relance :
// quand elle a été envoyée (sa première proposition notée, M134, ou son premier partage noté),
// s'il a répondu (une réponse sur l'un de ses biens, sa présentation, ses créneaux par le lien),
// ses relances, un lien encore valable. Six lectures cadrées sur l'agence, quelle que soit la
// longueur de la liste ; une lecture en échec le dit (M98).
export async function getRelaunchFacts(
  supabase: SupabaseClient<Database>,
  agencyId: string,
  buyers: Pick<Buyer, 'id' | 'status'>[],
): Promise<{ facts: Map<string, RelaunchFacts>; failed: boolean }> {
  const facts = new Map<string, RelaunchFacts>();
  if (buyers.length === 0) return { facts, failed: false };
  const ids = buyers.map((buyer) => buyer.id);
  const selections = await readPages((from, to) =>
    supabase
      .from('buyer_selections')
      .select('id, buyer_id, created_at, presented_at, dossier_availability')
      .eq('agency_id', agencyId)
      .in('buyer_id', ids)
      .order('created_at', { ascending: false })
      .order('id')
      .range(from, to),
  );
  if (selections.error) return { facts, failed: true };
  const latest = new Map<string, (typeof selections.data)[number]>();
  for (const row of selections.data) if (!latest.has(row.buyer_id)) latest.set(row.buyer_id, row);
  const selectionIds = [...latest.values()].map((row) => row.id);
  if (selectionIds.length === 0) return { facts, failed: false };

  const [items, events, links] = await Promise.all([
    readPages((from, to) =>
      supabase
        .from('buyer_selection_items')
        .select('id, selection_id')
        .eq('agency_id', agencyId)
        .in('selection_id', selectionIds)
        .order('id')
        .range(from, to),
    ),
    readPages((from, to) =>
      supabase
        .from('buyer_events')
        .select('selection_id, kind, occurred_at')
        .eq('agency_id', agencyId)
        .in('selection_id', selectionIds)
        .order('id')
        .range(from, to),
    ),
    readPages((from, to) =>
      supabase
        .from('buyer_dossier_links')
        .select('selection_id, expires_at')
        .eq('agency_id', agencyId)
        .in('selection_id', selectionIds)
        .order('id')
        .range(from, to),
    ),
  ]);
  if (items.error || events.error || links.error) return { facts, failed: true };
  const itemIds = items.data.map((row) => row.id);
  const selectionOfItem = new Map(items.data.map((row) => [row.id, row.selection_id]));
  const [responses, proposals] =
    itemIds.length > 0
      ? await Promise.all([
          readPages((from, to) =>
            supabase
              .from('buyer_item_responses')
              .select('selection_item_id')
              .eq('agency_id', agencyId)
              .in('selection_item_id', itemIds)
              .order('id')
              .range(from, to),
          ),
          readPages((from, to) =>
            supabase
              .from('buyer_proposals')
              .select('selection_item_id, sent_at')
              .eq('agency_id', agencyId)
              .in('selection_item_id', itemIds)
              .order('id')
              .range(from, to),
          ),
        ])
      : [
          { data: [] as { selection_item_id: string }[], error: false },
          { data: [] as { selection_item_id: string | null; sent_at: string }[], error: false },
        ];
  if (responses.error || proposals.error) return { facts, failed: true };

  const answered = new Set(
    responses.data
      .map((row) => selectionOfItem.get(row.selection_item_id))
      .filter((id): id is string => id != null),
  );
  const sentAt = new Map<string, string>();
  const keepEarliest = (selectionId: string | undefined, at: string) => {
    if (!selectionId) return;
    const known = sentAt.get(selectionId);
    if (!known || at < known) sentAt.set(selectionId, at);
  };
  for (const row of proposals.data) {
    if (row.selection_item_id)
      keepEarliest(selectionOfItem.get(row.selection_item_id), row.sent_at);
  }
  const relaunches = new Map<string, string[]>();
  for (const row of events.data) {
    if (!row.selection_id) continue;
    if (row.kind === 'link_shared') keepEarliest(row.selection_id, row.occurred_at);
    if (row.kind === 'relaunch') {
      relaunches.set(row.selection_id, [
        ...(relaunches.get(row.selection_id) ?? []),
        row.occurred_at,
      ]);
    }
  }
  const now = new Date().toISOString();
  const active = new Set(
    links.data.filter((row) => row.expires_at > now).map((row) => row.selection_id),
  );
  const statusOf = new Map(buyers.map((buyer) => [buyer.id, buyer.status]));
  for (const [buyerId, selection] of latest) {
    const availability = selection.dossier_availability;
    facts.set(buyerId, {
      buyerId,
      status: statusOf.get(buyerId) ?? 'searching',
      selectionId: selection.id,
      sentAt: sentAt.get(selection.id) ?? null,
      answered:
        answered.has(selection.id) ||
        selection.presented_at != null ||
        (Array.isArray(availability) && availability.length > 0),
      relaunches: (relaunches.get(selection.id) ?? []).sort(),
      linkActive: active.has(selection.id),
    });
  }
  return { facts, failed: false };
}
