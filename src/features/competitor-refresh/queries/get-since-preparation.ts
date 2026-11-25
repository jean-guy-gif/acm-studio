import 'server-only';

import { extractListingKey } from '@/features/comparable-import/utils/extract-listing-key';
import type { Comparable } from '@/features/comparables/types';
import { listingsReadToday } from '@/features/competitor-refresh/queries/listings-read-today';
import {
  sincePreparation,
  type SincePreparation,
} from '@/features/competitor-refresh/services/since-preparation';
import { neutralComparableLabel } from '@/features/live-seller/utils/neutral-comparable-label';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// Mission 152 (partie A) — « Depuis la préparation » : les concurrents retenus, leur copie
// d'import, leurs relevés datés, relus en base. Une lecture en échec n'est jamais lue comme « rien
// n'a changé » (M98) : elle rend null, et le bloc le dit.
export async function getSincePreparation(
  retained: Comparable[],
  checkedAt: string | null,
  now: Date = new Date(),
): Promise<SincePreparation | null> {
  const profile = await getProfile();
  if (!profile) return null;
  const supabase = await createClient();
  const withListing = retained.filter((comparable) => (comparable.listing_url ?? '').trim() !== '');
  const identities = new Map(
    withListing.map((comparable) => [
      comparable.id,
      extractListingKey(comparable.listing_url as string),
    ]),
  );
  const keys = [...identities.values()]
    .filter((identity) => identity != null)
    .map((identity) => identity.listingKey);

  const [copies, observations, readOnCheck] = await Promise.all([
    withListing.length > 0
      ? supabase
          .from('competitor_listing_copies')
          .select('comparable_id, price')
          .eq('agency_id', profile.agency_id)
          .in(
            'comparable_id',
            withListing.map((comparable) => comparable.id),
          )
      : Promise.resolve({ data: [], error: null }),
    keys.length > 0
      ? supabase
          .from('listing_observations')
          .select('portal, listing_key, observed_on, price')
          .eq('agency_id', profile.agency_id)
          .in('listing_key', keys)
          .order('observed_on', { ascending: true })
          .limit(2000)
      : Promise.resolve({ data: [], error: null }),
    checkedAt
      ? listingsReadToday(supabase, profile.agency_id, withListing, new Date(checkedAt))
      : Promise.resolve(new Map<string, boolean | null>()),
  ]);
  if (copies.error || observations.error) return null;

  const copyPrice = new Map(
    (copies.data ?? []).map((row) => [row.comparable_id, Number(row.price)]),
  );
  return sincePreparation(
    retained.map((comparable) => {
      const identity = identities.get(comparable.id) ?? null;
      return {
        id: comparable.id,
        label: neutralComparableLabel({
          propertyType: comparable.property_type,
          roomsCount: comparable.rooms_count,
          surfaceArea: comparable.surface_area,
          city: comparable.city,
          district: comparable.district,
        }),
        price: Number(comparable.price),
        hasListing: identities.has(comparable.id),
        // Retirée DEPUIS la préparation, constaté par une relecture (M103) ; une annonce retirée dès
        // l'import a déjà eu son avertissement à la réintégration, ce n'est pas un changement.
        goneAt: comparable.listing_gone_at,
        shownAtLive: comparable.excluded_from_live !== true,
        recordedPrice: copyPrice.get(comparable.id) ?? null,
        observations: identity
          ? (observations.data ?? [])
              .filter(
                (row) => row.portal === identity.portal && row.listing_key === identity.listingKey,
              )
              .map((row) => ({ observed_on: row.observed_on, price: Number(row.price) }))
          : [],
        readOnCheck: readOnCheck.get(comparable.id) ?? null,
        importedAt: comparable.created_at,
      };
    }),
    checkedAt,
    now,
  );
}
