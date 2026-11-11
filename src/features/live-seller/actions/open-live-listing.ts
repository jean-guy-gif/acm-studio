'use server';

import {
  LISTING_PORTAL_LABELS,
  extractListingKey,
} from '@/features/comparable-import/utils/extract-listing-key';
import { isDemoAgency } from '@/features/demo/services/is-demo-agency';
import {
  buildLiveListingCopy,
  openableListingUrl,
  type LiveListingCopy,
} from '@/features/live-seller/services/live-listing-copy';
import { loadLivePresentation } from '@/features/live-seller/services/load-live-presentation';
import {
  isComparableAuthorized,
  isDurationAuthorized,
} from '@/features/live-seller/services/project-live-for-seller';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export type OpenLiveListingResult =
  | { ok: true; kind: 'online'; url: string }
  | { ok: true; kind: 'copy'; copy: LiveListingCopy }
  | { ok: false; error: 'not_revealed' | 'no_listing' | 'unavailable' };

// Mission 152 (partie A) — « Voir l'annonce », au Live, une fois le prix de ce concurrent dévoilé :
// l'annonce s'ouvre sur son portail, dans un nouvel onglet (Jean-Guy, 11/11). Son adresse n'arrive
// au navigateur qu'à ce toucher, et seulement si le serveur relit en base que le prix a été
// révélé (garde de donnée, M51) — jamais avant, jamais pour un « Non ». Quand l'annonce n'est plus
// en ligne (preuve M103), c'est la copie qu'ACM en a gardée qui revient, sans le lien. Dans l'agence
// de démonstration, dont les annonces ne mènent à aucun portail réel (M114), la copie aussi.
export async function openLiveListing(
  projectId: string,
  comparableId: string,
): Promise<OpenLiveListingResult> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) return { ok: false, error: 'unavailable' };

  const presentation = await loadLivePresentation(projectId, 'reveal');
  const entry = presentation?.live?.comparables.find((item) => item.id === comparableId);
  if (!presentation?.live || !entry) return { ok: false, error: 'unavailable' };
  if (!isComparableAuthorized(entry)) return { ok: false, error: 'not_revealed' };

  const supabase = await createClient();
  const { data: competitor } = await supabase
    .from('comparables')
    .select(
      'listing_url, listing_gone_at, listing_withdrawn, updated_at, price, photo_urls, surface_area, land_area, rooms_count, bedrooms_count, energy_rating, outdoor_spaces, parking_types',
    )
    .eq('id', comparableId)
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (!competitor) return { ok: false, error: 'unavailable' };
  const url = openableListingUrl(competitor.listing_url);
  if (!url) return { ok: false, error: 'no_listing' };

  const gone = competitor.listing_gone_at != null || competitor.listing_withdrawn;
  if (!gone && !(await isDemoAgency(profile.agency_id))) {
    return { ok: true, kind: 'online', url };
  }

  const identity = extractListingKey(url);
  const { data: copy } = await supabase
    .from('competitor_listing_copies')
    .select('captured_at, price, photo_urls, facts')
    .eq('comparable_id', comparableId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  const { data: observations } = identity
    ? await supabase
        .from('listing_observations')
        .select('observed_on, price')
        .eq('agency_id', profile.agency_id)
        .eq('portal', identity.portal)
        .eq('listing_key', identity.listingKey)
        .order('observed_on', { ascending: true })
        .limit(200)
    : { data: [] as { observed_on: string; price: number }[] };

  return {
    ok: true,
    kind: 'copy',
    copy: buildLiveListingCopy({
      copy: copy ?? null,
      observations: observations ?? [],
      entry: {
        price: Number(competitor.price),
        photoUrls: entry.photoUrls,
        surfaceArea: competitor.surface_area,
        landArea: competitor.land_area,
        roomsCount: competitor.rooms_count,
        bedroomsCount: competitor.bedrooms_count,
        energyRating: competitor.energy_rating,
        outdoorSpaces: competitor.outdoor_spaces ?? [],
        parkingTypes: competitor.parking_types ?? [],
      },
      portal: identity ? (LISTING_PORTAL_LABELS[identity.portal] ?? null) : null,
      // Retirée à l'import (M103) : sans date propre, le jour de la dernière écriture de la fiche.
      goneAt:
        competitor.listing_gone_at ?? (competitor.listing_withdrawn ? competitor.updated_at : null),
      durationRevealed: isDurationAuthorized(entry, presentation.live.direct === true),
    }),
  };
}
