// Pure page-readiness helpers for the ACM Studio extension service worker.
//
// EXTRACTED from background.js so they can be unit-tested: background.js pulls in
// chrome.* (and calls it at load), so it cannot be imported under Node/Vitest.
// NOTHING here may touch chrome.* — that is the whole point. background.js imports
// these; the tests import them too.

// Host suffixes the extension is allowed to open and read. MUST stay the EXACT twin
// of the manifest host_permissions. leboncoin.fr is deliberately ABSENT: its
// robots.txt forbids /ad/ — the listing path itself — so the import would be refused
// at the robots-check. Ne pas le rajouter (ni ici, ni dans le manifeste).
export const ALLOWED_HOST_SUFFIXES = [
  'seloger.com',
  'bienici.com',
  'green-acres.fr',
  'immobilier.lefigaro.fr',
  'maisonsetappartements.fr',
];

export function isAllowedUrl(rawUrl) {
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

// MISSION 65 — « Lire ma recherche » : les portails dont ACM Studio sait lire une page de
// RÉSULTATS (immobilier.lefigaro.fr n'a pas de lecteur de cartes, il n'y figure pas).
export const SEARCH_HOST_SUFFIXES = [
  'seloger.com',
  'bienici.com',
  'green-acres.fr',
  'maisonsetappartements.fr',
];

// Une page d'ANNONCE (pas de résultats), reconnue au chemin : /annonce(s)/ (SeLoger, Bien'ici),
// /properties/ (Green Acres), /ads/ et ficheAnnonce (Maisons & Appartements).
const LISTING_PATH = /\/annonces?\/|\/properties\/|\/ads\/|ficheannonce/i;

// Un onglet « de recherche » = un portail lisible, en https, ni l'accueil ni une fiche
// d'annonce. Les formes d'adresse de résultats varient trop d'un portail à l'autre pour être
// énumérées ; on écarte ce qui n'en est sûrement pas, et l'application dira « aucune annonce
// détectée » si la page lue ne porte pas de carte.
export function isSearchTabUrl(rawUrl) {
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
  if (!SEARCH_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`))) {
    return false;
  }
  if (url.pathname === '/' || url.pathname === '') {
    return false;
  }
  return !LISTING_PATH.test(url.pathname);
}

// MISSION 69 — « Lire mes recherches » lit TOUS les onglets de recherche d'un coup : la liste
// (même règle que la lecture d'un seul onglet — un onglet en veille n'est pas rechargé).
// Que faire des onglets ouverts : aucun onglet de recherche → 'none' ; un seul → on le lit ;
// plusieurs → on renvoie la liste et c'est le conseiller qui choisit (jamais l'extension).
// Un onglet mis en veille par Chrome (`discarded`) est ignoré : le lire le RECHARGERAIT, et
// « Lire ma recherche » n'envoie aucune requête au portail.
export function listSearchTabs(tabs) {
  return (tabs || [])
    .filter((tab) => tab && typeof tab.id === 'number' && !tab.discarded && isSearchTabUrl(tab.url))
    .map((tab) => ({
      tabId: tab.id,
      windowId: tab.windowId,
      title: tab.title || '',
      url: tab.url,
    }));
}

export function decideOpenTab(tabs) {
  const candidates = listSearchTabs(tabs).map(({ tabId, title, url }) => ({ tabId, title, url }));
  if (candidates.length === 0) {
    return { kind: 'none' };
  }
  if (candidates.length === 1) {
    return { kind: 'read', tab: candidates[0] };
  }
  return { kind: 'choose', tabs: candidates };
}

// Below this many characters, a "stabilised" page is a WAITING SHELL, not a finished
// page. Mesuré le 2026-09-16 sur maisonsetappartements.fr/ads/4534734 : la page
// d'attente fait 29–33 k, les vraies fiches 233 k–756 k — 60 k passe largement entre
// les deux. Général, pas propre à ce portail (même cause que la coquille Bien'ici du
// 10 septembre 2026, un onglet/fenêtre qui renvoyait sa coquille comme page finie).
export const SIZE_FLOOR = 60_000;

// Waiting-page titles, ONE entry per REAL measurement. Never invent one: each pattern
// MUST cite the portal and the date it was seen, or it does not belong here.
export const WAITING_TITLES = [
  // maisonsetappartements.fr — mesuré le 2026-09-16 : la page d'attente titre « Un instant… ».
  { portal: 'maisonsetappartements.fr', since: '2026-09-16', pattern: /un instant/i },
];

// Two signals mark a page as an unfinished shell (either is enough): it is smaller
// than SIZE_FLOOR, or its title is a known waiting title. A shell is never accepted
// on stability — the caller keeps watching to the cap and logs the last state.
export function isWaitingShell(reading) {
  if (!reading || typeof reading.size !== 'number') {
    return true;
  }
  if (reading.size < SIZE_FLOOR) {
    return true;
  }
  const title = (reading.title || '').trim();
  return WAITING_TITLES.some((entry) => entry.pattern.test(title));
}

// "stable" = two consecutive size reads within 2 %. The first read (no previous) is
// never stable.
export const STABLE_DELTA = 0.02;

export function isStableSize(previous, current) {
  if (previous == null) {
    return false;
  }
  return Math.abs(current - previous) / Math.max(current, 1) < STABLE_DELTA;
}

// MISSION 69 — « Ouvrir mes recherches » : seules des adresses de RECHERCHE des portails lisibles
// sont ouvertes (jamais une autre adresse, même autorisée), et jamais deux fois la même : un
// onglet déjà ouvert sur cette adresse exacte n'est pas dupliqué.
export function urlsToOpen(urls, openTabs) {
  const already = new Set((openTabs || []).map((tab) => tab && tab.url).filter(Boolean));
  const seen = new Set();
  return (Array.isArray(urls) ? urls : []).filter((url) => {
    if (typeof url !== 'string' || !isSearchTabUrl(url) || already.has(url) || seen.has(url)) {
      return false;
    }
    seen.add(url);
    return true;
  });
}
