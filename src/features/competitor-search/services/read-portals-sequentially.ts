import type { FetchFailureReason } from '@/features/comparable-import/services/fetch-listing-page';
import {
  extractSearchResults,
  filterAndDedupeCandidates,
} from '@/features/competitor-search/services/extract-search-results';
import type { PortalSearchLink } from '@/features/competitor-search/services/build-portal-search-urls';
import type { PortalSearchResult } from '@/features/competitor-search/types';

// MISSION 50 §10 — le câblage de la lecture des quatre portails.
//
// Une SEULE fenêtre, les portails lus L'UN APRÈS L'AUTRE (jamais en rafale), avec
// UNE SECONDE entre deux pages sur TOUS les portails — pas seulement Green Acres :
// quatre portails paginés font vite une douzaine de requêtes, et la seconde ne se
// voit pas quand on l'a annoncée à l'écran.
//
// Chaque portail est ISOLÉ : un portail qui ne répond pas, refuse ou rend une
// coquille n'empêche pas les trois autres d'aboutir. Un échec silencieux est pire
// qu'une recherche qui en annonce trois sur quatre (leçon du journal, mission 46).
//
// Trois échecs distincts, parce que l'écran n'en fait pas la même chose :
//   · refused     — le robots.txt INTERDIT ce chemin. Permanent → coller, jamais
//                   « réessayer ».
//   · unreachable — pas de réponse, délai dépassé, erreur réseau. Passager → on
//                   peut relancer.
//   · empty       — page reçue mais coquille ou zéro carte.

export type PortalReadOutcome =
  { ok: true; html: string; finalUrl: string } | { ok: false; reason: FetchFailureReason };

export type ReadPortalsDeps = {
  // Lit une page (tentative serveur, ou l'extension quand elle est branchée).
  readPage: (url: string) => Promise<PortalReadOutcome>;
  // Injectables pour le test ; défauts : une vraie seconde entre deux pages.
  sleep?: (ms: number) => Promise<void>;
  interPageDelayMs?: number;
};

const DEFAULT_DELAY_MS = 1_000;
const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const MESSAGES = {
  refused:
    'Ce portail interdit la lecture automatique de cette page. Ouvrez la recherche et collez le code de la page de résultats.',
  unreachable:
    'Ce portail n’a pas répondu. Vous pouvez relancer, ou coller le code de la page de résultats.',
  empty:
    'Aucune annonce détectée sur ce portail. Ouvrez la recherche et collez le code de la page de résultats.',
} as const;

// Un robots.txt qui interdit est le SEUL refus permanent (§10, point 1). Tout le
// reste — délai, réseau, 403, 404 — est « pas de réponse utilisable » : passager,
// l'écran propose de relancer ou de coller.
function statusFromReason(reason: FetchFailureReason): {
  status: 'refused' | 'unreachable';
  message: string;
} {
  if (reason === 'robots') {
    return { status: 'refused', message: MESSAGES.refused };
  }
  return { status: 'unreachable', message: MESSAGES.unreachable };
}

export async function readPortalsSequentially(
  links: PortalSearchLink[],
  deps: ReadPortalsDeps,
): Promise<PortalSearchResult[]> {
  const sleep = deps.sleep ?? defaultSleep;
  const delay = deps.interPageDelayMs ?? DEFAULT_DELAY_MS;
  const results: PortalSearchResult[] = [];

  for (let i = 0; i < links.length; i += 1) {
    const link = links[i];
    // Une seconde AVANT chaque page sauf la première : le rythme d'un visiteur poli,
    // tenu sur les quatre portails, pas seulement là où le portail l'exige.
    if (i > 0) {
      await sleep(delay);
    }

    let result: PortalSearchResult;
    try {
      const outcome = await deps.readPage(link.url);
      if (!outcome.ok) {
        const { status, message } = statusFromReason(outcome.reason);
        result = {
          portal: link.portal,
          label: link.label,
          searchUrl: link.url,
          status,
          message,
          candidates: [],
        };
      } else {
        const raw = extractSearchResults(outcome.html, outcome.finalUrl, link.portal);
        const { candidates } = filterAndDedupeCandidates(raw);
        result =
          candidates.length === 0
            ? {
                portal: link.portal,
                label: link.label,
                searchUrl: link.url,
                status: 'empty',
                message: MESSAGES.empty,
                candidates: [],
              }
            : {
                portal: link.portal,
                label: link.label,
                searchUrl: link.url,
                status: 'ok',
                message: null,
                candidates,
              };
      }
    } catch {
      // Une exception inattendue sur un portail n'emporte pas les autres : elle
      // devient le statut « injoignable » de CE portail, et la boucle continue.
      result = {
        portal: link.portal,
        label: link.label,
        searchUrl: link.url,
        status: 'unreachable',
        message: MESSAGES.unreachable,
        candidates: [],
      };
    }
    results.push(result);
  }

  return results;
}
