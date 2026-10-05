import {
  detectSearchPortal,
  extractSearchResults,
  filterAndDedupeCandidates,
} from '@/features/competitor-search/services/extract-search-results';
import {
  SEARCH_PORTAL_LABELS,
  SEARCH_PORTALS,
  type PortalSearchResult,
  type SearchPortal,
} from '@/features/competitor-search/types';

// MISSION 65 — « Lire ma recherche » : la page de résultats que le CONSEILLER a filtrée sur le
// portail (lue dans son onglet par l'extension, ou collée en repli) devient un résultat de
// portail, par le MÊME chemin que la recherche automatique : extractSearchResults →
// filterAndDedupeCandidates, puis rankCandidates (les quatre filtres de la mission 61) côté
// serveur. Rien n'est ajouté ni deviné ici ; aucune requête n'est envoyée au portail.

const PORTAL_ORIGINS: Record<SearchPortal, string> = {
  seloger: 'https://www.seloger.com/',
  bienici: 'https://www.bienici.com/',
  green_acres: 'https://www.green-acres.fr/',
  maisons_appartements: 'https://www.maisonsetappartements.fr/',
};

export type SearchPageRead =
  | {
      ok: true;
      portal: PortalSearchResult<SearchPortal>;
      // Cartes réellement lues sur la page, avant d'écarter les doublons.
      cardsRead: number;
      // Biens neufs gardés et marqués : le classement les tient en réserve (complément sous 3).
      newBuild: number;
      excludedDuplicates: number;
    }
  // `unknown_portal` : ni l'adresse ni le code ne désignent un portail lisible.
  // `no_cards` : portail reconnu, mais la page ne porte aucune carte d'annonce.
  | { ok: false; reason: 'unknown_portal' | 'no_cards' };

function portalFromUrl(pageUrl: string): SearchPortal | null {
  try {
    return detectSearchPortal(new URL(pageUrl).hostname);
  } catch {
    return null;
  }
}

// Un code collé n'a pas d'adresse : on reconnaît le portail aux MARQUEURS de ses cartes (ceux
// des lecteurs, propres à chaque portail). Le premier lecteur qui trouve une carte désigne le
// portail ; aucun → null.
export function guessSearchPortal(html: string): SearchPortal | null {
  for (const portal of SEARCH_PORTALS) {
    if (extractSearchResults(html, PORTAL_ORIGINS[portal], portal, 1).length > 0) {
      return portal;
    }
  }
  return null;
}

// `pageUrl` = l'adresse de l'onglet lu par l'extension ; null pour un code collé.
export function readSearchPage(html: string, pageUrl: string | null): SearchPageRead {
  const portal = pageUrl != null ? portalFromUrl(pageUrl) : guessSearchPortal(html);
  if (portal == null) {
    // Onglet d'un site inconnu → portail non reconnu. Code collé où aucun lecteur ne trouve
    // de carte → on ne peut dire qu'une chose : aucune annonce détectée.
    return { ok: false, reason: pageUrl != null ? 'unknown_portal' : 'no_cards' };
  }
  const searchUrl = pageUrl ?? PORTAL_ORIGINS[portal];
  const cards = extractSearchResults(html, searchUrl, portal);
  const { candidates, newBuild, excludedDuplicates } = filterAndDedupeCandidates(cards);
  if (candidates.length === 0) {
    return { ok: false, reason: 'no_cards' };
  }
  return {
    ok: true,
    portal: {
      portal,
      label: SEARCH_PORTAL_LABELS[portal],
      searchUrl,
      status: 'ok',
      message: null,
      candidates,
    },
    cardsRead: cards.length,
    newBuild,
    excludedDuplicates,
  };
}
