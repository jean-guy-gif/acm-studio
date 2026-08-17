'use server';

import type {
  CompetitorSearchCriteria,
  CompetitorSearchResult,
  PortalSearchResult,
} from '@/features/competitor-search/types';
import { buildPortalSearchUrls } from '@/features/competitor-search/services/build-portal-search-urls';
import { extractSearchResults } from '@/features/competitor-search/services/extract-search-results';
import { fetchListingPage } from '@/features/comparable-import/services/fetch-listing-page';
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

  return { ok: true, criteria, portals };
}
