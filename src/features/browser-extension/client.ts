// App-side bridge to the ACM Studio browser extension (mission « L'extension
// navigateur »). The page cannot reach the extension's service worker directly, so
// it talks to the extension's content script over window.postMessage; the content
// script relays to the background and posts the answer back.
//
// Protocol (kept in sync with extension/content-bridge.js):
//   page   → window.postMessage({ __acmStudio: 'request', id, kind, url? })
//   bridge → window.postMessage({ __acmStudio: 'response', id, ...result })
//
// Nothing here trusts the extension blindly: the caller still validates robots
// server-side BEFORE asking for a page, and re-validates the returned HTML with the
// existing import parser. This module only moves bytes.

const PING_TIMEOUT_MS = 800;
const FETCH_TIMEOUT_MS = 50_000;
const ROBOTS_TIMEOUT_MS = 8_000;
const OPEN_TAB_TIMEOUT_MS = 10_000;
// Ouvrir quatre onglets : rapide. Tout lire : jusqu'à 15 s d'attente par onglet (mission 46).
const OPEN_TABS_TIMEOUT_MS = 10_000;
const READ_TABS_TIMEOUT_MS = 120_000;

export type ExtensionPing = { available: boolean; version?: string };
// The size + duration let the app say, when the parser finds nothing, whether it
// received a full page (~286 000 chars for a complete Bien'ici fiche) or a shell
// (< 50 000). The real cause is kept in the extension's service-worker log.
export type ExtensionFetchResult =
  | { ok: true; html: string; finalUrl: string; size: number; durationMs: number }
  | { ok: false; error: string; size?: number; durationMs?: number };
// A robots.txt read by the extension: the real HTTP status lets the app tell a
// genuine 404 (allowed) from a refusal (not allowed). `{ ok: false }` = read failed.
export type ExtensionRobotsResult = { ok: true; status: number; text: string } | { ok: false };

// MISSION 65 — « Lire ma recherche » : un onglet de résultats que le conseiller a laissé
// ouvert. Soit la page lue, soit la liste des onglets candidats (à lui de choisir), soit un
// échec nommé : `none` (aucun onglet de recherche), `outdated` (extension installée trop
// ancienne pour connaître readOpenTab), `error` (lecture ratée).
export type OpenSearchTab = { tabId: number; title: string; url: string };
export type ExtensionOpenTabResult =
  | { ok: true; kind: 'page'; html: string; finalUrl: string; title: string }
  | { ok: true; kind: 'choose'; tabs: OpenSearchTab[] }
  | { ok: false; reason: 'none' | 'outdated' | 'error' };

// MISSION 69 — « Lire mes recherches » : chaque onglet de recherche lu, ou la raison pour laquelle
// il ne l'a pas été — `waiting` : resté sur l'écran d'attente du portail (cliquer une fois dessus).
export type ExtensionSearchTabRead =
  | { ok: true; tabId: number; url: string; title: string; html: string; finalUrl: string }
  | { ok: false; tabId: number; url: string; title: string; reason: 'waiting' | 'error' };
export type ExtensionSearchTabsResult =
  | { ok: true; pages: ExtensionSearchTabRead[] }
  | { ok: false; reason: 'none' | 'outdated' | 'error' };

type Pending = {
  kind:
    | 'ping'
    | 'fetchPage'
    | 'fetchRobots'
    | 'openSearchWindow'
    | 'fetchInSearchWindow'
    | 'closeSearchWindow'
    | 'readOpenTab'
    | 'openSearchTabs'
    | 'readSearchTabs';
  url?: string;
  urls?: string[];
  windowId?: number;
  tabId?: number;
};

let requestCounter = 0;

// Sends one request to the extension and resolves with its response, or rejects on
// timeout. Each request carries a unique id so concurrent calls never cross.
function send<T>(request: Pending, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('no window'));
      return;
    }
    requestCounter += 1;
    const id = `acm-${Date.now()}-${requestCounter}`;

    const timer = window.setTimeout(() => {
      window.removeEventListener('message', onMessage);
      reject(new Error('timeout'));
    }, timeoutMs);

    function onMessage(event: MessageEvent) {
      if (event.source !== window || event.origin !== window.location.origin) {
        return;
      }
      const data = event.data as { __acmStudio?: string; id?: string } | null;
      if (!data || data.__acmStudio !== 'response' || data.id !== id) {
        return;
      }
      window.clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      resolve(data as T);
    }

    window.addEventListener('message', onMessage);
    window.postMessage({ __acmStudio: 'request', id, ...request }, window.location.origin);
  });
}

// "Es-tu là ?" — resolves { available: false } when no extension answers in time.
export async function pingExtension(): Promise<ExtensionPing> {
  try {
    const response = await send<{ ok?: boolean; version?: string }>(
      { kind: 'ping' },
      PING_TIMEOUT_MS,
    );
    return { available: response.ok === true, version: response.version };
  } catch {
    return { available: false };
  }
}

// Asks the extension to read a robots.txt from the advisor's browser (same address
// as the pages). Returns { ok: false } when the read fails — the caller then does
// NOT conclude "allowed".
export async function fetchRobotsViaExtension(url: string): Promise<ExtensionRobotsResult> {
  try {
    const response = await send<{ ok?: boolean; status?: number; text?: string }>(
      { kind: 'fetchRobots', url },
      ROBOTS_TIMEOUT_MS,
    );
    if (response.ok === true && typeof response.status === 'number') {
      return { ok: true, status: response.status, text: response.text ?? '' };
    }
    return { ok: false };
  } catch {
    return { ok: false };
  }
}

// Asks the extension to open the page and return its rendered HTML.
export async function fetchPageViaExtension(url: string): Promise<ExtensionFetchResult> {
  try {
    const response = await send<ExtensionFetchResult>({ kind: 'fetchPage', url }, FETCH_TIMEOUT_MS);
    return response;
  } catch {
    return { ok: false, error: 'L’extension n’a pas répondu.' };
  }
}

// MISSION 50 §10 — une SEULE fenêtre réutilisée pour toute une recherche. L'app
// l'ouvre une fois, lit chaque page dedans (en tenant la cadence d'une seconde entre
// deux pages, côté app), puis la ferme. Ouvrir/fermer une fenêtre par page est
// interdit (mission 46 §5).
export async function openSearchWindowViaExtension(): Promise<{ ok: boolean; windowId?: number }> {
  try {
    const response = await send<{ ok?: boolean; windowId?: number }>(
      { kind: 'openSearchWindow' },
      PING_TIMEOUT_MS + 4_000,
    );
    return { ok: response.ok === true, windowId: response.windowId };
  } catch {
    return { ok: false };
  }
}

export async function fetchInSearchWindowViaExtension(
  url: string,
  windowId: number,
): Promise<ExtensionFetchResult> {
  try {
    return await send<ExtensionFetchResult>(
      { kind: 'fetchInSearchWindow', url, windowId },
      FETCH_TIMEOUT_MS,
    );
  } catch {
    return { ok: false, error: 'L’extension n’a pas répondu.' };
  }
}

export async function closeSearchWindowViaExtension(windowId: number): Promise<void> {
  try {
    await send<{ ok?: boolean }>({ kind: 'closeSearchWindow', windowId }, PING_TIMEOUT_MS + 2_000);
  } catch {
    // La fenêtre se ferme d'elle-même si l'extension ne répond pas ; rien à forcer.
  }
}

// MISSION 65 — lit l'onglet de recherche DÉJÀ ouvert par le conseiller (aucune requête au
// portail). `tabId` = l'onglet qu'il a choisi quand il y en avait plusieurs. Une extension
// 0.1.0 ne connaît pas `readOpenTab` : son pont retombe sur « ping » et répond sans `kind` —
// on le reconnaît (`outdated`) au lieu de prendre un ping pour une page.
export async function readOpenTabViaExtension(tabId?: number): Promise<ExtensionOpenTabResult> {
  try {
    const response = await send<{
      ok?: boolean;
      kind?: string;
      reason?: string;
      html?: string;
      finalUrl?: string;
      title?: string;
      tabs?: OpenSearchTab[];
    }>({ kind: 'readOpenTab', tabId }, OPEN_TAB_TIMEOUT_MS);
    if (response.ok === true) {
      if (
        response.kind === 'page' &&
        typeof response.html === 'string' &&
        typeof response.finalUrl === 'string'
      ) {
        return {
          ok: true,
          kind: 'page',
          html: response.html,
          finalUrl: response.finalUrl,
          title: response.title ?? '',
        };
      }
      if (response.kind === 'choose' && Array.isArray(response.tabs)) {
        return { ok: true, kind: 'choose', tabs: response.tabs };
      }
      return { ok: false, reason: 'outdated' };
    }
    return { ok: false, reason: response.reason === 'none' ? 'none' : 'error' };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

// MISSION 69 — ouvre les recherches déjà filtrées dans des onglets visibles (c'est l'extension qui
// ouvre : plusieurs window.open sur un clic seraient bloqués). `outdated` : extension sans cette
// action (son pont retombe sur « ping » et répond sans `opened`).
export async function openSearchTabsViaExtension(
  urls: string[],
): Promise<{ ok: true; opened: number } | { ok: false; reason: 'outdated' | 'error' }> {
  try {
    const response = await send<{ ok?: boolean; opened?: number; version?: string }>(
      { kind: 'openSearchTabs', urls },
      OPEN_TABS_TIMEOUT_MS,
    );
    if (response.ok === true && typeof response.opened === 'number') {
      return { ok: true, opened: response.opened };
    }
    return { ok: false, reason: response.ok === true ? 'outdated' : 'error' };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

// MISSION 69 — lit tous les onglets de recherche ouverts, chacun activé le temps de se construire.
export async function readSearchTabsViaExtension(): Promise<ExtensionSearchTabsResult> {
  try {
    const response = await send<{
      ok?: boolean;
      kind?: string;
      reason?: string;
      pages?: ExtensionSearchTabRead[];
    }>({ kind: 'readSearchTabs' }, READ_TABS_TIMEOUT_MS);
    if (response.ok === true) {
      if (response.kind === 'pages' && Array.isArray(response.pages)) {
        return { ok: true, pages: response.pages };
      }
      return { ok: false, reason: 'outdated' };
    }
    return { ok: false, reason: response.reason === 'none' ? 'none' : 'error' };
  } catch {
    return { ok: false, reason: 'error' };
  }
}
