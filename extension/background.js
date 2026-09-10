/* global chrome */
// ACM Studio extension — service worker (Manifest V3).
//
// Three functions, nothing else (mission « L'extension navigateur ») :
//   1. ping        → "je suis là".
//   2. fetchPage   → ouvre RÉELLEMENT la page dans un onglet en arrière-plan, attend
//                    que le contenu soit rendu (Bien'ici / SeLoger construisent la
//                    page côté navigateur), lit outerHTML, ferme l'onglet.
//
// L'extension N'ANALYSE RIEN : elle rapporte du texte, l'application l'analyse avec
// son code existant. Elle ne stocke rien et ne renvoie qu'à la page qui a appelé.

const VERSION = chrome.runtime.getManifest().version;

// Défense en profondeur : la page demandée doit appartenir à un portail autorisé,
// en plus des host_permissions du manifeste.
const ALLOWED_HOST_SUFFIXES = [
  'seloger.com',
  'bienici.com',
  'green-acres.fr',
  'immobilier.lefigaro.fr',
  'maisonsetappartements.fr',
  'leboncoin.fr',
];

// Laisse le temps aux portails rendus côté client de peupler le DOM avant lecture.
const SETTLE_MS = 3500;
const LOAD_TIMEOUT_MS = 45000;

function isAllowedUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') {
    return false;
  }
  const host = url.hostname.toLowerCase();
  return ALLOWED_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

function waitForComplete(tabId, timeoutMs) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        chrome.tabs.onUpdated.removeListener(onUpdated);
        reject(new Error('timeout'));
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

async function fetchPage(rawUrl) {
  if (!isAllowedUrl(rawUrl)) {
    return { ok: false, error: 'Adresse non autorisée par l’extension.' };
  }
  let tab;
  try {
    tab = await chrome.tabs.create({ url: rawUrl, active: false });
  } catch {
    return { ok: false, error: 'Impossible d’ouvrir la page.' };
  }
  try {
    await waitForComplete(tab.id, LOAD_TIMEOUT_MS);
    // The page reports "complete" before client-side rendering fills the DOM.
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
    const [{ result } = {}] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => ({ html: document.documentElement.outerHTML, finalUrl: location.href }),
    });
    if (!result || typeof result.html !== 'string' || result.html === '') {
      return { ok: false, error: 'Page vide.' };
    }
    return { ok: true, html: result.html, finalUrl: result.finalUrl };
  } catch (error) {
    return {
      ok: false,
      error:
        error && error.message === 'timeout' ? 'Délai dépassé.' : 'Lecture de la page échouée.',
    };
  } finally {
    if (tab && tab.id != null) {
      chrome.tabs.remove(tab.id).catch(() => {});
    }
  }
}

// Reads a robots.txt from the SAME browser (same address) as the pages, so the
// application's politeness check reflects what the portal really answers. A plain
// fetch is enough — robots.txt is not rendered. The real HTTP status is returned so
// the app can tell a genuine 404 (allowed) from a refusal (not allowed).
async function fetchRobots(rawUrl) {
  if (!isAllowedUrl(rawUrl)) {
    return { ok: false, error: 'Adresse non autorisée par l’extension.' };
  }
  try {
    const response = await fetch(rawUrl, { method: 'GET', redirect: 'follow' });
    const text = await response.text();
    return { ok: true, status: response.status, text: text.slice(0, 512 * 1024) };
  } catch {
    return { ok: false, error: 'Lecture du robots.txt échouée.' };
  }
}

// One handler for both the content-script relay (onMessage) and a direct
// externally_connectable call (onMessageExternal). Both answer asynchronously.
function handle(message, sendResponse) {
  if (!message || typeof message !== 'object') {
    sendResponse({ ok: false, error: 'Message invalide.' });
    return;
  }
  if (message.kind === 'ping') {
    sendResponse({ ok: true, version: VERSION });
    return;
  }
  if (message.kind === 'fetchRobots' && typeof message.url === 'string') {
    fetchRobots(message.url).then(sendResponse);
    return true; // keep the message channel open for the async response
  }
  if (message.kind === 'fetchPage' && typeof message.url === 'string') {
    fetchPage(message.url).then(sendResponse);
    return true; // keep the message channel open for the async response
  }
  sendResponse({ ok: false, error: 'Action inconnue.' });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) =>
  handle(message, sendResponse),
);
chrome.runtime.onMessageExternal.addListener((message, _sender, sendResponse) =>
  handle(message, sendResponse),
);
