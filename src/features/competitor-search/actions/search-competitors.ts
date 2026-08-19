'use server';

import type {
  CompetitorSearchCriteria,
  CompetitorSearchResult,
  PortalSearchResult,
  RankedCandidate,
} from '@/features/competitor-search/types';
import { buildPortalSearchUrls } from '@/features/competitor-search/services/build-portal-search-urls';
import { extractSearchResults } from '@/features/competitor-search/services/extract-search-results';
import { fetchListingPage } from '@/features/comparable-import/services/fetch-listing-page';
import {
  applyLearning,
  learnFromDecisions,
  type CompetitorDecisionRecord,
  type DecisionReason,
} from '@/features/competitor-search/services/learn-from-decisions';
import { scoreCandidate } from '@/features/competitor-search/services/score-candidate';
import { getSubjectProperty } from '@/features/subject-property/queries/get-subject-property';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

const GENERIC_ERROR = 'La recherche a échoué. Vous pouvez importer une annonce par son adresse.';

// Recherche de concurrents sur les portails à partir du BIEN VENDEUR (critères
// dérivés côté serveur, jamais fournis par le client). Tentative de lecture
// directe par portail via le même service de récupération que l'import URL
// (SSRF, timeout, taille, Content-Type). Un portail qui refuse -> statut
// « blocked » + le conseiller ouvre la recherche dans SON navigateur et colle
// la page de résultats. Aucun contournement anti-bot, aucune donnée inventée,
// rien n'est enregistré : le conseiller accepte ou écarte chaque suggestion.
export async function searchCompetitors(projectId: string): Promise<CompetitorSearchResult> {
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

  const links = buildPortalSearchUrls(criteria);

  const portals: PortalSearchResult[] = await Promise.all(
    links.map(async (link): Promise<PortalSearchResult> => {
      const page = await fetchListingPage(link.url);
      if (!page.ok) {
        return {
          portal: link.portal,
          label: link.label,
          searchUrl: link.url,
          status: 'blocked',
          message: `${page.error} Ouvrez la recherche dans votre navigateur puis collez le code de la page de résultats.`,
          candidates: [],
        };
      }
      const candidates = extractSearchResults(page.html, page.finalUrl, link.portal);
      if (candidates.length === 0) {
        return {
          portal: link.portal,
          label: link.label,
          searchUrl: link.url,
          status: 'empty',
          message:
            'Aucune annonce détectée automatiquement. Ouvrez la recherche dans votre navigateur puis collez le code de la page de résultats.',
          candidates: [],
        };
      }
      return {
        portal: link.portal,
        label: link.label,
        searchUrl: link.url,
        status: 'ok',
        message: null,
        candidates,
      };
    }),
  );

  // Décisions déjà prises DANS L'AGENCE : c'est la mémoire de l'outil. On lit
  // large (toute l'agence) pour que les conseillers s'entraident, comme demandé.
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

  // Classement : on rassemble les annonces de tous les portails, on les note, on
  // trie. Aucune n'est retirée — une annonce éloignée descend, elle ne disparaît
  // pas : un concurrent atypique existe, et c'est le conseiller qui tranche.
  const ranked: RankedCandidate[] = [];
  const seen = new Set<string>();
  for (const portal of portals) {
    for (const candidate of portal.candidates) {
      if (seen.has(candidate.url)) {
        continue;
      }
      seen.add(candidate.url);
      let host = '';
      try {
        host = new URL(candidate.url).hostname.toLowerCase();
      } catch {
        continue;
      }
      const facts = {
        price: candidate.price,
        surfaceArea: candidate.surfaceArea,
        roomsCount: candidate.roomsCount,
        // Les pages de résultats ne portent ni quartier ni type fiable : ces
        // critères entreront en jeu après l'enrichissement de la fiche.
        city: criteria.city,
        district: null,
        propertyType: null,
      };
      const base = scoreCandidate(criteria, facts);
      const adjusted = applyLearning(
        base,
        { ...facts, listingUrl: candidate.url, listingHost: host },
        preferences,
      );
      ranked.push({
        candidate,
        portal: portal.portal,
        portalLabel: portal.label,
        host,
        score: adjusted.score,
        strengths: base.strengths,
        weaknesses: base.weaknesses,
        learnedPenalties: adjusted.penalties,
        alreadyJudged: adjusted.alreadyJudged,
      });
    }
  }

  // Les annonces déjà tranchées passent derrière : le conseiller les voit, mais
  // après celles sur lesquelles il n'a pas encore d'avis.
  ranked.sort((a, b) => {
    const judgedA = a.alreadyJudged == null ? 0 : 1;
    const judgedB = b.alreadyJudged == null ? 0 : 1;
    return judgedA !== judgedB ? judgedA - judgedB : b.score - a.score;
  });

  return { ok: true, criteria, portals, ranked, learnedNotes: preferences.notes };
}
