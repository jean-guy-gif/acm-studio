import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import {
  ruledOutOf,
  seenItemKey,
  seenProperties,
  type SeenProperties,
} from '@/features/buyers/services/seen-properties';
import type { Database } from '@/lib/supabase/database.types';
import { readPages } from '@/lib/supabase/read-pages';

// Lancement, mission 3 — ce que chaque acquéreur de l'agence a déjà vu (envoyé, visité, refusé,
// écarté ; la règle : `seenProperties`), lu en une vague, cadré sur l'agence ; `buyerId` : pour un
// seul acquéreur. Une lecture en échec rend null : jamais lue comme « rien de vu », un bien refusé
// reviendrait (M98).
export type SeenRead = {
  seen: SeenProperties;
  // La clé d'un bien de sélection, celle de la boucle.
  keyOf: (item: { source: string; reference: string }) => string | null;
};

export async function readSeenProperties(
  supabase: SupabaseClient<Database>,
  agencyId: string,
  buyerId?: string,
): Promise<SeenRead | null> {
  const [dismissals, proposals, selections, shares, responses, visits, items] = await Promise.all([
    readPages((from, to) => {
      const query = supabase
        .from('buyer_dismissals')
        .select('buyer_id, property_key')
        .eq('agency_id', agencyId);
      return (buyerId ? query.eq('buyer_id', buyerId) : query).order('id').range(from, to);
    }),
    readPages((from, to) => {
      const query = supabase
        .from('buyer_proposals')
        .select('buyer_id, property_key, sent_at, selection_item_id')
        .eq('agency_id', agencyId);
      return (buyerId ? query.eq('buyer_id', buyerId) : query).order('id').range(from, to);
    }),
    readPages((from, to) => {
      const query = supabase
        .from('buyer_selections')
        .select('id, buyer_id, presented_at')
        .eq('agency_id', agencyId);
      return (buyerId ? query.eq('buyer_id', buyerId) : query).order('id').range(from, to);
    }),
    readPages((from, to) => {
      const query = supabase
        .from('buyer_events')
        .select('selection_id, occurred_at')
        .eq('agency_id', agencyId)
        .eq('kind', 'link_shared');
      return (buyerId ? query.eq('buyer_id', buyerId) : query).order('id').range(from, to);
    }),
    readPages((from, to) => {
      const query = supabase
        .from('buyer_item_responses')
        .select('selection_item_id, answer, answered_at')
        .eq('agency_id', agencyId);
      return (buyerId ? query.eq('buyer_id', buyerId) : query).order('id').range(from, to);
    }),
    readPages((from, to) => {
      const query = supabase
        .from('buyer_visit_requests')
        .select('buyer_selection_item_id, requested_at, visited_at, opinion, outcome')
        .eq('agency_id', agencyId)
        .is('cancelled_at', null);
      return (buyerId ? query.eq('buyer_id', buyerId) : query).order('id').range(from, to);
    }),
    // Les biens de sélection n'ont pas d'acquéreur : lus pour l'agence, rattachés par la sélection.
    readPages((from, to) =>
      supabase
        .from('buyer_selection_items')
        .select('id, selection_id, source, reference, removed_at')
        .eq('agency_id', agencyId)
        .order('id')
        .range(from, to),
    ),
  ]);
  if (
    dismissals.error ||
    proposals.error ||
    selections.error ||
    shares.error ||
    responses.error ||
    visits.error ||
    items.error
  ) {
    return null;
  }
  // L'annonce des concurrents d'une sélection : un même bien a une seule clé, d'où qu'il vienne.
  // Lue seulement s'il y en a ; jamais pour proposer un concurrent (M145).
  const comparables = items.data.some((row) => row.source === 'competitor')
    ? await readPages((from, to) =>
        supabase
          .from('comparables')
          .select('id, listing_url')
          .eq('agency_id', agencyId)
          .not('listing_url', 'is', null)
          .order('id')
          .range(from, to),
      )
    : { data: [], error: false };
  if (comparables.error) return null;
  const competitorUrls = new Map(comparables.data.map((row) => [row.id, row.listing_url]));
  return {
    seen: seenProperties({
      dismissals: dismissals.data,
      proposals: proposals.data,
      selections: selections.data,
      shares: shares.data,
      items: items.data,
      responses: responses.data,
      visits: visits.data,
      competitorUrls,
    }),
    keyOf: (item) => seenItemKey(item, competitorUrls),
  };
}

// Écarté par le conseiller ou refusé par l'acquéreur : clé du bien → ses acquéreurs, pour la règle
// « ce bien n'est plus pour lui » (`withoutDismissed`, M139). `null` : une lecture a échoué.
export async function readRuledOut(
  supabase: SupabaseClient<Database>,
  agencyId: string,
): Promise<Map<string, Set<string>> | null> {
  const read = await readSeenProperties(supabase, agencyId);
  return read ? ruledOutOf(read.seen) : null;
}
