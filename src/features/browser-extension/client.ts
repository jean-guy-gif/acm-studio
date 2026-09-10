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

type Pending = { kind: 'ping' | 'fetchPage' | 'fetchRobots'; url?: string };

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
