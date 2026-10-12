import 'server-only';

import {
  parseSearchSettings,
  type SearchSettings,
} from '@/features/competitor-search/services/search-settings';
import type { CompetitorSearchCriteria } from '@/features/competitor-search/types';
import { completeAdvisorRange } from '@/features/subject-property/services/advisor-range';
import { getSubjectProperty } from '@/features/subject-property/queries/get-subject-property';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export type LoadedSearchCriteria =
  // `address` : l'adresse du bien vendeur, pour le géocodage (secteur, crans Stream Estate).
  // `settings` (mission 99) : les réglages du conseiller, relus en base — jamais ceux de l'écran.
  | {
      ok: true;
      criteria: CompetitorSearchCriteria;
      profileId: string;
      address: string | null;
      settings: SearchSettings;
    }
  | { ok: false; reason: 'forbidden' | 'no_city' };

// Les critères de recherche viennent du bien vendeur, côté serveur, jamais du client. Le dossier
// est vérifié dans l'agence du conseiller avant toute lecture (isolation multi-agences).
// Partagé par la recherche automatique (mission 50) et « Ouvrir mes recherches » (mission 69).
export async function loadSearchCriteria(projectId: string): Promise<LoadedSearchCriteria> {
  const profile = await getProfile();
  if (!profile) {
    return { ok: false, reason: 'forbidden' };
  }

  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('id, search_settings')
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (!project) {
    return { ok: false, reason: 'forbidden' };
  }

  const property = await getSubjectProperty(projectId);
  if (!property || !property.city || property.city.trim() === '') {
    return { ok: false, reason: 'no_city' };
  }

  // Mission 93 — la recherche ne reçoit jamais une borne seule : deux bornes, ou pas de fourchette.
  const range = completeAdvisorRange(property.advisor_price_min, property.advisor_price_max);
  return {
    ok: true,
    profileId: profile.id,
    address: property.address,
    settings: parseSearchSettings(project.search_settings),
    criteria: {
      city: property.city.trim(),
      postalCode: property.postal_code,
      propertyType: property.property_type,
      district: property.district,
      surfaceArea: property.surface_area,
      roomsCount: property.rooms_count,
      advisorPriceMin: range.min,
      advisorPriceMax: range.max,
    },
  };
}
