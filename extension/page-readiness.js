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
