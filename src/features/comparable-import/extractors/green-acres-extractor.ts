import type { PartialListingData } from '@/features/comparable-import/types';
import { decodeHtmlEntities } from '@/features/comparable-import/utils/html-text';
import { normalizeArea } from '@/features/comparable-import/utils/normalize-area';
import { normalizeCount } from '@/features/comparable-import/utils/normalize-count';
import { normalizePrice } from '@/features/comparable-import/utils/normalize-price';

const DOMAIN = 'green-acres.fr';

export function isGreenAcres(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === DOMAIN || host.endsWith(`.${DOMAIN}`);
}

function firstMatch(html: string, regex: RegExp): string | null {
  const match = html.match(regex);
  return match ? match[1] : null;
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

// Green Acres renders full listing data in the HTML. This extractor reads the
// portal's own labelled blocks (never the first monetary fragment).
export function extractGreenAcres(html: string, originalUrl?: string): PartialListingData {
  const result: PartialListingData = {};

  // Real total price: <span class="info-price">340 000 €</span>.
  // Exact class match so "info-price-container" (a wrapper) is not captured.
  const priceRaw = firstMatch(html, /class="info-price"[^>]*>([^<]+)</i);
  const price = priceRaw ? normalizePrice(decodeHtmlEntities(priceRaw)) : null;
  if (price != null) {
    result.price = price;
  }

  // Portal's own price/m²: <div class="surface-price">5 070 €/m²</div>.
  const ppsmRaw = firstMatch(html, /class="surface-price"[^>]*>([^<]+)</i);
  if (ppsmRaw) {
    const decoded = decodeHtmlEntities(ppsmRaw).replace(/€.*/, '');
    const ppsm = normalizePrice(decoded);
    if (ppsm != null) {
      result.portalPricePerSquareMeter = ppsm;
    }
  }

  // Surface: "57 m² de surface habitable" or "Surface : 57 m²".
  const surfaceRaw =
    firstMatch(html, /([\d][\d\s .,&#x;]{0,14})m(?:²|&#xB2;|2)\s*de\s*surface\s*habitable/i) ??
    firstMatch(html, /surface\s*(?:habitable)?\s*:?\s*([\d][\d\s .,&#x;]{0,14})m(?:²|&#xB2;|2)/i);
  const surface = surfaceRaw ? normalizeArea(decodeHtmlEntities(surfaceRaw)) : null;
  if (surface != null) {
    result.surfaceArea = surface;
  }

  const rooms = normalizeCount(firstMatch(html, /(\d+)\s*pi[eè]ces?\b/i));
  if (rooms != null) {
    result.roomsCount = rooms;
  }
  const bedrooms = normalizeCount(firstMatch(html, /(\d+)\s*chambres?\b/i));
  if (bedrooms != null) {
    result.bedroomsCount = bedrooms;
  }
  const bathrooms = normalizeCount(firstMatch(html, /(\d+)\s*salles?\s*d[e'’ ]?\s*(?:bain|eau)/i));
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
  const heatingRaw = firstMatch(html, /chauffage\s+([a-zàâçéèêëîïôûùüœ '-]{2,40})/i);
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

  return result;
}
