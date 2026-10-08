'use server';

import { dpeClass } from '@/features/dpe/services/dpe';
import {
  learnFromDecisions,
  type CompetitorDecisionRecord,
  type DecisionReason,
} from '@/features/competitor-search/services/learn-from-decisions';
import { geocodeSubject, resolveCommune } from '@/features/competitor-search/services/fetch-geo';
import { rankCandidates } from '@/features/competitor-search/services/rank-candidates';
import {
  type CompetitorSearchCriteria,
  type PortalSearchResult,
  type RankedSearch,
  type SectorStatus,
} from '@/features/competitor-search/types';
import { getSubjectProperty } from '@/features/subject-property/queries/get-subject-property';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export type RankSearchResult =
  | ({ ok: true; learnedNotes: string[]; sector: SectorStatus } & RankedSearch)
  | { ok: false; error: string };

const GENERIC_ERROR = 'Le classement a échoué.';
// MISSION 50 — le CLASSEMENT, côté serveur. Les cartes ont été lues par l'extension
// dans le navigateur du conseiller ; elles arrivent ici en données (jamais exécutées,
// jamais réinjectées). Les critères sont re-dérivés du bien vendeur côté serveur
// (jamais ceux du client), et l'apprentissage lit les décisions de l'agence. Rien
// n'est écrit : le conseiller validera.
export async function rankCompetitorCandidates(
  projectId: string,
  portals: PortalSearchResult[],
): Promise<RankSearchResult> {
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

  const criteria: CompetitorSearchCriteria = {
    city: property.city.trim(),
    postalCode: property.postal_code,
    propertyType: property.property_type,
    district: property.district,
    surfaceArea: property.surface_area,
    roomsCount: property.rooms_count,
    advisorPriceMin: property.advisor_price_min,
    advisorPriceMax: property.advisor_price_max,
    energyClass: dpeClass(property.energy_rating),
    landArea: property.land_area,
    subject: {
      parkingTypes: property.parking_types ?? [],
      outdoorSpaces: property.outdoor_spaces ?? [],
      generalCondition: property.general_condition,
      floor: property.floor,
      // `?? null` : tant que la migration n'est pas appliquée, la colonne n'existe pas (undefined).
      hasElevator: property.has_elevator ?? null,
      hasPool: property.has_pool ?? null,
      exposure: property.exposure,
      constructionYear: property.construction_year,
    },
  };

  // Décisions déjà prises DANS L'AGENCE : la mémoire de l'outil, lue large pour que
  // les conseillers s'entraident.
  const { data: rows } = await supabase
    .from('competitor_decisions')
    .select(
      'listing_url, listing_host, decision, reason, price, surface_area, district, property_type',
    )
    .eq('agency_id', profile.agency_id)
    .order('created_at', { ascending: false })
    .limit(500);

  const decisions: CompetitorDecisionRecord[] = (rows ?? []).map((row) => ({
    listingUrl: row.listing_url,
    listingHost: row.listing_host,
    decision: row.decision === 'accepted' ? 'accepted' : 'rejected',
    reason: (row.reason as DecisionReason | null) ?? null,
    price: row.price,
    surfaceArea: row.surface_area,
    district: row.district,
    propertyType: row.property_type,
  }));
  const preferences = learnFromDecisions(decisions);

  // Mission 71 — la commune officielle (geo.api.gouv.fr, gratuit, en cache un jour) : son code
  // INSEE dit « même commune » pour un bien Stream Estate, et son nom géocode l'adresse (« St
  // Laurent du Var » fait tomber le score sous 0,8 : 0,74 contre 0,83, mesuré le 06/10).
  const commune = await resolveCommune(criteria.city, criteria.postalCode);
  const geocode = await geocodeSubject(
    property.address,
    property.postal_code,
    commune.ok ? commune.name : criteria.city,
  );
  const search = rankCandidates(criteria, portals ?? [], preferences, {
    subjectLocation: geocode.ok ? geocode.point : null,
    subjectInseeCode: commune.ok ? commune.code : null,
  });
  return { ok: true, ...search, learnedNotes: preferences.notes, sector: geocode.sector };
}
