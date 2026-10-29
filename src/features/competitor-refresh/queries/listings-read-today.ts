import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { extractListingKey } from '@/features/comparable-import/utils/extract-listing-key';
import type { Database } from '@/lib/supabase/database.types';

// Mission 127 — ce que la relecture du jour a RÉELLEMENT lu, relu en base : une annonce est
// « relue » si une observation datée d'aujourd'hui existe pour son identité (portail + clé, M47),
// que son prix ait changé ou non. Rien ne vient du navigateur. Par concurrent : true (relue),
// false (annonce en ligne non relue : illisible ou disparue), null (sans annonce).
export async function listingsReadToday(
  supabase: SupabaseClient<Database>,
  agencyId: string,
  competitors: { id: string; listing_url: string | null }[],
  today: Date = new Date(),
): Promise<Map<string, boolean | null>> {
  const identities = new Map(
    competitors.map((row) => [row.id, row.listing_url ? extractListingKey(row.listing_url) : null]),
  );
  const keys = [...identities.values()]
    .filter((identity) => identity != null)
    .map((identity) => identity.listingKey);
  const observed = new Set<string>();
  if (keys.length > 0) {
    const { data } = await supabase
      .from('listing_observations')
      .select('portal, listing_key')
      .eq('agency_id', agencyId)
      .eq('observed_on', today.toISOString().slice(0, 10))
      .in('listing_key', keys);
    for (const row of data ?? []) observed.add(`${row.portal}:${row.listing_key}`);
  }
  return new Map(
    competitors.map((row) => {
      const identity = identities.get(row.id) ?? null;
      if (!row.listing_url) return [row.id, null];
      return [row.id, identity ? observed.has(`${identity.portal}:${identity.listingKey}`) : false];
    }),
  );
}
