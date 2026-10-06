import 'server-only';

import type { CompetitorSearchCriteria } from '@/features/competitor-search/types';
import { getSubjectProperty } from '@/features/subject-property/queries/get-subject-property';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export type LoadedSearchCriteria =
  // `address` : l'adresse du bien vendeur, pour le géocodage (secteur, crans Stream Estate).
  | { ok: true; criteria: CompetitorSearchCriteria; profileId: string; address: string | null }
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
    .select('id')
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

  return {
    ok: true,
    profileId: profile.id,
    address: property.address,
    criteria: {
      city: property.city.trim(),
      postalCode: property.postal_code,
      propertyType: property.property_type,
      district: property.district,
      surfaceArea: property.surface_area,
      roomsCount: property.rooms_count,
      advisorPriceMin: property.advisor_price_min,
      advisorPriceMax: property.advisor_price_max,
    },
  };
}
