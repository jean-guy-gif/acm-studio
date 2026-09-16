import type { PartialListingData } from '@/features/comparable-import/types';
import { decodeHtmlEntities } from '@/features/comparable-import/utils/html-text';
import { normalizeArea } from '@/features/comparable-import/utils/normalize-area';
import { normalizeCount } from '@/features/comparable-import/utils/normalize-count';
import { normalizePrice } from '@/features/comparable-import/utils/normalize-price';
import { parseFrenchDate } from '@/features/comparable-import/utils/parse-french-date';

const DOMAIN = 'bienici.com';

export function isBienIci(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === DOMAIN || host.endsWith(`.${DOMAIN}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// A French date as Bien'ici writes it: long ("8 sept. 2026", abbreviated month
// with an optional trailing point) or numeric ("09/09/2026"). Kept as a source
// fragment so the two phrase readers below share one shape.
const FRENCH_DATE = String.raw`\d{1,2}(?:er)?\s+[a-zàâçéèêëîïôûùüœ]+\.?\s+\d{4}|\d{1,2}[/.-]\d{1,2}[/.-]\d{4}`;

// Delimits the reading to the annonce's own « À propos de cette annonce » block
// (detailsSection_aboutThisAd) when it is present — the same discipline as Green
// Acres: never read a dated phrase across the WHOLE render, where a recommended
// listing could carry its own « Publiée le ». Absent (older pages, the lower-bound
// case) → fall back to the whole render so the bound keeps being read.
function annonceDetailRegion(decoded: string): string {
  const anchor = decoded.indexOf('detailsSection_aboutThisAd');
  if (anchor === -1) {
    return decoded;
  }
  const after = decoded.slice(anchor);
  const nextSection = after.search(/<section\b/i);
  return nextSection === -1 ? after : after.slice(0, nextSection);
}

// The characteristics live in a DIFFERENT section (« À propos de ce bien » /
// detailsSection_aboutThisProperty) — the 25 `labelInfo` blocks. Scope reading to
// it (Mission 48 §4): never across the whole render, where the similar-ads carousel
// carries its own « Terrasse », « 4 pièces », etc. Empty string if the section is
// absent (nothing is read rather than reaching for the page).
function propertyDetailRegion(decoded: string): string {
  const anchor = decoded.indexOf('detailsSection_aboutThisProperty');
  if (anchor === -1) {
    return '';
  }
  const after = decoded.slice(anchor);
  const nextSection = after.search(/<section\b/i);
  return nextSection === -1 ? after : after.slice(0, nextSection);
}

function labelInfoTexts(region: string): string[] {
  const texts: string[] = [];
  for (const match of region.matchAll(
    /<div class=['"]labelInfo[^'"]*['"][^>]*>([\s\S]*?)<\/div>/gi,
  )) {
    const text = match[1]
      .replace(/<[^>]+>/g, ' ')
      .replace(/ /g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (text !== '') {
      texts.push(text);
    }
  }
  return texts;
}

function norm(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/ /g, ' ');
}

// Blocks that must NEVER become a characteristic (Mission 48 §2.3). The DPE date is
// the main trap (first dated block); the rest are interface commands, the agency
// reference (never a key — §3 of mission 47), and the commercial mandate.
const BIENICI_EXCLUSIONS = [
  /date de realisation du dpe/,
  /estimez votre mensualite/,
  /baremes? de l'agence/,
  /signaler une anomalie/,
  /ref\.? de l'annonce|reference de l'annonce/,
  /mandat en exclusivite/,
  /publiee? le|modifiee? le|publiee? il y a/,
];

// A free characteristic is a SHORT NOMINAL GROUP (« Terrasse », « Câble TV »,
// « 1 box ») — no label-colon (that is a typed datum), no conjugated verb /
// imperative, at most five words. Anything else is discarded and LOGGED (§2.6), so
// a future Bien'ici change surfaces in the log instead of in front of a seller.
function looksLikeFeature(text: string): boolean {
  if (text.length < 3 || text.length > 40) {
    return false;
  }
  if (!/[a-zàâçéèêëîïôûùüœ]/i.test(text) || text.includes(':')) {
    return false;
  }
  if (text.split(/\s+/).length > 5) {
    return false;
  }
  return !/\b(estimez|signaler|voir|calculer|contactez|decouvrez|afficher)\b/i.test(norm(text));
}

// Bien'ici is a client-rendered SPA: the public HTML shell contains no listing
// data. This extractor only reads an embedded ad JSON if one is present, and
// returns nothing otherwise (controlled failure, manual entry stays available).
export function extractBienIci(html: string): PartialListingData {
  const result: PartialListingData = {};

  // Mission 47 — dated phrases from the RENDERED page (Bien'ici is client-rendered;
  // the extension captures the visible text). We anchor on the PHRASE, never on
  // "a French date in the page": the same page carries « Date de réalisation du
  // DPE : 13 juillet 2026 » in an identical labelInfo block — reading it as the
  // listing date would be a false value shown to a seller. Forms measured:
  //   « Publiée le 8 sept. 2026 » / « Modifiée le 9 sept. 2026 » → EXACT dates ;
  //   « Publiée il y a plus de 2 mois »                          → LOWER BOUND, verbatim.
  // Priority (exact date → lower bound → first ACM observation) is settled later
  // in deriveListingAge; here we only report what the phrase says.
  const decoded = decodeHtmlEntities(html);
  const region = annonceDetailRegion(decoded);

  const publishedExact = region.match(new RegExp(`Publi[ée]e?\\s+le\\s+(${FRENCH_DATE})`, 'i'));
  if (publishedExact) {
    const iso = parseFrenchDate(publishedExact[1]);
    if (iso) {
      result.listingPublishedAt = iso;
    }
  }

  const bound = region.match(
    /Publi[ée]e?\s+il\s+y\s+a\s+(plus\s+de\s+\d+\s+(?:jours?|semaines?|mois|ans?))/i,
  );
  if (bound) {
    result.publicationLowerBoundLabel = bound[1].trim().toLowerCase();
  }

  const modified = region.match(new RegExp(`Modifi[ée]e?\\s+le\\s+(${FRENCH_DATE})`, 'i'));
  if (modified) {
    const iso = parseFrenchDate(modified[1]);
    if (iso) {
      result.modifiedAt = iso;
    }
  }

  // Mission 48 — the labelInfo characteristics, read from the property section only.
  // Typed values fill their own field (they get compared in the grid); genuine
  // free characteristics (Terrasse, Jardin, box, Ascenseur…) go to listingFeatures
  // and the mapper turns them into outdoor/parking. A house's terrain is recorded
  // but dropped here for anything else: « 4 560 m² de terrain » on an apartment is
  // the co-ownership parcel, and a half-hectare apartment breaks the screen (§2.4).
  const titleText =
    decoded.match(/property="og:title"[^>]+content="([^"]+)"/i)?.[1] ??
    decoded.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ??
    '';
  const titleNorm = norm(titleText);
  const looksLikeHouse =
    /\b(maison|villa|propriete|mas|ferme|chateau|batisse)\b/.test(titleNorm) &&
    !/\bappartement\b/.test(titleNorm);

  const features: string[] = [];
  for (const text of labelInfoTexts(propertyDetailRegion(decoded))) {
    const n = norm(text);
    if (BIENICI_EXCLUSIONS.some((re) => re.test(n))) {
      continue; // known non-characteristics (DPE date, interface, ref, mandate)
    }

    const price = /prix\s*:/.test(n) ? normalizePrice(n.match(/([\d .]+)\s*€/)?.[1]) : null;
    const terrain = normalizeArea(n.match(/([\d .,]+?)\s*m²\s*de\s*terrain/)?.[1]);
    const surface = /de\s*terrain/.test(n)
      ? null
      : normalizeArea(n.match(/^([\d .,]+?)\s*m²$/)?.[1]);
    const rooms = normalizeCount(n.match(/^(\d+)\s*pieces?$/)?.[1]);
    const bedrooms = normalizeCount(n.match(/(\d+)\s*chambres?/)?.[1]);
    const bathrooms = normalizeCount(n.match(/(\d+)\s*salles?\s*d['’ ]?\s*(?:eau|bain)/)?.[1]);
    const year = n.match(/construit en\s*(\d{4})/)?.[1];
    const heating = text.match(/^chauffage\s*:\s*(.+)$/i)?.[1];
    const floorMatch = n.match(/(\d+)\s*(?:er|e|eme|nd|re)?\s*etage\s*\(\s*sur\s*(\d+)\s*\)/);

    let typed = false;
    if (price != null) {
      result.price = price;
      typed = true;
    }
    if (terrain != null) {
      typed = true;
      if (looksLikeHouse) {
        result.landArea = terrain;
      } else {
        console.warn(`[bienici] terrain relevé mais non retenu (bien non-maison) : ${text}`);
      }
    }
    if (surface != null) {
      result.surfaceArea = surface;
      typed = true;
    }
    if (rooms != null) {
      result.roomsCount = rooms;
      typed = true;
    }
    if (bedrooms != null) {
      result.bedroomsCount = bedrooms;
      typed = true;
    }
    if (bathrooms != null) {
      result.bathroomsCount = bathrooms;
      typed = true;
    }
    if (year != null) {
      result.constructionYear = Number.parseInt(year, 10);
      typed = true;
    }
    if (heating != null && heating.trim() !== '') {
      result.heatingType = heating.trim();
      typed = true;
    }
    if (floorMatch) {
      result.floor = Number.parseInt(floorMatch[1], 10);
      result.floorsCount = Number.parseInt(floorMatch[2], 10);
      typed = true;
    }

    if (typed) {
      continue;
    }
    if (looksLikeFeature(text)) {
      features.push(text);
    } else {
      console.warn(`[bienici] bloc labelInfo ignoré (forme inattendue) : ${text}`);
    }
  }
  if (features.length > 0) {
    result.listingFeatures = features;
  }

  const stateMatch = html.match(
    /<script[^>]*type="application\/json"[^>]*data-ad[^>]*>([\s\S]*?)<\/script>/i,
  );
  if (!stateMatch) {
    return result;
  }

  let ad: unknown;
  try {
    ad = JSON.parse(stateMatch[1].trim());
  } catch {
    return result;
  }
  if (!isRecord(ad)) {
    return result;
  }

  const price = normalizePrice(ad.price);
  if (price != null) {
    result.price = price;
  }
  const surface = normalizeArea(ad.surfaceArea ?? ad.surface);
  if (surface != null) {
    result.surfaceArea = surface;
  }
  const rooms = normalizeCount(ad.roomsQuantity ?? ad.roomsCount);
  if (rooms != null) {
    result.roomsCount = rooms;
  }
  const bedrooms = normalizeCount(ad.bedroomsQuantity ?? ad.bedroomsCount);
  if (bedrooms != null) {
    result.bedroomsCount = bedrooms;
  }
  if (typeof ad.city === 'string' && ad.city.trim() !== '') {
    result.city = ad.city.trim();
  }

  return result;
}
