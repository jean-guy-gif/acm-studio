'use server';

import type { PortalSearchLink } from '@/features/competitor-search/services/build-portal-search-urls';
import { buildPortalSearchUrls } from '@/features/competitor-search/services/build-portal-search-urls';
import type { CompetitorSearchCriteria } from '@/features/competitor-search/types';
import { getSubjectProperty } from '@/features/subject-property/queries/get-subject-property';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export type PrepareSearchResult =
  | { ok: true; criteria: CompetitorSearchCriteria; links: PortalSearchLink[] }
  | { ok: false; error: string };

const GENERIC_ERROR = 'La recherche a échoué. Vous pouvez importer une annonce par son adresse.';

// MISSION 50 — la PRÉPARATION de la recherche, côté serveur : les critères viennent
// du bien vendeur (jamais du client) et les adresses des quatre portails sont
// construites (constructeur qui refuse les formes interdites, §3). Aucune lecture
// réseau ici : c'est l'extension, dans le navigateur du conseiller, qui lira ensuite
// chaque page (§2). Le classement et l'apprentissage se font à part (rankCompetitorCandidates).
export async function prepareCompetitorSearch(projectId: string): Promise<PrepareSearchResult> {
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
    return {
      ok: false,
      error:
        'Renseignez d’abord la ville du bien vendeur : la recherche se base sur sa localisation.',
    };
  }

  const criteria: CompetitorSearchCriteria = {
    city: property.city.trim(),
    postalCode: property.postal_code,
    propertyType: property.property_type,
    district: property.district,
    surfaceArea: property.surface_area,
    roomsCount: property.rooms_count,
    advisorPriceMin: property.advisor_price_min,
    advisorPriceMax: property.advisor_price_max,
  };

  return { ok: true, criteria, links: buildPortalSearchUrls(criteria) };
}
