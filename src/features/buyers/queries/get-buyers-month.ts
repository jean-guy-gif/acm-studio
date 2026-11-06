import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { parisMonthStart, type BuyersMonth } from '@/features/buyers/services/buyers-month';
import type { Database } from '@/lib/supabase/database.types';
import { readPages } from '@/lib/supabase/read-pages';

export type BuyersMonthRead = {
  month: BuyersMonth;
  // Par acquéreur, sa dernière réponse (toutes sélections confondues).
  lastAnswers: Map<string, { at: string; answer: string; reasons: string[] }>;
  failed: boolean;
};

// Mission 135 (§ 6) — les fiches de la liste (sans les archivées) : leurs biens proposés du mois
// (envois notés, M134, et biens des sélections partagées ou présentées ce mois-ci, chacun une
// fois par fiche), leurs réponses du mois (par fiche et par bien), leurs visites demandées du mois
// (non annulées), et la dernière réponse de chacune. Quatre lectures en parallèle (M128 B).
export async function getBuyersMonth(
  supabase: SupabaseClient<Database>,
  agencyId: string,
  buyerIds: string[],
  now: Date,
): Promise<BuyersMonthRead> {
  const empty: BuyersMonthRead = {
    month: { proposed: 0, answers: 0, visits: 0 },
    lastAnswers: new Map(),
    failed: false,
  };
  if (buyerIds.length === 0) return empty;
  const since = parisMonthStart(now).toISOString();
  const [proposals, events, responses, visits] = await Promise.all([
    readPages((from, to) =>
      supabase
        .from('buyer_proposals')
        .select('buyer_id, property_key, sent_at')
        .eq('agency_id', agencyId)
        .in('buyer_id', buyerIds)
        .gte('sent_at', since)
        .order('id')
        .range(from, to),
    ),
    readPages((from, to) =>
      supabase
        .from('buyer_events')
        .select('buyer_id, selection_id')
        .eq('agency_id', agencyId)
        .eq('kind', 'link_shared')
        .in('buyer_id', buyerIds)
        .gte('occurred_at', since)
        .order('id')
        .range(from, to),
    ),
    readPages((from, to) =>
      supabase
        .from('buyer_item_responses')
        .select('buyer_id, selection_item_id, answer, reasons, answered_at')
        .eq('agency_id', agencyId)
        .in('buyer_id', buyerIds)
        .order('id')
        .range(from, to),
    ),
    readPages((from, to) =>
      supabase
        .from('buyer_visit_requests')
        .select('id')
        .eq('agency_id', agencyId)
        .in('buyer_id', buyerIds)
        .is('cancelled_at', null)
        .gte('requested_at', since)
        .order('id')
        .range(from, to),
    ),
  ]);
  if (proposals.error || events.error || responses.error || visits.error) {
    return { ...empty, failed: true };
  }
  // Les biens des sélections partagées ce mois-ci, et des sélections présentées ce mois-ci.
  const [{ data: presented, error: presentedError }] = await Promise.all([
    supabase
      .from('buyer_selections')
      .select('id, buyer_id')
      .eq('agency_id', agencyId)
      .in('buyer_id', buyerIds)
      .gte('presented_at', since),
  ]);
  if (presentedError) return { ...empty, failed: true };
  const selectionBuyer = new Map<string, string>();
  for (const row of events.data)
    if (row.selection_id) selectionBuyer.set(row.selection_id, row.buyer_id);
  for (const row of presented ?? []) selectionBuyer.set(row.id, row.buyer_id);
  const selectionIds = [...selectionBuyer.keys()];
  const items = selectionIds.length
    ? await readPages((from, to) =>
        supabase
          .from('buyer_selection_items')
          .select('id, selection_id, source, reference')
          .eq('agency_id', agencyId)
          .in('selection_id', selectionIds)
          .is('removed_at', null)
          .order('id')
          .range(from, to),
      )
    : {
        data: [] as { id: string; selection_id: string; source: string; reference: string }[],
        error: false,
      };
  if (items.error) return { ...empty, failed: true };

  const proposed = new Set<string>();
  for (const row of proposals.data) proposed.add(`${row.buyer_id}|${row.property_key}`);
  for (const row of items.data) {
    const buyerId = selectionBuyer.get(row.selection_id);
    if (buyerId) proposed.add(`${buyerId}|${row.source}:${row.reference}`);
  }
  const answered = new Set<string>();
  const lastAnswers = new Map<string, { at: string; answer: string; reasons: string[] }>();
  for (const row of responses.data) {
    if (row.answered_at >= since) answered.add(`${row.buyer_id}|${row.selection_item_id}`);
    const known = lastAnswers.get(row.buyer_id);
    if (!known || row.answered_at > known.at) {
      lastAnswers.set(row.buyer_id, {
        at: row.answered_at,
        answer: row.answer,
        reasons: row.reasons ?? [],
      });
    }
  }
  return {
    month: { proposed: proposed.size, answers: answered.size, visits: visits.data.length },
    lastAnswers,
    failed: false,
  };
}
