'use server';

import type { PortalSearchLink } from '@/features/competitor-search/services/build-portal-search-urls';
import { buildPortalSearchUrls } from '@/features/competitor-search/services/build-portal-search-urls';
import { loadSearchCriteria } from '@/features/competitor-search/queries/load-search-criteria';
import type { CompetitorSearchCriteria } from '@/features/competitor-search/types';

export type PrepareSearchResult =
  | { ok: true; criteria: CompetitorSearchCriteria; links: PortalSearchLink[] }
  | { ok: false; error: string };

const GENERIC_ERROR = 'La recherche a échoué. Vous pouvez importer une annonce par son adresse.';
const NO_CITY_ERROR =
  'Renseignez d’abord la ville du bien vendeur : la recherche se base sur sa localisation.';

// MISSION 50 — la PRÉPARATION de la recherche, côté serveur : les critères viennent
// du bien vendeur (jamais du client) et les adresses des quatre portails sont
// construites (constructeur qui refuse les formes interdites, §3). Aucune lecture
// réseau ici : c'est l'extension, dans le navigateur du conseiller, qui lira ensuite
// chaque page (§2). Le classement et l'apprentissage se font à part (rankCompetitorCandidates).
export async function prepareCompetitorSearch(projectId: string): Promise<PrepareSearchResult> {
  const loaded = await loadSearchCriteria(projectId);
  if (!loaded.ok) {
    return { ok: false, error: loaded.reason === 'no_city' ? NO_CITY_ERROR : GENERIC_ERROR };
  }
  return { ok: true, criteria: loaded.criteria, links: buildPortalSearchUrls(loaded.criteria) };
}
