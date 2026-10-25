import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { derivePriceChange } from '@/features/comparable-import/services/derive-price-change';
import { extractListingKey } from '@/features/comparable-import/utils/extract-listing-key';
import type { IdealSelectionItem } from '@/features/ideal-properties/types';
import type { Database } from '@/lib/supabase/database.types';

export type ObservedDrop = { amount: number; at: string };

// Mission 122 (décision de Jean-Guy, 25/10) — une baisse de prix ne se dit devant l'acquéreur que
// DATÉE par les observations de l'agence (M47) : deux prix qu'ACM a réellement relevés, à deux
// dates ; jamais une baisse « À vérifier » ni une baisse sans date. L'adresse de l'annonce sert
// ici, côté serveur, à retrouver ses observations, et ne sort jamais de cette fonction.
export async function observedPriceDrops(
  supabase: SupabaseClient<Database>,
  items: IdealSelectionItem[],
  agencyId: string,
): Promise<Map<string, ObservedDrop>> {
  const competitorIds = items
    .filter((item) => item.source === 'competitor')
    .map((item) => item.reference);
  const { data: competitors } =
    competitorIds.length > 0
      ? await supabase
          .from('comparables')
          .select('id, listing_url')
          .eq('agency_id', agencyId)
          .in('id', competitorIds)
      : { data: [] as { id: string; listing_url: string | null }[] };
  const urlByCompetitor = new Map((competitors ?? []).map((row) => [row.id, row.listing_url]));
  const identities = new Map<string, { portal: string; listingKey: string }>();
  for (const item of items) {
    const url =
      item.source === 'listing'
        ? item.reference
        : item.source === 'competitor'
          ? urlByCompetitor.get(item.reference)
          : null;
    const identity = url ? extractListingKey(url) : null;
    if (identity) identities.set(item.id, identity);
  }
  if (identities.size === 0) return new Map();
  const { data: observations } = await supabase
    .from('listing_observations')
    .select('portal, listing_key, observed_on, price')
    .eq('agency_id', agencyId)
    .in('listing_key', [
      ...new Set([...identities.values()].map((identity) => identity.listingKey)),
    ]);
  const drops = new Map<string, ObservedDrop>();
  for (const [itemId, identity] of identities) {
    const change = derivePriceChange(
      (observations ?? [])
        .filter((row) => row.portal === identity.portal && row.listing_key === identity.listingKey)
        .map((row) => ({ observedOn: row.observed_on, price: Number(row.price) })),
    );
    if (change && change.amount > 0)
      drops.set(itemId, { amount: change.amount, at: change.toDate });
  }
  return drops;
}
