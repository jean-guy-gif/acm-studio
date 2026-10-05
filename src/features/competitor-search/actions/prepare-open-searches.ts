'use server';

import {
  buildFilteredSearchUrls,
  placeCityKey,
  PLACE_PORTALS,
  type FilteredSearchLink,
  type KnownPlaceIds,
  type PlacePortal,
} from '@/features/competitor-search/services/build-filtered-search-urls';
import { loadSearchCriteria } from '@/features/competitor-search/queries/load-search-criteria';
import { createClient } from '@/lib/supabase/server';

export type PrepareOpenSearchesResult =
  { ok: true; city: string; links: FilteredSearchLink[] } | { ok: false; error: string };

// MISSION 69 — « Ouvrir mes recherches » : les quatre adresses déjà filtrées, depuis le bien
// vendeur et les identifiants de commune déjà appris (portal_place_ids, lecture pour tout
// conseiller connecté). Rien n'est ouvert ici : c'est l'extension qui ouvre les onglets.
export async function prepareOpenSearches(projectId: string): Promise<PrepareOpenSearchesResult> {
  const loaded = await loadSearchCriteria(projectId);
  if (!loaded.ok) {
    return {
      ok: false,
      error:
        loaded.reason === 'no_city'
          ? 'Renseignez d’abord la ville du bien vendeur : les recherches se basent sur sa localisation.'
          : 'Les recherches n’ont pas pu être préparées. Réessayez.',
    };
  }
  const { criteria } = loaded;

  const placeIds: KnownPlaceIds = {};
  const cityKey = placeCityKey(criteria.city, criteria.postalCode);
  if (cityKey != null) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('portal_place_ids')
      .select('portal, place_id')
      .eq('city_key', cityKey);
    if (error) {
      console.error('[prepareOpenSearches] lecture portal_place_ids', error.message);
    }
    for (const row of data ?? []) {
      if ((PLACE_PORTALS as readonly string[]).includes(row.portal)) {
        placeIds[row.portal as PlacePortal] = row.place_id;
      }
    }
  }

  return { ok: true, city: criteria.city, links: buildFilteredSearchUrls(criteria, placeIds) };
}
