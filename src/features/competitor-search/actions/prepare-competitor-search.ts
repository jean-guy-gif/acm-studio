'use server';

import { loadSearchCriteria } from '@/features/competitor-search/queries/load-search-criteria';
import type { CompetitorSearchCriteria } from '@/features/competitor-search/types';

export type PrepareSearchResult =
  { ok: true; criteria: CompetitorSearchCriteria } | { ok: false; error: string };

const GENERIC_ERROR = 'La recherche a échoué. Vous pouvez importer une annonce par son adresse.';
const NO_CITY_ERROR =
  'Renseignez d’abord la ville du bien vendeur : la recherche se base sur sa localisation.';

// La PRÉPARATION de la recherche, côté serveur : les critères viennent du bien vendeur (jamais
// du client). Aucune lecture réseau ici. Le classement et l'apprentissage se font à part
// (rankCompetitorCandidates).
export async function prepareCompetitorSearch(projectId: string): Promise<PrepareSearchResult> {
  const loaded = await loadSearchCriteria(projectId);
  if (!loaded.ok) {
    return { ok: false, error: loaded.reason === 'no_city' ? NO_CITY_ERROR : GENERIC_ERROR };
  }
  return { ok: true, criteria: loaded.criteria };
}
