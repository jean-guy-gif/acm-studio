export const MAX_PHOTO_URLS = 20;

// Une même photo servie en plusieurs tailles = une seule entrée, et on garde la
// PLUS GRANDE (Mission 49, revue déploiement) : M&A servait ext_0 en f600x400 ET
// f1200x800 (8 lignes pour 7 photos), Green Acres la même vignette sous Photos/ et
// miniPhotos/. Deux mots pour ça :
//   - la SIGNATURE identifie la photo indépendamment de sa taille (on retire les
//     dimensions « 600x400 » et les marqueurs de taille des segments, y compris
//     collés comme « miniPhotos ») ;
//   - le SCORE classe les variantes d'une même signature (aire des dimensions, sinon
//     rang du mot de taille, sinon « pleine taille » quand aucun marqueur) ; on garde
//     le plus grand.

// Mots de taille distinctifs, pouvant préfixer un nom de dossier collé (« miniPhotos »).
const GLUED_SIZE = 'mini|thumbnail|thumb|small|preview';
// Mots/abréviations de taille, seulement en segment délimité (jamais collés à des
// lettres, pour ne pas rogner « smart » en « art »).
const DELIMITED_SIZE = 'medium|large|orig|original|xxl|xl|lg|md|sm|xs';

function sizeScore(path: string): number {
  const dimension = path.match(/(\d{2,4})x(\d{2,4})/);
  if (dimension) {
    return Number(dimension[1]) * Number(dimension[2]); // aire : plus grand = mieux
  }
  if (new RegExp(`(^|[/_.-])(?:${GLUED_SIZE})(?=[a-z/_.-]|$)`).test(path)) {
    return 1; // vignette
  }
  if (new RegExp(`(^|[/_.-])(?:medium|md)(?=[/_.-]|$)`).test(path)) {
    return 2;
  }
  return Number.MAX_SAFE_INTEGER; // aucun marqueur = version pleine, à préférer
}

function photoSignature(url: URL): string {
  let path = url.pathname.toLowerCase();
  path = path.replace(/\d{2,4}x\d{2,4}/g, ''); // dimensions (collées ou non : f600x400)
  path = path.replace(new RegExp(`(^|[/_.-])(?:${GLUED_SIZE})(?=[a-z]|[/_.-]|$)`, 'g'), '$1');
  path = path.replace(new RegExp(`(^|[/_.-])(?:${DELIMITED_SIZE})(?=[/_.-]|$)`, 'g'), '$1');
  path = path.replace(/[/_.-]{2,}/g, '/'); // délimiteurs laissés vides par les retraits
  return `${url.host}${path}`;
}

// Cleans a list of candidate photo URLs: resolves them to absolute http(s) URLs
// against an optional base, drops empties/invalid/forbidden protocols, collapses
// exact AND size-variant duplicates (keeping the LARGEST of each, in first-appearance
// order so gallery order is preserved), and caps the count.
export function deduplicatePhotoUrls(
  urls: readonly string[],
  baseUrl?: string,
  max: number = MAX_PHOTO_URLS,
): string[] {
  const bySignature = new Map<string, { url: string; score: number; order: number }>();
  let order = 0;

  for (const raw of urls) {
    if (typeof raw !== 'string') {
      continue;
    }
    const trimmed = raw.trim();
    if (trimmed === '') {
      continue;
    }

    let absolute: URL;
    try {
      absolute = baseUrl ? new URL(trimmed, baseUrl) : new URL(trimmed);
    } catch {
      continue;
    }
    if (absolute.protocol !== 'http:' && absolute.protocol !== 'https:') {
      continue;
    }

    const signature = photoSignature(absolute);
    const score = sizeScore(absolute.pathname.toLowerCase());
    const existing = bySignature.get(signature);
    if (existing == null) {
      bySignature.set(signature, { url: absolute.toString(), score, order: order++ });
    } else if (score > existing.score) {
      // Même photo, taille plus grande : on remplace, sans changer la place en galerie.
      existing.url = absolute.toString();
      existing.score = score;
    }
  }

  return [...bySignature.values()]
    .sort((a, b) => a.order - b.order)
    .map((entry) => entry.url)
    .slice(0, max);
}
