import { filterAndDedupeCandidates } from '@/features/competitor-search/services/extract-search-results';
import { readSearchPage } from '@/features/competitor-search/services/read-search-page';
import {
  SEARCH_PORTAL_LABELS,
  type PortalSearchResult,
  type RankedCandidate,
  type SearchPortal,
} from '@/features/competitor-search/types';

// MISSION 69 — « Lire mes recherches » : plusieurs onglets lus d'un coup deviennent UN résultat
// par portail (deux onglets du même portail sont fusionnés, doublons écartés), par le même chemin
// que la lecture d'un seul onglet (readSearchPage, mission 65). Le classement (filtres M61) se
// fait ensuite côté serveur, sur l'ensemble.

export type SearchPageInput = { html: string; url: string };

export type PortalReadCount = { portal: SearchPortal; label: string; cardsRead: number };

export type SearchPagesRead = {
  portals: PortalSearchResult[];
  counts: PortalReadCount[];
  // Onglets lus sans carte d'annonce exploitable (page sans liste, portail non reconnu).
  emptyUrls: string[];
  // Pour l'apprentissage des identifiants de commune : l'adresse et les communes des cartes.
  learnInput: { url: string; cardCities: (string | null)[] }[];
};

export function readSearchPages(pages: SearchPageInput[]): SearchPagesRead {
  const byPortal = new Map<SearchPortal, PortalSearchResult>();
  const cardsRead = new Map<SearchPortal, number>();
  const emptyUrls: string[] = [];
  const learnInput: SearchPagesRead['learnInput'] = [];

  for (const page of pages) {
    const read = readSearchPage(page.html, page.url);
    if (!read.ok) {
      emptyUrls.push(page.url);
      continue;
    }
    const { portal } = read.portal;
    learnInput.push({
      url: page.url,
      cardCities: read.portal.candidates.map((candidate) => candidate.city),
    });
    cardsRead.set(portal, (cardsRead.get(portal) ?? 0) + read.cardsRead);
    const previous = byPortal.get(portal);
    byPortal.set(
      portal,
      previous == null
        ? read.portal
        : {
            ...previous,
            candidates: filterAndDedupeCandidates([
              ...previous.candidates,
              ...read.portal.candidates,
            ]).candidates,
          },
    );
  }

  const portals = [...byPortal.values()];
  return {
    portals,
    counts: portals.map(({ portal }) => ({
      portal,
      label: SEARCH_PORTAL_LABELS[portal],
      cardsRead: cardsRead.get(portal) ?? 0,
    })),
    emptyUrls,
    learnInput,
  };
}

// Le récapitulatif par portail, après classement : « SeLoger : 30 annonces lues, 4 retenues ».
export function describeReadCounts(counts: PortalReadCount[], ranked: RankedCandidate[]): string[] {
  return counts.map(({ portal, label, cardsRead }) => {
    const kept = ranked.filter((entry) => entry.portal === portal).length;
    return `${label} : ${cardsRead} annonce${cardsRead > 1 ? 's' : ''} lue${cardsRead > 1 ? 's' : ''}, ${kept} retenue${kept > 1 ? 's' : ''}`;
  });
}
