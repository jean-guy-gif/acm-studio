import 'server-only';

import { extractListingKey } from '@/features/comparable-import/utils/extract-listing-key';
import { getComparables } from '@/features/comparables/queries/get-comparables';
import {
  buildProspectingRows,
  type ProspectingObservation,
  type ProspectingRow,
} from '@/features/competitor-locator/services/build-prospecting-rows';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// Mission 75 — les lignes de « Concurrents à prospecter » d'un dossier. getComparables est cadré
// sur l'agence de l'appelant ([] pour un dossier étranger) ; les observations aussi.
export async function getProspectingRows(projectId: string): Promise<ProspectingRow[]> {
  const profile = await getProfile();
  if (!profile) {
    return [];
  }
  const competitors = (await getComparables(projectId)).filter(
    (competitor) => competitor.is_selected,
  );
  if (competitors.length === 0) {
    return [];
  }

  const listingKeys = [
    ...new Set(
      competitors
        .map((competitor) =>
          competitor.listing_url ? extractListingKey(competitor.listing_url)?.listingKey : null,
        )
        .filter((key): key is string => key != null),
    ),
  ];

  let observations: ProspectingObservation[] = [];
  if (listingKeys.length > 0) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('listing_observations')
      .select('portal, listing_key, observed_on, price, published_bound_label')
      .eq('agency_id', profile.agency_id)
      .in('listing_key', listingKeys);
    observations = (data ?? []).map((row) => ({
      portal: row.portal,
      listingKey: row.listing_key,
      observedOn: row.observed_on,
      price: Number(row.price),
      boundLabel: row.published_bound_label,
    }));
  }

  return buildProspectingRows(competitors, observations);
}
