import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { deriveListingAge } from '@/features/comparable-import/services/derive-listing-age';
import { derivePriceChange } from '@/features/comparable-import/services/derive-price-change';
import type { ImportedComparableData, ListingHistory } from '@/features/comparable-import/types';
import { extractListingKey } from '@/features/comparable-import/utils/extract-listing-key';
import type { Database } from '@/lib/supabase/database.types';

type Client = SupabaseClient<Database>;

const PORTAL_LABELS: Record<string, string> = {
  seloger: 'SeLoger',
  bienici: 'Bien’ici',
  greenacres: 'Green Acres',
  maisonsetappartements: 'Maisons et Appartements',
};

// Turns a lower-bound label ("plus de 2 mois") into a timestamp meaning "published no
// later than this" — observedAt minus the stated duration. For ordering only; the
// screen shows the label verbatim, never a day count.
const UNIT_DAYS: Record<string, number> = {
  jour: 1,
  jours: 1,
  semaine: 7,
  semaines: 7,
  mois: 30,
  an: 365,
  ans: 365,
};
function lowerBoundTimestamp(label: string | null, atMs: number): string | null {
  if (!label) {
    return null;
  }
  const m = /plus de\s+(\d+)\s+(jours?|semaines?|mois|ans?)/i.exec(label);
  if (!m) {
    return null;
  }
  const days = UNIT_DAYS[m[2].toLowerCase()];
  if (!days) {
    return null;
  }
  return new Date(atMs - Number(m[1]) * days * 86_400_000).toISOString();
}

// Records ONE dated observation about a public listing (Mission 47 §2) and returns
// the history DERIVED from every observation ACM already holds for it: how old the
// listing is (age) and the price change constaté between the first and latest
// observation. A fact about the ANNONCE, never about a dossier or a role — the guard
// is at display, not storage.
//
// Written only when a PRICE was read AND the listing has an identity (portal +
// id-in-path). Deduplicated to one per listing per day by the DB unique constraint,
// so reloading the page fabricates no constat.
//
// Best effort: a side effect of the import — it must NEVER fail the import. On any
// error it returns null (no history), and the import proceeds.
export async function observeListing(
  supabase: Client,
  agencyId: string,
  sourceUrl: string,
  data: ImportedComparableData,
  now: Date = new Date(),
): Promise<ListingHistory | null> {
  if (data.price == null) {
    return null; // no price → nothing worth observing
  }
  const identity = extractListingKey(sourceUrl);
  if (!identity) {
    return null; // unmeasured portal or no usable id → no identity → no observation
  }

  const pricePerSquareMeter =
    data.surfaceArea && data.surfaceArea > 0
      ? Math.round(data.price / data.surfaceArea)
      : data.portalPricePerSquareMeter;

  try {
    // ON CONFLICT DO NOTHING on (agency_id, portal, listing_key, observed_on):
    // observed_on defaults to today (UTC), so a same-day re-import is a no-op and the
    // FIRST constat of the day is kept.
    await supabase.from('listing_observations').upsert(
      {
        agency_id: agencyId,
        portal: identity.portal,
        listing_key: identity.listingKey,
        canonical_url: identity.canonicalUrl,
        price: data.price,
        price_per_square_meter: pricePerSquareMeter,
        published_at: data.listingPublishedAt,
        published_lower_bound_at: lowerBoundTimestamp(
          data.publicationLowerBoundLabel,
          now.getTime(),
        ),
        published_bound_label: data.publicationLowerBoundLabel,
        modified_at: data.modifiedAt,
        view_count: data.viewCount,
        view_count_since: data.viewCountSince,
      },
      { onConflict: 'agency_id,portal,listing_key,observed_on', ignoreDuplicates: true },
    );

    // Read back EVERY observation of this listing to derive age + price change.
    const { data: rows } = await supabase
      .from('listing_observations')
      .select('observed_on, price')
      .eq('agency_id', agencyId)
      .eq('portal', identity.portal)
      .eq('listing_key', identity.listingKey)
      .order('observed_on', { ascending: true });

    const observations = (rows ?? []).map((row) => ({
      observedOn: row.observed_on,
      price: Number(row.price),
    }));
    const firstObservedAt = observations.length > 0 ? observations[0].observedOn : null;

    const age = deriveListingAge(
      {
        publishedAtExact: data.listingPublishedAt,
        lowerBoundLabel: data.publicationLowerBoundLabel,
        source: PORTAL_LABELS[identity.portal] ?? identity.portal,
        firstObservedAt,
      },
      now,
    );
    const priceChange = derivePriceChange(observations);

    return { age, priceChange };
  } catch {
    // Never break the advisor's import over a bookkeeping side effect.
    return null;
  }
}
