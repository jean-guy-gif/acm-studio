'use server';

import {
  learnFromDecisions,
  type CompetitorDecisionRecord,
  type DecisionReason,
} from '@/features/competitor-search/services/learn-from-decisions';
import { rankCandidates } from '@/features/competitor-search/services/rank-candidates';
import type {
  CompetitorSearchCriteria,
  PortalSearchResult,
  RankedCandidate,
} from '@/features/competitor-search/types';
import { getSubjectProperty } from '@/features/subject-property/queries/get-subject-property';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export type RankSearchResult =
  { ok: true; ranked: RankedCandidate[]; learnedNotes: string[] } | { ok: false; error: string };

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

  const ranked = rankCandidates(criteria, portals ?? [], preferences);
  return { ok: true, ranked, learnedNotes: preferences.notes };
}
