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
  const region = annonceDetailRegion(decodeHtmlEntities(html));

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
