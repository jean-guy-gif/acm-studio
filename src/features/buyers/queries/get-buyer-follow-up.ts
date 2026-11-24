import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { FollowUpRows } from '@/features/buyers/services/buyer-follow-up';
import { toNumber } from '@/lib/format/to-number';
import type { Database } from '@/lib/supabase/database.types';
import { readPages } from '@/lib/supabase/read-pages';

// Lancement, mission 6 — ce qu'il faut pour « Son suivi » (`buyerFollowUp`), pour UN acquéreur,
// cadré sur son agence : ses sélections et leurs biens, les partages notés de leur lien, ses envois
// notés, ses réponses, ce que le conseiller a écarté pour lui. Ses visites viennent de la page, qui
// les lit déjà. Une lecture en échec rend null : jamais lue comme « rien d'envoyé » (M98).
export async function getBuyerFollowUpRows(
  supabase: SupabaseClient<Database>,
  agencyId: string,
  buyerId: string,
): Promise<Omit<FollowUpRows, 'visits'> | null> {
  const [selections, shares, proposals, responses, dismissals] = await Promise.all([
    readPages((from, to) =>
      supabase
        .from('buyer_selections')
        .select('id, presented_at')
        .eq('agency_id', agencyId)
        .eq('buyer_id', buyerId)
        .order('id')
        .range(from, to),
    ),
    readPages((from, to) =>
      supabase
        .from('buyer_events')
        .select('selection_id, occurred_at')
        .eq('agency_id', agencyId)
        .eq('buyer_id', buyerId)
        .eq('kind', 'link_shared')
        .order('id')
        .range(from, to),
    ),
    readPages((from, to) =>
      supabase
        .from('buyer_proposals')
        .select('property_key, label, sent_at, selection_item_id')
        .eq('agency_id', agencyId)
        .eq('buyer_id', buyerId)
        .order('id')
        .range(from, to),
    ),
    readPages((from, to) =>
      supabase
        .from('buyer_item_responses')
        .select('selection_item_id, answer, reasons, answered_at, answered_during')
        .eq('agency_id', agencyId)
        .eq('buyer_id', buyerId)
        .order('id')
        .range(from, to),
    ),
    readPages((from, to) =>
      supabase
        .from('buyer_dismissals')
        .select('property_key, label, reason, dismissed_at')
        .eq('agency_id', agencyId)
        .eq('buyer_id', buyerId)
        .order('id')
        .range(from, to),
    ),
  ]);
  if (selections.error || shares.error || proposals.error || responses.error || dismissals.error) {
    return null;
  }
  const selectionIds = selections.data.map((row) => row.id);
  const items =
    selectionIds.length === 0
      ? { data: [], error: false }
      : await readPages((from, to) =>
          supabase
            .from('buyer_selection_items')
            .select('id, selection_id, source, reference, label, listed_price, removed_at')
            .eq('agency_id', agencyId)
            .in('selection_id', selectionIds)
            .order('id')
            .range(from, to),
        );
  if (items.error) return null;
  // L'annonce d'un concurrent, pour sa clé d'annonce : lue seulement s'il y en a.
  const competitorIds = [
    ...new Set(items.data.filter((row) => row.source === 'competitor').map((row) => row.reference)),
  ];
  const comparables =
    competitorIds.length === 0
      ? { data: [], error: null }
      : await supabase
          .from('comparables')
          .select('id, listing_url')
          .eq('agency_id', agencyId)
          .in('id', competitorIds);
  if (comparables.error) return null;
  return {
    selections: selections.data,
    shares: shares.data,
    proposals: proposals.data,
    responses: responses.data,
    dismissals: dismissals.data,
    // Une colonne `numeric` revient en texte de l'API (M134).
    items: items.data.map((row) => ({ ...row, listed_price: toNumber(row.listed_price) })),
    competitorUrls: new Map((comparables.data ?? []).map((row) => [row.id, row.listing_url])),
  };
}
