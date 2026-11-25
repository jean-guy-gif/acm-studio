import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { watchKey, watchPropertyKey } from '@/features/buyer-watch/services/watch-finds';
import type { Database } from '@/lib/supabase/database.types';
import { readPages } from '@/lib/supabase/read-pages';

// Mission 136 — ce que la veille ne ramène pas : pour chaque acquéreur, les biens de ses sélections
// (refus compris : une réponse tient à un bien de sélection, M122), ceux qui lui ont été proposés
// (M134) ; pour toute l'agence, les annonces qu'elle connaît déjà (un concurrent, un bien démarché),
// que la boucle de la 134 appelle. Par identité d'annonce (M47). Une lecture en échec arrête tout :
// une liste coupée referait remonter un bien déjà vu (M98).
export async function readBuyerKnownKeys(
  admin: SupabaseClient<Database>,
  agencyId: string,
  buyerIds: string[],
): Promise<{ ok: true; keys: (buyerId: string) => Set<string> } | { ok: false }> {
  const [selections, proposals, dismissals, comparables, prospects] = await Promise.all([
    readPages((from, to) =>
      admin
        .from('buyer_selections')
        .select('id, buyer_id')
        .eq('agency_id', agencyId)
        .in('buyer_id', buyerIds)
        .range(from, to),
    ),
    readPages((from, to) =>
      admin
        .from('buyer_proposals')
        .select('buyer_id, property_key')
        .eq('agency_id', agencyId)
        .in('buyer_id', buyerIds)
        .range(from, to),
    ),
    // Mission 139 — les biens écartés pour lui par le conseiller ne reviennent plus.
    readPages((from, to) =>
      admin
        .from('buyer_dismissals')
        .select('buyer_id, property_key')
        .eq('agency_id', agencyId)
        .in('buyer_id', buyerIds)
        .range(from, to),
    ),
    readPages((from, to) =>
      admin
        .from('comparables')
        .select('id, listing_url')
        .eq('agency_id', agencyId)
        .not('listing_url', 'is', null)
        .range(from, to),
    ),
    readPages((from, to) =>
      admin
        .from('buyer_prospects')
        .select('listing_key, listing_url')
        .eq('agency_id', agencyId)
        .range(from, to),
    ),
  ]);
  if (
    selections.error ||
    proposals.error ||
    dismissals.error ||
    comparables.error ||
    prospects.error
  ) {
    return { ok: false };
  }
  const selectionBuyer = new Map(selections.data.map((row) => [row.id, row.buyer_id]));
  const items =
    selectionBuyer.size === 0
      ? { data: [], error: false }
      : await readPages((from, to) =>
          admin
            .from('buyer_selection_items')
            .select('selection_id, source, reference, property_id:snapshot->>key')
            .eq('agency_id', agencyId)
            .in('selection_id', [...selectionBuyer.keys()])
            .range(from, to),
        );
  if (items.error) return { ok: false };

  const comparableUrl = new Map(comparables.data.map((row) => [row.id, row.listing_url ?? '']));
  const agencyKeys = new Set<string>();
  for (const row of comparables.data)
    if (row.listing_url) agencyKeys.add(watchKey(row.listing_url));
  for (const row of prospects.data) {
    agencyKeys.add(row.listing_key);
    if (row.listing_url) agencyKeys.add(watchKey(row.listing_url));
  }
  const perBuyer = new Map<string, Set<string>>();
  const add = (buyerId: string | undefined, key: string | null | undefined) => {
    if (!buyerId || !key) return;
    const set = perBuyer.get(buyerId) ?? new Set<string>();
    set.add(key);
    perBuyer.set(buyerId, set);
  };
  for (const row of items.data) {
    const buyerId = selectionBuyer.get(row.selection_id);
    if (row.source === 'listing') {
      add(buyerId, watchKey(row.reference));
      // Le même bien sous une autre annonce : son identifiant chez le fournisseur de la recherche.
      const propertyId = (row as { property_id?: unknown }).property_id;
      if (typeof propertyId === 'string' && propertyId) add(buyerId, watchPropertyKey(propertyId));
    }
    if (row.source === 'competitor') {
      const url = comparableUrl.get(row.reference);
      if (url) add(buyerId, watchKey(url));
    }
  }
  for (const row of [...proposals.data, ...dismissals.data]) {
    // `listing:<portail>:<numéro>` (M134) : l'identité publiée.
    if (row.property_key.startsWith('listing:')) {
      add(row.buyer_id, row.property_key.slice('listing:'.length));
    }
  }
  return {
    ok: true,
    keys: (buyerId) => new Set([...agencyKeys, ...(perBuyer.get(buyerId) ?? [])]),
  };
}
