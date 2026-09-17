/* global chrome */
// ACM Studio extension — service worker (Manifest V3).
//
// Three functions, nothing else : ping, fetchRobots, fetchPage. The extension
// N'ANALYSE RIEN — elle rapporte du texte, l'application l'analyse. Rien n'est
// stocké, rien n'est renvoyé ailleurs qu'à la page qui a appelé.
//
// Mission 46 : la page est ouverte dans une FENÊTRE discrète (non focalisée), pas
// un onglet caché — Chrome ne construit pas la page d'un onglet que personne ne
// regarde. On n'attend plus un délai fixe : on surveille la taille du HTML jusqu'à
// stabilité. Chaque étape est journalisée (la console vide du service worker est ce
// qui a coûté quatre jours).

// Pure decision helpers live in a chrome-free module so Vitest can import and test
// them (background.js itself cannot be imported — it calls chrome.* at load). The
// size floor, the waiting-title list and the host allow-list are defined and
// documented there.
import { isAllowedUrl, isStableSize, isWaitingShell } from './page-readiness.js';

const VERSION = chrome.runtime.getManifest().version;
const log = (...args) => console.log('[ACM ext]', ...args);

const POLL_MS = 500; // interval between size probes
const MAX_WAIT_MS = 15_000; // hard cap on waiting for the page to build
const LOW_SIZE = 50_000; // below this, a hidden window likely never rendered

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function waitForComplete(tabId, timeoutMs) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        chrome.tabs.onUpdated.removeListener(onUpdated);
        reject(new Error('timeout au chargement'));
      }
    }, timeoutMs);
    function onUpdated(updatedTabId, info) {
      if (updatedTabId === tabId && info.status === 'complete' && !settled) {
        settled = true;
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(onUpdated);
  });
}

// Reads the current HTML size and visibility of the tab. Returns null if the tab
// cannot be scripted yet.
async function probe(tabId) {
  try {
    const [{ result } = {}] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => ({
        size: document.documentElement.outerHTML.length,
        visibility: document.visibilityState,
        title: document.title,
      }),
    });
    return result ?? null;
  } catch {
    return null;
  }
}

// Waits until the HTML size is stable over two consecutive reads (< 2 % change)
// AND the page is not a waiting shell, or the hard cap is reached. Adapts to
// slow/fast portals instead of guessing — but a stable SHELL no longer ends the
// wait: we keep watching until the real page renders or the cap is hit.
async function waitForStableSize(tabId, startedAt) {
  let previous = null;
  let last = { size: 0, visibility: 'unknown', title: '' };
  let shellLogged = false;
  while (Date.now() - startedAt < MAX_WAIT_MS) {
    await sleep(POLL_MS);
    const reading = await probe(tabId);
    if (!reading) {
      continue;
    }
    last = reading;
    log(
      `taille=${reading.size} visibilité=${reading.visibility} titre=${JSON.stringify(reading.title ?? '')}`,
    );
    const stable = isStableSize(previous, reading.size);
    if (stable) {
      if (!isWaitingShell(reading)) {
        return last; // stable AND substantial → the page is finished
      }
      if (!shellLogged) {
        // The transition that was missing from the log: a page went stable while
        // still a shell, so we deliberately keep waiting instead of concluding.
        log(
          `coquille détectée (taille=${reading.size} titre=${JSON.stringify(reading.title ?? '')}), on continue d'attendre`,
        );
        shellLogged = true;
      }
    }
    previous = reading.size;
  }
  log(`plafond de ${MAX_WAIT_MS / 1000} s atteint — dernier état : ${last.size} caractères`);
  return last;
}

// Waits for a tab to build and reads its HTML. Takes a tabId (not a window), so the
// SAME window can be reused between pages in temps 2 (recherche automatique) — open
// once, navigate the tab, call this again, close at the end. `windowId` is the
// fetch window (for the rattrapage), `requestWindowId` the advisor's window.
async function loadAndRead(tabId, windowId, requestWindowId, startedAt) {
  await waitForComplete(tabId, MAX_WAIT_MS);
  log('status=complete');

  let stable = await waitForStableSize(tabId, startedAt);
  // "retenu", not "stabilisé" : this is the state we keep, whether it settled or the
  // cap was hit on a shell — the size tells the honest story.
  log(`état retenu : ${stable.size} caractères (visibilité=${stable.visibility})`);

  // The one rattrapage, tied to the real cause: a window Chrome marked hidden from
  // the start builds nothing. Bring it to front ONCE, wait again, then give focus
  // back to the advisor's window. A small-but-complete server-rendered page (not
  // hidden) does not trigger this.
  if (stable.size < LOW_SIZE && stable.visibility === 'hidden') {
    log('rattrapage : la fenêtre était masquée, passage au premier plan');
    await chrome.windows.update(windowId, { focused: true });
    stable = await waitForStableSize(tabId, Date.now());
    log(`après rattrapage : ${stable.size} (visibilité=${stable.visibility})`);
    if (requestWindowId != null) {
      await chrome.windows.update(requestWindowId, { focused: true }).catch(() => {});
    }
  }

  const [{ result } = {}] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => ({ html: document.documentElement.outerHTML, finalUrl: location.href }),
  });
  const durationMs = Date.now() - startedAt;
  if (!result || typeof result.html !== 'string' || result.html === '') {
    log(`échec : page vide (${durationMs} ms)`);
    return { ok: false, error: 'Page vide.', size: 0, durationMs };
  }
  log(`terminé : ${result.html.length} caractères en ${durationMs} ms`);
  return {
    ok: true,
    html: result.html,
    finalUrl: result.finalUrl,
    size: result.html.length,
    durationMs,
  };
}

// Opens the page in a discreet, non-focused window, reads it, and closes the window
// (always, even on error). `requestWindowId` is the advisor's ACM Studio window.
// Used for a ONE-OFF read (single-listing import) — one window, opened and closed.
async function fetchPage(rawUrl, requestWindowId) {
  if (!isAllowedUrl(rawUrl)) {
    return { ok: false, error: 'Adresse non autorisée par l’extension.' };
  }
  const startedAt = Date.now();
  let win;
  try {
    win = await chrome.windows.create({
      url: rawUrl,
      focused: false,
      width: 1024,
      height: 800,
      top: 60,
      left: 60,
    });
    const tabId = win.tabs[0].id;
    log(`fenêtre ouverte (win=${win.id} tab=${tabId}) ${rawUrl}`);
    return await loadAndRead(tabId, win.id, requestWindowId, startedAt);
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const message = error && error.message ? String(error.message) : 'Lecture de la page échouée.';
    log(`erreur : ${message} (${durationMs} ms)`); // the real cause is kept in the log
    return { ok: false, error: message, durationMs };
  } finally {
    if (win && win.id != null) {
      chrome.windows.remove(win.id).catch(() => {});
    }
  }
}

// MISSION 50 §10 — une recherche interroge quatre portails (parfois paginés). Une
// SEULE fenêtre est réutilisée entre les pages, jamais une par page (mission 46 §5) :
// openSearchWindow l'ouvre une fois, fetchInSearchWindow y navigue page après page,
// closeSearchWindow la ferme à la fin. La cadence (une seconde entre deux pages) est
// tenue par l'application qui orchestre la séquence, pas ici.
async function openSearchWindow() {
  try {
    // about:blank : la fenêtre naît vide et discrète ; chaque page arrive par
    // navigation du même onglet, pas par une nouvelle fenêtre.
    const win = await chrome.windows.create({
      url: 'about:blank',
      focused: false,
      width: 1024,
      height: 800,
      top: 60,
      left: 60,
    });
    log(`fenêtre de recherche ouverte (win=${win.id})`);
    return { ok: true, windowId: win.id };
  } catch (error) {
    const message =
      error && error.message ? String(error.message) : 'Ouverture de la fenêtre échouée.';
    log(`erreur ouverture fenêtre de recherche : ${message}`);
    return { ok: false, error: message };
  }
}

async function fetchInSearchWindow(rawUrl, windowId, requestWindowId) {
  if (!isAllowedUrl(rawUrl)) {
    return { ok: false, error: 'Adresse non autorisée par l’extension.' };
  }
  const startedAt = Date.now();
  try {
    const tabs = await chrome.tabs.query({ windowId });
    const tabId = tabs && tabs[0] ? tabs[0].id : null;
    if (tabId == null) {
      return { ok: false, error: 'Fenêtre de recherche introuvable.' };
    }
    await chrome.tabs.update(tabId, { url: rawUrl });
    log(`navigation fenêtre de recherche (win=${windowId} tab=${tabId}) ${rawUrl}`);
    // Même lecture que le one-off : on réutilise windowId pour le rattrapage éventuel.
    return await loadAndRead(tabId, windowId, requestWindowId, startedAt);
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const message = error && error.message ? String(error.message) : 'Lecture de la page échouée.';
    log(`erreur navigation fenêtre de recherche : ${message} (${durationMs} ms)`);
    return { ok: false, error: message, durationMs };
  }
}

async function closeSearchWindow(windowId) {
  try {
    await chrome.windows.remove(windowId);
    log(`fenêtre de recherche fermée (win=${windowId})`);
  } catch {
    // Déjà fermée : rien à faire.
  }
  return { ok: true };
}

// Reads a robots.txt from the SAME browser (same address) as the pages, so the app's
// politeness check reflects what the portal really answers. A plain fetch is enough —
// robots.txt is not rendered. The real HTTP status lets the app tell a genuine 404
// (allowed) from a refusal (not allowed).
async function fetchRobots(rawUrl) {
  if (!isAllowedUrl(rawUrl)) {
    return { ok: false, error: 'Adresse non autorisée par l’extension.' };
  }
  try {
    const response = await fetch(rawUrl, { method: 'GET', redirect: 'follow' });
    const text = await response.text();
    log(`robots.txt ${rawUrl} → ${response.status} (${text.length} caractères)`);
    return { ok: true, status: response.status, text: text.slice(0, 512 * 1024) };
  } catch (error) {
    log(`robots.txt ${rawUrl} → échec : ${error && error.message}`);
    return { ok: false, error: 'Lecture du robots.txt échouée.' };
  }
}

// One handler for the content-script relay (onMessage) and a direct
// externally_connectable call (onMessageExternal). Both answer asynchronously.
function handle(message, sender, sendResponse) {
  if (!message || typeof message !== 'object') {
    sendResponse({ ok: false, error: 'Message invalide.' });
    return;
  }
  const requestWindowId = sender && sender.tab ? sender.tab.windowId : undefined;
  if (message.kind === 'ping') {
    sendResponse({ ok: true, version: VERSION });
    return;
  }
  if (message.kind === 'fetchRobots' && typeof message.url === 'string') {
    fetchRobots(message.url).then(sendResponse);
    return true;
  }
  if (message.kind === 'fetchPage' && typeof message.url === 'string') {
    fetchPage(message.url, requestWindowId).then(sendResponse);
    return true; // keep the message channel open for the async response
  }
  // Mission 50 §10 — une seule fenêtre réutilisée pour toute une recherche.
  if (message.kind === 'openSearchWindow') {
    openSearchWindow().then(sendResponse);
    return true;
  }
  if (
    message.kind === 'fetchInSearchWindow' &&
    typeof message.url === 'string' &&
    typeof message.windowId === 'number'
  ) {
    fetchInSearchWindow(message.url, message.windowId, requestWindowId).then(sendResponse);
    return true;
  }
  if (message.kind === 'closeSearchWindow' && typeof message.windowId === 'number') {
    closeSearchWindow(message.windowId).then(sendResponse);
    return true;
  }
  sendResponse({ ok: false, error: 'Action inconnue.' });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) =>
  handle(message, sender, sendResponse),
);
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) =>
  handle(message, sender, sendResponse),
);
