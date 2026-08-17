import type { CompetitorCandidate, SearchPortal } from '@/features/competitor-search/types';
import { extractImageUrls } from '@/features/comparable-import/utils/extract-image-urls';
import { isGenericImageUrl } from '@/features/comparable-import/utils/is-generic';
import { normalizeArea } from '@/features/comparable-import/utils/normalize-area';
import { normalizeCount } from '@/features/comparable-import/utils/normalize-count';
import { normalizePrice } from '@/features/comparable-import/utils/normalize-price';

// Extraction déterministe des annonces candidates depuis une page de RÉSULTATS
// de recherche d'un portail. Motifs d'URL relevés sur les portails réels ;
// prix / surface / pièces / photo lus en best-effort dans la « carte » (fenêtre
// de texte autour du lien). Tout champ incertain reste null : la fiche importée
// fera foi. Aucun contournement, aucune invention.

export const MAX_SEARCH_CANDIDATES = 20;

// Motif des URLs de FICHE annonce par portail (jamais les pages de recherche).
const LISTING_URL_PATTERNS: Record<SearchPortal, RegExp> = {
  green_acres:
    /(?:https?:\/\/[a-z0-9.-]*green-acres\.[a-z]{2,3})?\/(?:[a-z]{2}\/)?properties\/[a-z0-9-]+\/[a-z0-9'’-]+\/[A-Za-z0-9]+\.htm/gi,
  seloger:
    /(?:https?:\/\/[a-z0-9.-]*seloger\.com)?\/annonces\/[a-z-]+\/[a-z-]+\/[a-z0-9'’-]+(?:\/[a-z0-9'’-]+)?\/\d{5,}\.htm/gi,
  bienici:
    /(?:https?:\/\/[a-z0-9.-]*bienici\.com)?\/annonce\/(?:vente|achat|location)\/[a-z0-9'’-]+\/[a-z0-9'’-]+\/[a-z0-9]+\/[a-z0-9-]+/gi,
  figaro:
    /(?:https?:\/\/[a-z0-9.-]*lefigaro\.fr)?\/annonces\/(?:[a-z0-9-]+\/\d{5,}\/?|annonce-\d{5,}\.html)/gi,
};

export function detectSearchPortal(hostname: string): SearchPortal | null {
  const host = hostname.toLowerCase().replace(/^www\./, '');
  if (host === 'green-acres.fr' || host.endsWith('.green-acres.fr')) {
    return 'green_acres';
  }
  if (host === 'seloger.com' || host.endsWith('.seloger.com')) {
    return 'seloger';
  }
  if (host === 'bienici.com' || host.endsWith('.bienici.com')) {
    return 'bienici';
  }
  if (host.endsWith('lefigaro.fr')) {
    return 'figaro';
  }
  return null;
}

// Un slug d'annonce lisible -> libellé provisoire ("appartement 3pieces nice").
function titleFromUrl(url: string): string | null {
  try {
    const path = new URL(url).pathname;
    const segments = path.split('/').filter(Boolean);
    const usable = segments
      .filter((segment) => !/^\d+$/.test(segment) && !/\.(htm|html)$/.test(segment))
      .slice(-3)
      .join(' ')
      .replace(/-/g, ' ')
      .trim();
    return usable === '' ? null : usable;
  } catch {
    return null;
  }
}

function firstMatch(input: string, regex: RegExp): string | null {
  const match = input.match(regex);
  return match ? match[1] : null;
}

// Fenêtre de contexte : de l'occurrence du lien jusqu'à l'occurrence suivante
// d'un lien différent (bornée), pour lire le contenu de la carte.
function candidateFromWindow(
  url: string,
  windowHtml: string,
  baseUrl: string,
): CompetitorCandidate {
  const price = normalizePrice(firstMatch(windowHtml, /([\d][\d\s  .]{2,12})\s*€/));
  const surface = normalizeArea(
    firstMatch(windowHtml, /([\d]{1,4}(?:[.,]\d{1,2})?)\s*m(?:²|2)(?![a-z])/i),
  );
  const rooms = normalizeCount(firstMatch(windowHtml, /(\d{1,2})\s*pi[eè]ces?\b/i));

  let photoUrl: string | null = null;
  for (const image of extractImageUrls(windowHtml)) {
    if (isGenericImageUrl(image)) {
      continue;
    }
    try {
      const absolute = new URL(image, baseUrl);
      if (absolute.protocol === 'http:' || absolute.protocol === 'https:') {
        photoUrl = absolute.toString();
        break;
      }
    } catch {
      // URL de photo invalide : ignorée.
    }
  }

  return {
    url,
    title: titleFromUrl(url),
    price,
    surfaceArea: surface,
    roomsCount: rooms,
    photoUrl,
  };
}

export function extractSearchResults(
  html: string,
  pageUrl: string,
  portal: SearchPortal,
  max: number = MAX_SEARCH_CANDIDATES,
): CompetitorCandidate[] {
  const pattern = LISTING_URL_PATTERNS[portal];
  pattern.lastIndex = 0;

  // 1. Toutes les occurrences (URL absolue -> premier index d'apparition).
  const occurrences: { url: string; index: number }[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    let absolute: string;
    try {
      const resolved = new URL(match[0], pageUrl);
      resolved.hash = '';
      resolved.search = '';
      absolute = resolved.toString();
    } catch {
      continue;
    }
    if (seen.has(absolute)) {
      continue;
    }
    seen.add(absolute);
    occurrences.push({ url: absolute, index: match.index });
    if (occurrences.length >= max * 3) {
      break; // borne de sécurité avant découpage
    }
  }

  // 2. Une carte = du lien courant au lien suivant (fenêtre bornée à 6000 car.).
  const candidates: CompetitorCandidate[] = [];
  for (let i = 0; i < occurrences.length && candidates.length < max; i += 1) {
    const start = occurrences[i].index;
    const end = Math.min(
      i + 1 < occurrences.length ? occurrences[i + 1].index : html.length,
      start + 6000,
    );
    candidates.push(candidateFromWindow(occurrences[i].url, html.slice(start, end), pageUrl));
  }

  return candidates;
}
