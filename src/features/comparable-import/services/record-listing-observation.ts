import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { extractListingKey } from '@/features/comparable-import/utils/extract-listing-key';
import type { ImportedComparableData } from '@/features/comparable-import/types';
import type { Database } from '@/lib/supabase/database.types';

type Client = SupabaseClient<Database>;

// Records ONE dated observation about a public listing (Mission 47 §2). A fact about
// the ANNONCE, never about a dossier or a role: the same listing is a competitor in
// one advisor's file and the seller's own in another. The guard is at display, not
// storage.
//
// Written only when a PRICE was actually read AND the listing has an identity
// (portal + id-in-path) — an observation without a price is worthless. Deduplicated
// to one per listing per day by the DB unique constraint; a second import the same
// day is a no-op, so reloading the page does not fabricate constats.
//
// Best effort: this is a side effect of the import — it must NEVER fail the import.
export async function recordListingObservation(
  supabase: Client,
  agencyId: string,
  sourceUrl: string,
  data: ImportedComparableData,
): Promise<void> {
  if (data.price == null) {
    return; // no price → nothing worth observing
  }
  const identity = extractListingKey(sourceUrl);
  if (!identity) {
    return; // unmeasured portal or no usable id → no identity → no observation
  }

  const pricePerSquareMeter =
    data.surfaceArea && data.surfaceArea > 0
      ? Math.round(data.price / data.surfaceArea)
      : data.portalPricePerSquareMeter;

  try {
    // ON CONFLICT DO NOTHING on (agency_id, portal, listing_key, observed_on):
    // observed_on defaults to today (UTC) in the DB, so a same-day re-import is
    // silently ignored and the FIRST constat of the day is kept.
    await supabase.from('listing_observations').upsert(
      {
        agency_id: agencyId,
        portal: identity.portal,
        listing_key: identity.listingKey,
        canonical_url: identity.canonicalUrl,
        price: data.price,
        price_per_square_meter: pricePerSquareMeter,
        // Exact publication date when the portal publishes one (SeLoger). The
        // approximate lower bound, modification date and view count are filled by a
        // later change (they need per-portal readers still to be measured, §6).
        published_at: data.listingPublishedAt,
      },
      { onConflict: 'agency_id,portal,listing_key,observed_on', ignoreDuplicates: true },
    );
  } catch {
    // Never break the advisor's import over a bookkeeping side effect.
  }
}
