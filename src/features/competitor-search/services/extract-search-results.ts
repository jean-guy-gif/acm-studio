import type {
  CompetitorCandidate,
  SearchExtraction,
  SearchPortal,
} from '@/features/competitor-search/types';
import { decodeHtmlEntities } from '@/features/comparable-import/utils/html-text';
import { isGenericImageUrl } from '@/features/comparable-import/utils/is-generic';
import { normalizeArea } from '@/features/comparable-import/utils/normalize-area';
import { normalizeCount } from '@/features/comparable-import/utils/normalize-count';
import { normalizePrice } from '@/features/comparable-import/utils/normalize-price';
import { normalizePropertyType } from '@/features/competitor-search/utils/normalize-property-type';

// MISSION 50 — lecture d'une page de RÉSULTATS de recherche.
//
// LA RÈGLE (§4) : on extrait par le MARQUEUR DE CARTE du portail, jamais par la
// forme de l'adresse. La leçon des jours précédents se vérifie ici : sur SeLoger,
// une des formes d'URL les plus fréquentes n'est pas une annonce mais un lien vers
// une commune voisine (« Achat appartements Saint-Laurent-du-Var (672 annonces) »).
// La page de Nice porte 33 conteneurs `id="classified-card-…"` pour 30 vraies
// cartes : 1 emplacement sponsorisé + 2 suggestions ne portent PAS le marqueur
// `serp-core-classified-card-testid`, et sortent d'eux-mêmes.
//
// La CLÉ vient de l'identifiant que le portail publie (id SeLoger, data-id Bien'ici,
// data-advertid Green Acres, id M&A), jamais d'une référence d'agence (mission 47 §3).
//
// Aucune donnée inventée : un champ absent de la carte reste null. Le contenu lu est
// une donnée, jamais une instruction : rien n'est exécuté ni réinjecté comme HTML.

// Taille de page fixe mesurée : SeLoger 30 · Bien'ici 26 · Green Acres 24 · M&A 17.
// La borne couvre la plus grande sans jamais tronquer une page réelle.
export const MAX_SEARCH_CANDIDATES = 60;

export function detectSearchPortal(hostname: string): SearchPortal | null {
  const host = hostname.toLowerCase().replace(/^www\./, '');
  if (host === 'green-acres.fr' || host.endsWith('.green-acres.fr')) {
    return 'green_acres';
  }
  if (host === 'seloger.com' || host.endsWith('.seloger.com') || host === 'selogerneuf.com') {
    return 'seloger';
  }
  if (host === 'bienici.com' || host.endsWith('.bienici.com')) {
    return 'bienici';
  }
  if (host === 'maisonsetappartements.fr' || host.endsWith('.maisonsetappartements.fr')) {
    return 'maisons_appartements';
  }
  return null;
}

// --- petits lecteurs, tous bornés à un chunk de carte déjà découpé -------------

function attr(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, 'i'));
  return match ? decodeHtmlEntities(match[1]) : null;
}

function firstGroup(input: string, regex: RegExp): string | null {
  const match = input.match(regex);
  return match ? decodeHtmlEntities(match[1]).trim() : null;
}

// Une fourchette de prix (« 670 000 à 770 000 € ») marque un programme neuf, pas un
// prix ferme. On la détecte AVANT de normaliser (normalizePrice collerait les deux
// nombres en un montant absurde puis renverrait null).
function looksLikePriceRange(text: string): boolean {
  return /\d[\d\s .]{2,}\s*(?:à|-|–)\s*\d[\d\s .]{2,}\s*(?:€|EUR)/i.test(decodeHtmlEntities(text));
}

function readPrice(text: string | null): number | null {
  if (text == null || looksLikePriceRange(text)) {
    return null;
  }
  const match = decodeHtmlEntities(text).match(/(\d[\d\s .,]{2,})\s*€/);
  return match ? normalizePrice(match[1]) : null;
}

function readSurface(text: string | null): number | null {
  if (text == null) {
    return null;
  }
  // Pas de \b après « m² » : « ² » n'est pas un caractère de mot, donc « 41 m², »
  // ne ferait jamais frontière. Un lookahead « pas une lettre » suffit et évite de
  // confondre avec « m2aa ».
  const match = decodeHtmlEntities(text).match(/(\d{1,4}(?:[.,]\d{1,2})?)\s*m(?:²|2)(?![a-z])/i);
  return match ? normalizeArea(match[1]) : null;
}

// Prix au m² tel que le portail l'AFFICHE, jamais recalculé (§ « aucune donnée
// inventée »). Bien'ici abrège les gros montants : « 11k €/m² », « 17,4k €/m² ».
function readPricePerSqm(text: string | null): number | null {
  if (text == null) {
    return null;
  }
  const decoded = decodeHtmlEntities(text);
  const abbreviated = decoded.match(/(\d+(?:[.,]\d+)?)\s*k\s*€/i);
  if (abbreviated) {
    return Math.round(Number.parseFloat(abbreviated[1].replace(',', '.')) * 1000);
  }
  return readPrice(text);
}

function readRooms(text: string | null): number | null {
  if (text == null) {
    return null;
  }
  const match = decodeHtmlEntities(text).match(/(\d{1,2})\s*pi[eè]ces?\b/i);
  return match ? normalizeCount(match[1]) : null;
}

// Un LOGO D'AGENCE n'est pas la photo du bien (même famille que l'habillage écarté
// en mission 49). Deux familles de signaux, MESURÉES :
//  - le balisage/chemin : « Logo de l'annonceur », account-logo, /Agences/, /logos/… ;
//  - la TAILLE : chez SeLoger le logo n'a AUCUN de ces mots — c'est juste la première
//    image de la carte, minuscule (h=50), sur le même CDN que les photos, avec le nom
//    de l'agence en alt (« CABINET IMMOBILIER NICE »). La vraie photo fait w=626. Une
//    image dont une dimension déclarée est ≤ 160 px est une vignette/logo, pas la
//    photo du bien (les vrais logos Bien'ici font height=90 ; les photos ≥ 180).
function isAgencyLogo(imgTag: string, src: string): boolean {
  if (/logo|annonceur|agen(?:ce|cy)|publisher/i.test(imgTag)) {
    return true;
  }
  if (/\/agences?\/|\/logos?\/|[/_-]logo[._/-]|\/publisher/i.test(src)) {
    return true;
  }
  for (const match of src.matchAll(/[?&](?:w|h|width|height)=(\d{1,4})\b/gi)) {
    if (Number.parseInt(match[1], 10) <= 160) {
      return true;
    }
  }
  return false;
}

const IMG_URL_ATTRS = ['data-src', 'data-lazy-src', 'data-original', 'data-thumb-src', 'src'];

function imgTagSrc(tag: string): string | null {
  for (const name of IMG_URL_ATTRS) {
    const match = tag.match(new RegExp(`${name}\\s*=\\s*"([^"]+)"`, 'i'));
    if (match) {
      return decodeHtmlEntities(match[1]);
    }
  }
  return null;
}

// Première VRAIE photo du bien dans la carte : on parcourt les <img> dans l'ordre, on
// saute les logos d'agence et les images génériques (placeholder). Aucune → null.
function firstPhoto(chunk: string, baseUrl: string): string | null {
  for (const tag of chunk.match(/<img\b[^>]*>/gi) ?? []) {
    const src = imgTagSrc(tag);
    if (src == null || isGenericImageUrl(src) || isAgencyLogo(tag, src)) {
      continue;
    }
    try {
      const url = new URL(src, baseUrl);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        return url.toString();
      }
    } catch {
      // URL de photo invalide : ignorée.
    }
  }
  return null;
}

function absolute(href: string | null, baseUrl: string): string | null {
  if (href == null || href.trim() === '') {
    return null;
  }
  try {
    const url = new URL(href, baseUrl);
    url.hash = '';
    url.search = '';
    return url.toString();
  } catch {
    return null;
  }
}

// Décode un base64 (l'adresse Green Acres de data-o) SANS dépendre de l'environnement :
// l'extraction tourne désormais dans le navigateur (lecture par l'extension) comme
// côté serveur. `atob` existe des deux côtés ; l'adresse est de l'ASCII (une URL).
function decodeBase64(value: string): string {
  try {
    if (typeof atob === 'function') {
      return atob(value);
    }
    return Buffer.from(value, 'base64').toString('binary');
  } catch {
    return '';
  }
}

function titleCaseCity(value: string | null): string | null {
  if (value == null) {
    return null;
  }
  const cleaned = value.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (cleaned === '' || /\d/.test(cleaned)) {
    return null;
  }
  return cleaned.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}

// --- découpage en cartes, par marqueur, portail par portail --------------------

type CardChunk = { key: string | null; chunk: string };

// Découpe le document en fenêtres [début d'une carte, début de la suivante], selon
// des BORNES portées par le marqueur du portail. On ne lit jamais au-delà de la
// carte suivante : le contenu d'une carte ne déborde pas sur sa voisine.
function splitByBoundaries(
  html: string,
  boundary: RegExp,
  keyIndex: number,
  keep?: (openingChunk: string) => boolean,
): CardChunk[] {
  const marks: { index: number; key: string | null }[] = [];
  boundary.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = boundary.exec(html)) !== null) {
    marks.push({ index: match.index, key: match[keyIndex] ?? null });
  }
  const cards: CardChunk[] = [];
  for (let i = 0; i < marks.length; i += 1) {
    const start = marks[i].index;
    const end = i + 1 < marks.length ? marks[i + 1].index : html.length;
    const chunk = html.slice(start, end);
    if (keep && !keep(chunk.slice(0, 300))) {
      continue;
    }
    cards.push({ key: marks[i].key, chunk });
  }
  return cards;
}

// --- lecteurs de carte par portail ---------------------------------------------

function readSelogerCard({ key, chunk }: CardChunk, pageUrl: string): CompetitorCandidate {
  const link = chunk.match(/<a\b[^>]*card-mfe-covering-link-testid[^>]*>/i)?.[0] ?? '';
  const href = attr(link, 'href');
  const title = attr(link, 'title');
  const url = absolute(href, pageUrl) ?? pageUrl;
  // Le titre porte tout : « Appartement à vendre - Nice - 249 000 € - 2 pièces, 41 m², Étage 1/3 ».
  const parts = (title ?? '').split(/\s+-\s+/);
  const city = titleCaseCity(parts[1] ?? null);
  const priceText = title;
  const isNewBuild =
    /\bneufs?\b/i.test(title ?? '') ||
    /selogerneuf\.com/i.test(href ?? '') ||
    looksLikePriceRange(title ?? '');
  return {
    key,
    url,
    title: title ?? null,
    price: readPrice(priceText),
    surfaceArea: readSurface(title),
    roomsCount: readRooms(title),
    propertyType: normalizePropertyType(title),
    pricePerSqm: null,
    city,
    photoUrl: firstPhoto(chunk, pageUrl),
    isNewBuild,
  };
}

function readBieniciCard({ key, chunk }: CardChunk, pageUrl: string): CompetitorCandidate {
  const href =
    firstGroup(chunk, /class="[^"]*detailedSheetLink[^"]*"[^>]*href="([^"]+)"/i) ??
    firstGroup(chunk, /href="([^"]*\/annonce\/[^"]+)"/i);
  const url = absolute(href, pageUrl) ?? pageUrl;
  const priceText = firstGroup(chunk, /ad-price__the-price"[^>]*>([^<]+)/i);
  const alt = firstGroup(chunk, /<img[^>]*\balt="([^"]+)"/i);
  // Ville lue sur le chemin de l'annonce : /annonce/vente/<ville>/… .
  const city = titleCaseCity(href?.match(/\/annonce\/[a-z]+\/([a-z0-9'’-]+)\//i)?.[1] ?? null);
  const isNewBuild = /\/programme\//i.test(href ?? '') || looksLikePriceRange(priceText ?? '');
  return {
    key,
    url,
    title: alt,
    price: readPrice(priceText),
    surfaceArea: readSurface(alt),
    roomsCount: readRooms(alt),
    // Type sur le chemin de l'annonce (/annonce/vente/<ville>/<type>/…) ou dans l'alt.
    propertyType:
      normalizePropertyType(
        href?.match(/\/annonce\/[a-z]+\/[a-z0-9'’-]+\/([a-z-]+)\//i)?.[1] ?? null,
      ) ?? normalizePropertyType(alt),
    pricePerSqm: readPricePerSqm(
      firstGroup(chunk, /ad-price__price-per-square-meter"[^>]*>([^<]+)/i),
    ),
    city,
    photoUrl: firstPhoto(chunk, pageUrl),
    isNewBuild,
  };
}

function readGreenAcresCard({ key, chunk }: CardChunk, pageUrl: string): CompetitorCandidate {
  // L'adresse de l'annonce est publiée PAR LE PORTAIL, encodée en base64 dans data-o
  // (ce n'est pas la deviner — §9 : « ne reconstruis pas l'adresse en devinant »).
  const dataO = chunk.match(/data-o="([A-Za-z0-9+/=]+)"/)?.[1] ?? '';
  let url = pageUrl;
  if (dataO) {
    try {
      const decoded = decodeBase64(dataO);
      url = absolute(decoded, pageUrl) ?? pageUrl;
    } catch {
      // data-o illisible : on garde la clé, l'URL reste celle de la page.
    }
  }
  // Les info-tags portent surface / pièces / prix au m².
  const tags = new Map<string, string>();
  for (const m of chunk.matchAll(/info-tag[^>]*title="([^"]*)"[^>]*>([\s\S]*?)<\/div>/gi)) {
    tags.set(decodeHtmlEntities(m[1]).toLowerCase(), m[2].replace(/<[^>]+>/g, ' '));
  }
  const localisation = firstGroup(chunk, /announce-localisation"[^>]*>([^<]+)/i);
  const city = titleCaseCity(localisation?.split('(')[0] ?? null);
  // Green Acres ne publie PAS de titre sur la carte : le type vient du chemin de
  // l'annonce (/properties/<type>/…), donnée publiée par le portail. On compose un
  // libellé honnête à partir du type et de la commune, plutôt que « Annonce détectée ».
  const typeSegment = url.match(/\/properties\/([a-z-]+)\//i)?.[1] ?? null;
  const propertyType = normalizePropertyType(typeSegment);
  const typeLabel = typeSegment ? titleCaseCity(typeSegment) : null;
  const title = typeLabel && city ? `${typeLabel} à ${city}` : (typeLabel ?? null);
  return {
    key,
    url,
    title,
    price: readPrice(firstGroup(chunk, /info-price"[^>]*>([^<]+)/i)),
    surfaceArea: readSurface(tags.get('surface habitable') ?? null),
    roomsCount: readRooms(tags.get('pièces') ?? tags.get('pieces') ?? null),
    propertyType,
    pricePerSqm: readPricePerSqm(tags.get('prix par m²') ?? tags.get('prix par m2') ?? null),
    city,
    photoUrl: firstPhoto(chunk, pageUrl),
    isNewBuild: false,
  };
}

function readMaisonsCard({ key, chunk }: CardChunk, pageUrl: string): CompetitorCandidate {
  const href = firstGroup(chunk, /href="([^"]*ficheAnnonce[^"]*)"/i);
  const url = absolute(href, pageUrl) ?? pageUrl;
  const alt = firstGroup(chunk, /<img[^>]*\balt="([^"]+)"/i);
  // Alt : « Appartement à vendre à Nice - 2 pièces 30 m² ».
  const city = titleCaseCity(alt?.match(/\bà\s+([A-Za-zÀ-ÿ'’ -]+?)\s*-\s*\d/)?.[1] ?? null);
  return {
    key,
    url,
    title: alt,
    price: readPrice(firstGroup(chunk, /RR_prix[^"]*"[^>]*>([^<]+)/i)),
    surfaceArea: readSurface(alt),
    roomsCount: readRooms(alt) ?? readRooms(firstGroup(chunk, /data-room="([^"]+)"/i)),
    propertyType: normalizePropertyType(alt),
    pricePerSqm: null,
    city,
    photoUrl: firstPhoto(chunk, pageUrl),
    isNewBuild: false,
  };
}

const READERS: Record<
  SearchPortal,
  {
    split: (html: string) => CardChunk[];
    read: (card: CardChunk, pageUrl: string) => CompetitorCandidate;
  }
> = {
  seloger: {
    // Borne = chaque conteneur `id="classified-card-…"` ; on ne garde que ceux qui
    // portent le marqueur de vraie carte (ni sponsorisé, ni suggestion).
    split: (html) =>
      splitByBoundaries(html, /id="classified-card-([A-Z0-9]+)"/g, 1, (open) =>
        open.includes('serp-core-classified-card-testid'),
      ),
    read: readSelogerCard,
  },
  bienici: {
    split: (html) => splitByBoundaries(html, /<article\b[^>]*\bdata-id="([^"]+)"/g, 1),
    read: readBieniciCard,
  },
  green_acres: {
    // Seul le conteneur de carte porte data-advertid ET data-o côte à côte ; les
    // boutons « favoris/masquer » portent data-advertid seul.
    split: (html) =>
      splitByBoundaries(html, /data-advertid="([^"]+)"\s+data-o="[A-Za-z0-9+/=]+"/g, 1),
    read: readGreenAcresCard,
  },
  maisons_appartements: {
    split: (html) =>
      splitByBoundaries(
        html,
        /<article\b[^>]*\bid="(\d+)"[^>]*itemtype="https:\/\/schema\.org\/Apartment"/g,
        1,
      ),
    read: readMaisonsCard,
  },
};

// Lit TOUTES les cartes de la page, par marqueur. Le nombre renvoyé est le nombre de
// cartes réelles (30 · 26 · 24 · 17) — l'écartement du neuf et la déduplication sont
// une étape séparée (filterAndDedupeCandidates), pour que « cartes lues » reste
// vérifiable indépendamment de ce qu'on retient.
export function extractSearchResults(
  html: string,
  pageUrl: string,
  portal: SearchPortal,
  max: number = MAX_SEARCH_CANDIDATES,
): CompetitorCandidate[] {
  const reader = READERS[portal];
  const cards = reader.split(html).slice(0, max);
  return cards.map((card) => reader.read(card, pageUrl));
}

// Signature de déduplication : prix + surface + pièces + commune (§6). Le même bien
// chez deux agences, ou repris sur deux portails, partage cette signature bien que sa
// clé de portail diffère. On ne déduplique QUE si les quatre champs sont présents :
// à défaut, deux annonces distinctes se ressembleraient à tort (null|null|null|null).
export function candidateSignature(candidate: CompetitorCandidate): string | null {
  const { price, surfaceArea, roomsCount, city } = candidate;
  if (price == null || surfaceArea == null || roomsCount == null || !city) {
    return null;
  }
  const normalizedCity = city.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  return `${price}|${surfaceArea}|${roomsCount}|${normalizedCity}`;
}

// Écarte le neuf (§6) et déduplique (première occurrence gardée, écartées comptées).
export function filterAndDedupeCandidates(candidates: CompetitorCandidate[]): SearchExtraction {
  let excludedNewBuild = 0;
  let excludedDuplicates = 0;
  const kept: CompetitorCandidate[] = [];
  const seenSignatures = new Set<string>();
  const seenUrls = new Set<string>();

  for (const candidate of candidates) {
    if (candidate.isNewBuild) {
      excludedNewBuild += 1;
      continue;
    }
    if (seenUrls.has(candidate.url)) {
      excludedDuplicates += 1;
      continue;
    }
    const signature = candidateSignature(candidate);
    if (signature != null && seenSignatures.has(signature)) {
      excludedDuplicates += 1;
      continue;
    }
    seenUrls.add(candidate.url);
    if (signature != null) {
      seenSignatures.add(signature);
    }
    kept.push(candidate);
  }

  return { candidates: kept, excludedNewBuild, excludedDuplicates };
}
