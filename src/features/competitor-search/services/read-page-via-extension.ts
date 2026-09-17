import { decideRobotsAllowed } from '@/features/comparable-import/services/robots-decision';
import {
  fetchInSearchWindowViaExtension,
  fetchPageViaExtension,
  fetchRobotsViaExtension,
  type ExtensionRobotsResult,
} from '@/features/browser-extension/client';
import type { PortalReadOutcome } from '@/features/competitor-search/services/read-portals-sequentially';

// MISSION 50 §10 — lecture d'une page de résultats PAR L'EXTENSION (navigateur du
// conseiller). On lit le robots.txt AVANT chaque adresse (l'extension le rapporte
// avec son vrai statut HTTP), on décide avec robots-decision.ts (RFC 9309 : 5xx /
// injoignable = interdit), puis on lit la page. Le robots.txt est mis en cache PAR
// HÔTE pour ne pas le relire à chaque page.
//
// Trois issues, comme l'orchestrateur les attend : robots interdit → refused
// (permanent), lecture ratée → unreachable (passager), page reçue → ok (l'orchestrateur
// conclura empty si zéro carte).

export type PortalRobotsCache = Map<string, ExtensionRobotsResult>;

async function robotsAllows(url: URL, cache: PortalRobotsCache): Promise<boolean> {
  const host = url.host;
  let source = cache.get(host);
  if (!source) {
    source = await fetchRobotsViaExtension(`${url.origin}/robots.txt`);
    cache.set(host, source);
  }
  return decideRobotsAllowed(source, url.pathname + url.search);
}

export type ReadPageViaExtensionOptions = {
  // Fenêtre de recherche réutilisée entre les pages. Absente → lecture one-off
  // (fenêtre ouverte puis fermée par l'extension), pour une relance d'un seul portail.
  windowId?: number;
  robotsCache: PortalRobotsCache;
};

export async function readPageViaExtension(
  rawUrl: string,
  options: ReadPageViaExtensionOptions,
): Promise<PortalReadOutcome> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, reason: 'invalid' };
  }

  if (!(await robotsAllows(url, options.robotsCache))) {
    return { ok: false, reason: 'robots' };
  }

  const page =
    options.windowId != null
      ? await fetchInSearchWindowViaExtension(rawUrl, options.windowId)
      : await fetchPageViaExtension(rawUrl);

  if (!page.ok) {
    // Lecture ratée par l'extension : un motif « réseau » → l'orchestrateur en fait
    // le statut « unreachable » (seul un robots.txt interdit donne « refused »).
    return { ok: false, reason: 'network' };
  }
  return { ok: true, html: page.html, finalUrl: page.finalUrl };
}
