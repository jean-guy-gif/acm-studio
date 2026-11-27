'use server';

import { loadSearchCriteria } from '@/features/competitor-search/queries/load-search-criteria';
import { searchFingerprint } from '@/features/competitor-search/services/paid-search-guard';
import type { SearchSettings } from '@/features/competitor-search/services/search-settings';
import type { CompetitorSearchCriteria } from '@/features/competitor-search/types';

// `fingerprint` (mission 93) : l'empreinte du bien vendeur et de la fourchette, lue en base. Un
// résultat de recherche gardé dans l'onglet ne se réaffiche que si elle n'a pas changé.
export type PrepareSearchResult =
  // `settings` (mission 99) : les réglages enregistrés sur le dossier, compris dans l'empreinte.
  | { ok: true; criteria: CompetitorSearchCriteria; fingerprint: string; settings: SearchSettings }
  | { ok: false; error: string };

const GENERIC_ERROR = 'La recherche a échoué. Vous pouvez importer une annonce par son adresse.';
const NO_CITY_ERROR =
  'Renseignez d’abord la ville du bien vendeur\u00a0: la recherche se base sur sa localisation.';

// La PRÉPARATION de la recherche, côté serveur : les critères viennent du bien vendeur (jamais
// du client). Aucune lecture réseau ici. Le classement et l'apprentissage se font à part
// (rankCompetitorCandidates).
export async function prepareCompetitorSearch(projectId: string): Promise<PrepareSearchResult> {
  const loaded = await loadSearchCriteria(projectId);
  if (!loaded.ok) {
    return { ok: false, error: loaded.reason === 'no_city' ? NO_CITY_ERROR : GENERIC_ERROR };
  }
  return {
    ok: true,
    criteria: loaded.criteria,
    fingerprint: searchFingerprint(loaded.criteria, loaded.address, loaded.settings),
    settings: loaded.settings,
  };
}
