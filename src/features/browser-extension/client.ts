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

// Correctif du 13/10 — UN signal attendu 800 ms concluait « absente » à tort avec la version du
// Chrome Web Store : le script de contenu n'est injecté qu'à `document_idle`, après le premier
// signal de la page, et le service worker de l'extension peut être en veille. Le signal est donc
// renvoyé : 4 essais d'une seconde, soit 4 secondes avant de conclure.
export const PING_ATTEMPTS = 4;
export const PING_ATTEMPT_TIMEOUT_MS = 1_000;
// Ouvrir et fermer la fenêtre de recherche : inchangés (4,8 s et 2,8 s).
const OPEN_WINDOW_TIMEOUT_MS = 4_800;
const CLOSE_WINDOW_TIMEOUT_MS = 2_800;
const FETCH_TIMEOUT_MS = 50_000;
const ROBOTS_TIMEOUT_MS = 8_000;
// Ouvrir quatre onglets : rapide. Tout lire : jusqu'à 15 s d'attente par onglet (mission 46).
const OPEN_TABS_TIMEOUT_MS = 10_000;
const READ_TABS_TIMEOUT_MS = 120_000;

// Mission 105 — `noSiteAccess` : l'extension est installée (elle répond à l'appel direct) mais
// Chrome ne lui laisse pas lire ACM Studio (« Accès aux sites » restreint) : le relais de la page
// n'est pas injecté.
export type ExtensionPing = { available: boolean; version?: string; noSiteAccess?: true };
// The size + duration let the app say, when the parser finds nothing, whether it
// received a full page (~286 000 chars for a complete Bien'ici fiche) or a shell
// (< 50 000). The real cause is kept in the extension's service-worker log.
export type ExtensionFetchResult =
  | { ok: true; html: string; finalUrl: string; size: number; durationMs: number }
  | { ok: false; error: string; size?: number; durationMs?: number };
// A robots.txt read by the extension: the real HTTP status lets the app tell a
// genuine 404 (allowed) from a refusal (not allowed). `{ ok: false }` = read failed.
// Mission 105 — `unreachable` : aucune extension n'a répondu (absente, désactivée, ou sans
// accès au site) — à distinguer d'une lecture du robots.txt qui a échoué.
export type ExtensionRobotsResult =
  { ok: true; status: number; text: string } | { ok: false; unreachable?: true };

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

// Le signal, réessayé. `attempt` rend la réponse de l'extension, ou null quand rien n'a répondu
// à temps. La première réponse décide — même un refus : une extension qui répond est là — ;
// « absente » ne se conclut qu'après le dernier essai resté sans réponse.
export async function pingWithRetries(
  attempt: () => Promise<ExtensionPing | null>,
  attempts: number = PING_ATTEMPTS,
): Promise<ExtensionPing> {
  for (let index = 0; index < attempts; index += 1) {
    const answer = await attempt().catch(() => null);
    if (answer != null) {
      return answer;
    }
  }
  return { available: false };
}

// Mission 105 — une fois l'extension détectée, l'onglet s'en souvient : les clics suivants ne
// font plus les 4 secondes du correctif. Mission 108 — DEUX essais, plus un : le service worker de
// l'extension peut être en veille, et un seul signal manqué la disait « absente » à tort.
const DETECTED_KEY = 'acm-extension-detected';
export const REMEMBERED_PING_ATTEMPTS = 2;
// Mission 108 — sans extension, l'attente n'a lieu qu'UNE fois par onglet : les clics suivants
// disent tout de suite le message d'installation ; « Réessayer » refait la détection complète.
const ABSENT_KEY = 'acm-extension-absent';
type TabMemory = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function tabMemory(): TabMemory | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

// L'appel direct au service worker de l'extension (son manifeste l'autorise depuis ACM Studio,
// `externally_connectable`), par l'identifiant du Store, lu dans l'environnement.
type ChromeRuntime = {
  sendMessage: (id: string, message: unknown, callback: (response: unknown) => void) => void;
  lastError?: unknown;
};

export async function pingDirect(
  extensionId: string | undefined = process.env.NEXT_PUBLIC_EXTENSION_ID,
  timeoutMs: number = PING_ATTEMPT_TIMEOUT_MS,
): Promise<{ version?: string } | null> {
  const runtime = (globalThis as { chrome?: { runtime?: ChromeRuntime } }).chrome?.runtime;
  if (!extensionId || !runtime?.sendMessage) return null;
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    try {
      runtime.sendMessage(extensionId, { kind: 'ping' }, (response) => {
        clearTimeout(timer);
        const answer = response as { ok?: boolean; version?: string } | undefined;
        resolve(runtime.lastError || answer?.ok !== true ? null : { version: answer.version });
      });
    } catch {
      clearTimeout(timer);
      resolve(null);
    }
  });
}

function remember(memory: TabMemory | null, write: (memory: TabMemory) => void): void {
  try {
    if (memory) write(memory);
  } catch {
    // Mémoire refusée : on redétectera, c'est tout.
  }
}

export async function detectExtension(deps: {
  relay: () => Promise<ExtensionPing | null>;
  direct: () => Promise<{ version?: string } | null>;
  memory: TabMemory | null;
  // « Réessayer » : la détection complète, sans tenir compte de ce que l'onglet a retenu.
  force?: boolean;
}): Promise<ExtensionPing> {
  let remembered = false;
  let absent: string | null = null;
  try {
    remembered = deps.memory?.getItem(DETECTED_KEY) === '1';
    absent = deps.memory?.getItem(ABSENT_KEY) ?? null;
  } catch {
    remembered = false;
  }
  if (!deps.force && !remembered && absent != null) {
    return absent === 'no_site_access'
      ? { available: false, noSiteAccess: true }
      : { available: false };
  }
  const result = await pingWithRetries(
    deps.relay,
    remembered && !deps.force ? REMEMBERED_PING_ATTEMPTS : PING_ATTEMPTS,
  );
  if (result.available) {
    remember(deps.memory, (memory) => {
      memory.setItem(DETECTED_KEY, '1');
      memory.removeItem(ABSENT_KEY);
    });
    return result;
  }
  remember(deps.memory, (memory) => memory.removeItem(DETECTED_KEY));
  // Le relais de la page n'a pas répondu : l'extension est-elle là, mais sans accès au site ?
  const direct = await deps.direct().catch(() => null);
  const missing: ExtensionPing = direct
    ? { available: false, version: direct.version, noSiteAccess: true }
    : result;
  // Retenu seulement après une détection COMPLÈTE : un service worker en veille, après une
  // première détection réussie, n'est pas une extension absente.
  if (!remembered || deps.force) {
    remember(deps.memory, (memory) =>
      memory.setItem(ABSENT_KEY, missing.noSiteAccess ? 'no_site_access' : 'absent'),
    );
  }
  return missing;
}

let lastPing: ExtensionPing | null = null;

// La dernière détection, pour dire LE bon message (« sans accès » ou « à installer »).
export function lastExtensionPing(): ExtensionPing | null {
  return lastPing;
}

// "Es-tu là ?" — resolves { available: false } when no extension answers in time.
export async function pingExtension(options: { force?: boolean } = {}): Promise<ExtensionPing> {
  lastPing = await detectExtension({
    force: options.force,
    relay: async () => {
      try {
        const response = await send<{ ok?: boolean; version?: string }>(
          { kind: 'ping' },
          PING_ATTEMPT_TIMEOUT_MS,
        );
        return { available: response.ok === true, version: response.version };
      } catch {
        return null;
      }
    },
    direct: () => pingDirect(),
    memory: tabMemory(),
  });
  return lastPing;
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
    // Pas de réponse du tout : l'extension n'est pas là pour lire.
    return { ok: false, unreachable: true };
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
      OPEN_WINDOW_TIMEOUT_MS,
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
    await send<{ ok?: boolean }>({ kind: 'closeSearchWindow', windowId }, CLOSE_WINDOW_TIMEOUT_MS);
  } catch {
    // La fenêtre se ferme d'elle-même si l'extension ne répond pas ; rien à forcer.
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
