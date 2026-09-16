import type { PartialListingData } from '@/features/comparable-import/types';
import { decodeHtmlEntities } from '@/features/comparable-import/utils/html-text';
import { normalizeArea } from '@/features/comparable-import/utils/normalize-area';
import { normalizeCount } from '@/features/comparable-import/utils/normalize-count';
import { normalizePrice } from '@/features/comparable-import/utils/normalize-price';
import { parseFrenchDate } from '@/features/comparable-import/utils/parse-french-date';

const DOMAIN = 'green-acres.fr';

export function isGreenAcres(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === DOMAIN || host.endsWith(`.${DOMAIN}`);
}

function firstMatch(html: string, regex: RegExp): string | null {
  const match = html.match(regex);
  return match ? match[1] : null;
}

// A Green Acres detail page is NOT just the advert: it also renders « biens
// similaires » cards (each one ANOTHER listing — class "announce-info" /
// "info-price-container" / "info-tag") and, further down, a price-reduction
// widget and a currency converter whose own "price-container" carries an EMPTY
// <span class="price">. Reading any field by first match over the WHOLE document
// lets a neighbour's price/surface — or that empty span — land in the advert.
// That is the same class of defect as info-price, and it shipped a wrong value
// to production. So we FIRST delimit the main advert region (everything before
// the first neighbour card) and read every trap-prone field INSIDE it.
function mainAdvertRegion(html: string): string {
  const boundaries = [
    html.search(/class="announce-info"/i),
    html.search(/class="info-price-container"/i),
  ].filter((index) => index >= 0);
  return boundaries.length > 0 ? html.slice(0, Math.min(...boundaries)) : html;
}

// Reads the real listing price from the labelled price-container, scanning only
// the main advert region. Skips any price-container whose <span class="price"> is
// EMPTY (the price-reduction widget renders empty ones) and returns the first
// container that actually holds a number. No price-container with a value → null,
// never a fallback to info-price (a neighbour's price).
function priceFromMainAdvert(main: string): number | null {
  const container = /class="price-container"[^>]*>([\s\S]*?)<\/div>/gi;
  let match: RegExpExecArray | null;
  while ((match = container.exec(main)) !== null) {
    const raw = firstMatch(match[1], /class="price"[^>]*>([^<]+)</i);
    const price = raw ? normalizePrice(decodeHtmlEntities(raw)) : null;
    if (price != null) {
      return price;
    }
  }
  return null;
}

// A property-type or commercial word must never be accepted as a city/district,
// even if a source yields it. Small, bounded safety net — the real defence is
// sourcing from reliable structure below, not this list.
const AMBIGUOUS_LOCATION =
  /^(professionnels?|commercial(?:e|es|aux)?|locaux|local(?:\s+commercial)?|appartements?|maisons?|propri[ée]t[ée]s?|villas?|terrains?|immeubles?|biens?)$/i;

// Leading property-type word to strip from a breadcrumb geo label ("Appartements
// Nice" -> "Nice").
const PROPERTY_TYPE_PREFIX =
  /^(?:appartements?|maisons?|villas?|propri[ée]t[ée]s?|terrains?|locaux|local|immeubles?|ch[aâ]teaux?|fermes?|biens?)\s+/i;

function cleanLocation(value: string | null | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed === '' || AMBIGUOUS_LOCATION.test(trimmed)) {
    return undefined;
  }
  return trimmed;
}

// Explicit schema.org addressLocality microdata, e.g.
// "Nice (06000) – quartier Musiciens" -> { city: "Nice", district: "Musiciens" }.
// Prefers the richest occurrence (the one carrying a "quartier").
function locationFromMicrodata(html: string): { city?: string; district?: string } {
  const values: string[] = [];
  const re = /itemprop="addressLocality"[^>]*>([^<]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const text = decodeHtmlEntities(m[1]).trim();
    if (text !== '') {
      values.push(text);
    }
  }
  if (values.length === 0) {
    return {};
  }
  const text = values.find((value) => /quartier\s+/i.test(value)) ?? values[0];
  let district: string | undefined;
  const quartier = text.match(/quartier\s+(.+)$/i);
  if (quartier) {
    district = quartier[1].trim();
  }
  const city = text
    .replace(/[–—-]?\s*quartier\s+.+$/i, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[–—\-\s]+$/, '')
    .trim();
  return { city: city || undefined, district };
}

// The breadcrumb's most specific geographic level ("Appartements Nice") is the
// item just before the last (which is the listing title). Scoped to the
// BreadcrumbList so unrelated itemprop="name" nodes are ignored.
function cityFromBreadcrumb(html: string): string | undefined {
  const block = html.match(/BreadcrumbList"[^>]*>([\s\S]*?)<\/(?:ul|ol)>/i);
  if (!block) {
    return undefined;
  }
  const names: string[] = [];
  const re = /itemprop="name"[^>]*>([^<]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block[1])) !== null) {
    names.push(decodeHtmlEntities(m[1]).trim());
  }
  if (names.length < 2) {
    return undefined;
  }
  const cityLevel = names[names.length - 2]; // last item is the listing title
  return cityLevel.replace(PROPERTY_TYPE_PREFIX, '').trim() || undefined;
}

// GA detail URL: /fr/properties/<type>/<city-slug>/<id>.htm — an unambiguous
// city segment, used only as a last resort.
function cityFromUrl(rawUrl: string | undefined): string | undefined {
  if (!rawUrl) {
    return undefined;
  }
  const match = rawUrl.match(/\/properties\/[a-z0-9-]+\/([a-z0-9'’-]+)\/[^/]+\.htm/i);
  if (!match) {
    return undefined;
  }
  return match[1]
    .split('-')
    .map((word) => (word === '' ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ')
    .trim();
}

// Resolves city/district from reliable structure only (never the title split):
// explicit microdata > breadcrumb > URL. District comes only from microdata.
function resolveLocation(
  html: string,
  rawUrl: string | undefined,
): { city?: string; district?: string } {
  const micro = locationFromMicrodata(html);
  const city =
    cleanLocation(micro.city) ??
    cleanLocation(cityFromBreadcrumb(html)) ??
    cleanLocation(cityFromUrl(rawUrl));
  const district = cleanLocation(micro.district);
  return { city, district };
}

// Mission 48 — Green Acres publishes NO outdoor/parking checkboxes; the terrace and
// parking live only in the PROSE (« …une belle terrasse de 56 m². Deux places de
// parking… »). We read them from the MAIN advert region only (never the page, where
// a neighbour's « Terrasse » at 449 000 € waits) and PROPOSE them — the advisor
// ticks. We never auto-check: a wrong box in front of a seller costs more than an
// empty one (§3). Conservative patterns: a terrace only with its area, parking only
// with a count. « Structure/extérieur à restaurer » (building condition) never
// matches these.
const FR_NUMBER_WORDS: Record<string, number> = {
  un: 1,
  une: 1,
  deux: 2,
  trois: 3,
  quatre: 4,
  cinq: 5,
  six: 6,
  sept: 7,
  huit: 8,
  neuf: 9,
};

function outdoorSuggestionsFromRegion(main: string): string[] {
  const text = decodeHtmlEntities(main).replace(/ /g, ' ');
  const suggestions: string[] = [];

  const terrace = text.match(/terrasse\s+de\s+(\d+(?:[.,]\d+)?)\s*m(?:²|2)/i);
  if (terrace) {
    suggestions.push(`terrasse (${terrace[1].replace('.', ',')} m²)`);
  }

  const parking = text.match(
    /\b(\d+|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf)\s+places?\s+de\s+parking/i,
  );
  if (parking) {
    const raw = parking[1].toLowerCase();
    const count = /^\d+$/.test(raw) ? Number.parseInt(raw, 10) : FR_NUMBER_WORDS[raw];
    if (count && count > 0) {
      suggestions.push(`${count} place${count > 1 ? 's' : ''} de parking`);
    }
  }

  return suggestions;
}

// Green Acres renders full listing data in the HTML. This extractor reads the
// portal's own labelled blocks (never the first monetary fragment).
export function extractGreenAcres(html: string, originalUrl?: string): PartialListingData {
  const result: PartialListingData = {};

  // Real listing price: <div class="price-container"><span class="price">349 000</span>
  // <span class="symbol">€</span></div>. The number and the € live in SEPARATE
  // elements, so we read span.price's content and never require an adjacent €.
  //
  // We do NOT fall back to `info-price`: on a page that also carries « similar
  // properties » blocks, every info-price is ANOTHER listing's price (each in its
  // own advert-delete-<id>). Reading it would import a neighbour's price. No
  // price-container → leave the price empty rather than guess.
  // Everything price/surface/room-related is read from the main advert region,
  // never the whole document (neighbour cards + price-reduction/converter widgets).
  const main = mainAdvertRegion(html);
  const price = priceFromMainAdvert(main);
  if (price != null) {
    result.price = price;
  }

  // Portal's own price/m²: <div class="surface-price">5 070 €/m²</div>.
  const ppsmRaw = firstMatch(main, /class="surface-price"[^>]*>([^<]+)</i);
  if (ppsmRaw) {
    const decoded = decodeHtmlEntities(ppsmRaw).replace(/€.*/, '');
    const ppsm = normalizePrice(decoded);
    if (ppsm != null) {
      result.portalPricePerSquareMeter = ppsm;
    }
  }

  // Surface: "57 m² de surface habitable" or "Surface : 57 m²".
  const surfaceRaw =
    firstMatch(main, /([\d][\d\s .,&#x;]{0,14})m(?:²|&#xB2;|2)\s*de\s*surface\s*habitable/i) ??
    firstMatch(main, /surface\s*(?:habitable)?\s*:?\s*([\d][\d\s .,&#x;]{0,14})m(?:²|&#xB2;|2)/i);
  const surface = surfaceRaw ? normalizeArea(decodeHtmlEntities(surfaceRaw)) : null;
  if (surface != null) {
    result.surfaceArea = surface;
  }

  // Mission 47 — « Vu 269 fois depuis le 23/07/2026 » : the view count AND the exact
  // listing date. The French date accepts the day on one or two digits (parseFrenchDate).
  const viewsRaw = decodeHtmlEntities(main).match(
    /Vu\s+([\d  .]+)\s*fois\s+depuis\s+le\s+(\d{1,2}[/.-]\d{1,2}[/.-]\d{4})/i,
  );
  if (viewsRaw) {
    const count = Number.parseInt(viewsRaw[1].replace(/\D/g, ''), 10);
    if (Number.isFinite(count)) {
      result.viewCount = count;
    }
    const iso = parseFrenchDate(viewsRaw[2]);
    if (iso) {
      result.viewCountSince = iso;
      // Green Acres dates the listing exactly through this phrase (§1).
      result.listingPublishedAt = iso;
    }
  }

  const rooms = normalizeCount(firstMatch(main, /(\d+)\s*pi[eè]ces?\b/i));
  if (rooms != null) {
    result.roomsCount = rooms;
  }
  const bedrooms = normalizeCount(firstMatch(main, /(\d+)\s*chambres?\b/i));
  if (bedrooms != null) {
    result.bedroomsCount = bedrooms;
  }
  const bathrooms = normalizeCount(firstMatch(main, /(\d+)\s*salles?\s*d[e'’ ]?\s*(?:bain|eau)/i));
  if (bathrooms != null) {
    result.bathroomsCount = bathrooms;
  }

  // Title is kept for display, but city/district are NEVER derived by splitting
  // it on "/" — that breaks on commercial listings ("… professionnel / commercial
  // …") and produces a false city/district. Location comes only from reliable
  // structured sources (resolveLocation).
  const titleRaw = firstMatch(html, /<title[^>]*>([^<]+)<\/title>/i);
  if (titleRaw) {
    const title = decodeHtmlEntities(titleRaw).trim();
    if (title !== '') {
      result.title = title;
    }
  }

  const location = resolveLocation(html, originalUrl);
  if (location.city) {
    result.city = location.city;
  }
  if (location.district) {
    result.district = location.district;
  }

  // Heating + energy source: "chauffage central au fuel".
  const heatingRaw = firstMatch(main, /chauffage\s+([a-zàâçéèêëîïôûùüœ '-]{2,40})/i);
  if (heatingRaw) {
    const heating = decodeHtmlEntities(heatingRaw).trim();
    const auMatch = heating.match(/^(.*?)\s+au\s+([a-zàâçéèêëîïôûùüœ-]+)/i);
    if (auMatch) {
      result.heatingType = auMatch[1].trim();
      result.energySource = auMatch[2].trim();
    } else {
      result.heatingType = heating;
    }
  }

  // Description from Open Graph description.
  const descRaw = firstMatch(html, /<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i);
  if (descRaw) {
    const description = decodeHtmlEntities(descRaw).trim();
    if (description !== '') {
      result.listingDescription = description;
    }
  }

  // Photos scoped to this advert (data-advertid) only, never neighbours' thumbs.
  const advertId = firstMatch(html, /data-advertid="([^"]+)"/i);
  if (advertId) {
    const escaped = advertId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const photoRegex = new RegExp(
      `https://[a-z0-9.]*green-acres[^"' ]*${escaped}[^"' ]*Photos/[^"' ]*\\.(?:jpg|jpeg|webp)`,
      'gi',
    );
    const photos = html.match(photoRegex);
    if (photos && photos.length > 0) {
      result.photoUrls = photos;
    }
  }

  const outdoorSuggestions = outdoorSuggestionsFromRegion(main);
  if (outdoorSuggestions.length > 0) {
    result.outdoorSuggestions = outdoorSuggestions;
  }

  return result;
}
