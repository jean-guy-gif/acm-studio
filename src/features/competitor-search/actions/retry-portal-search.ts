'use server';

import type { SearchPortal, SearchResultsHtmlImport } from '@/features/competitor-search/types';
import { buildPortalSearchUrls } from '@/features/competitor-search/services/build-portal-search-urls';
import { readPortalsSequentially } from '@/features/competitor-search/services/read-portals-sequentially';
import { fetchListingPage } from '@/features/comparable-import/services/fetch-listing-page';
import { getSubjectProperty } from '@/features/subject-property/queries/get-subject-property';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

const GENERIC_ERROR = 'La relance a échoué. Vous pouvez coller le code de la page de résultats.';

// MISSION 50 §10 — un portail « injoignable » (pas de réponse / délai / réseau) est
// un échec PASSAGER : l'écran propose de relancer CE portail, sans refaire les trois
// autres. Un portail « refused » (robots.txt) ne passe jamais par ici : son refus est
// permanent, l'écran ne propose que le collage.
export async function retryPortalSearch(
  projectId: string,
  portal: SearchPortal,
): Promise<SearchResultsHtmlImport> {
  const profile = await getProfile();
  if (!profile) {
    return { ok: false, error: GENERIC_ERROR };
  }

  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (!project) {
    return { ok: false, error: GENERIC_ERROR };
  }

  const property = await getSubjectProperty(projectId);
  if (!property || !property.city || property.city.trim() === '') {
    return { ok: false, error: GENERIC_ERROR };
  }

  const link = buildPortalSearchUrls({
    city: property.city.trim(),
    postalCode: property.postal_code,
    propertyType: property.property_type,
    district: property.district,
    surfaceArea: property.surface_area,
    roomsCount: property.rooms_count,
    advisorPriceMin: property.advisor_price_min,
    advisorPriceMax: property.advisor_price_max,
  }).find((candidate) => candidate.portal === portal);
  if (!link) {
    return { ok: false, error: GENERIC_ERROR };
  }

  // Un seul portail : pas de cadence entre pages à tenir ici (interPageDelayMs 0).
  const [result] = await readPortalsSequentially([link], {
    readPage: async (url) => {
      const page = await fetchListingPage(url);
      return page.ok
        ? { ok: true as const, html: page.html, finalUrl: page.finalUrl }
        : { ok: false as const, reason: page.reason };
    },
    interPageDelayMs: 0,
  });

  return { ok: true, portal: result };
}
