'use server';

import {
  learnFromDecisions,
  type CompetitorDecisionRecord,
  type DecisionReason,
} from '@/features/competitor-search/services/learn-from-decisions';
import {
  geocodeUrl,
  judgeGeocode,
  type SubjectGeocode,
} from '@/features/competitor-search/services/geocode-subject';
import { rankCandidates } from '@/features/competitor-search/services/rank-candidates';
import type {
  CompetitorSearchCriteria,
  PortalSearchResult,
  RankedSearch,
  SectorStatus,
} from '@/features/competitor-search/types';
import { getSubjectProperty } from '@/features/subject-property/queries/get-subject-property';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export type RankSearchResult =
  | ({ ok: true; learnedNotes: string[]; sector: SectorStatus } & RankedSearch)
  | { ok: false; error: string };

const GENERIC_ERROR = 'Le classement a échoué.';
const GEOCODE_TIMEOUT_MS = 5_000;

// Étape 2 — le secteur : l'adresse du bien vendeur géocodée (Base Adresse Nationale, gratuite).
// Un échec réseau ne bloque pas le classement : le secteur devient neutre et l'écran le dit.
async function geocodeSubject(
  address: string | null,
  postalCode: string | null,
  city: string,
): Promise<SubjectGeocode> {
  const url = geocodeUrl(address, postalCode, city);
  if (url == null) {
    return { ok: false, sector: { status: 'neutral', reason: 'no_address' } };
  }
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(GEOCODE_TIMEOUT_MS),
      // La même adresse se géocode à l'identique : le classement est relancé à chaque lecture.
      next: { revalidate: 86_400 },
    });
    if (!response.ok) throw new Error(`api-adresse ${response.status}`);
    return judgeGeocode(await response.json(), city);
  } catch (error) {
    console.error(
      '[rankCompetitorCandidates] géocodage',
      error instanceof Error ? error.message : error,
    );
    return { ok: false, sector: { status: 'neutral', reason: 'unavailable' } };
  }
}

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

  const geocode = await geocodeSubject(property.address, property.postal_code, criteria.city);
  const search = rankCandidates(criteria, portals ?? [], preferences, {
    subjectLocation: geocode.ok ? geocode.point : null,
  });
  return { ok: true, ...search, learnedNotes: preferences.notes, sector: geocode.sector };
}
