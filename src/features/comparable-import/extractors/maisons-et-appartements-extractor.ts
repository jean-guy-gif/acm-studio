import type { PartialListingData } from '@/features/comparable-import/types';
import { decodeHtmlEntities } from '@/features/comparable-import/utils/html-text';
import { normalizeArea } from '@/features/comparable-import/utils/normalize-area';
import { normalizeCount } from '@/features/comparable-import/utils/normalize-count';
import { normalizePrice } from '@/features/comparable-import/utils/normalize-price';
import { readOutdoorSuggestions } from '@/features/comparable-import/utils/read-outdoor-suggestions';

const DOMAIN = 'maisonsetappartements.fr';

export function isMaisonsEtAppartements(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === DOMAIN || host.endsWith(`.${DOMAIN}`);
}

function firstMatch(input: string, regex: RegExp): string | null {
  const match = input.match(regex);
  return match ? match[1] : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// The listing's OWN structured block — the schema.org Product — is THE delimited
// source here: we select it by @type, never by the first ld+json (the page's first
// block is the agency Organization, the third an ItemList of neighbours) and never
// by a first monetary fragment over the whole document. Same discipline as Green
// Acres and Bien'ici.
function readProductJsonLd(html: string): Record<string, unknown> | null {
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(match[1].trim());
    } catch {
      continue;
    }
    const nodes = Array.isArray(parsed) ? parsed : [parsed];
    for (const node of nodes) {
      if (!isRecord(node)) {
        continue;
      }
      const type = node['@type'];
      const isProduct = Array.isArray(type) ? type.includes('Product') : type === 'Product';
      if (isProduct) {
        return node;
      }
    }
  }
  return null;
}

// Property-type / listing words that must never be taken as a city if the name
// format changes.
const NOT_A_CITY = /^(appartements?|maisons?|villas?|terrains?|biens?|locaux|local|immeubles?)$/i;

// Photos scoped to THIS listing. The Product image path carries a group id
// (…/ext_<index>_<groupid>.jpg); neighbours use a different id and the agency logo
// lives under /Agences/. We keep the Product image, then add the same-group photos
// found on the page — never a global sweep of every medias URL.
function scopedPhotos(html: string, productImage: string): string[] {
  const urls = new Set<string>();
  if (productImage) {
    urls.add(productImage);
  }
  const groupId = productImage.match(/ext_\d+_(\d+)\./)?.[1];
  if (groupId) {
    // Exclude the comma too: some galleries pack several URLs in one attribute,
    // and a comma-permissive class would swallow the whole comma-joined list.
    const gallery = new RegExp(
      `https://medias\\.maisonsetappartements\\.fr/[^"'\\s<>,]*ext_\\d+_${groupId}\\.(?:jpg|jpeg|webp|png)`,
      'gi',
    );
    for (const url of html.match(gallery) ?? []) {
      urls.add(url);
    }
  }
  return [...urls];
}

// Maisons et Appartements serves a complete server-rendered page with a clean
// schema.org Product block. We read prix / surface / pièces / ville / titre /
// description / photos from that block. No listing publication date exists on this
// portal (« Publiée », « Mise en ligne », « il y a », « Modifiée » are all absent —
// the dates present are a price validity, the current day and a DPE mention), so
// listingPublishedAt stays empty and the age comes from the first ACM observation.
export function extractMaisonsEtAppartements(html: string): PartialListingData {
  const result: PartialListingData = {};
  const product = readProductJsonLd(html);

  if (!product) {
    // Structured block missing → fall back to the labelled price element only.
    const priceRaw = firstMatch(html, /class="[^"]*prix-ann[^"]*"[^>]*>([^<]+)/i);
    const price = priceRaw ? normalizePrice(decodeHtmlEntities(priceRaw)) : null;
    if (price != null) {
      result.price = price;
    }
    return result;
  }

  // Price: the Offer's numeric price, else parsed from the name, else prix-ann.
  const offers = isRecord(product.offers) ? product.offers : {};
  const name = typeof product.name === 'string' ? product.name.trim() : '';
  const price =
    normalizePrice(offers.price as string | number | undefined) ??
    normalizePrice(firstMatch(name, /([\d][\d\s.]{2,})\s*€/)) ??
    normalizePrice(firstMatch(html, /class="[^"]*prix-ann[^"]*"[^>]*>([^<]+)/i));
  if (price != null) {
    result.price = price;
  }

  if (name !== '') {
    result.title = name;
    // The name packs "Ville - Type à vendre - N pièces - S m² - P €": read each
    // sub-value from it (still the listing's own labelled data, not the page).
    const city = name.split(/\s+-\s+/)[0]?.trim();
    if (city && !NOT_A_CITY.test(city) && !/\d/.test(city)) {
      result.city = city;
    }
    const rooms = normalizeCount(firstMatch(name, /(\d+)\s*pi[eè]ces?\b/i));
    if (rooms != null) {
      result.roomsCount = rooms;
    }
    // No trailing \b after m²: "²" is a non-word character, so a boundary there
    // never matches — the name string is short and controlled, this is enough.
    const surface = normalizeArea(firstMatch(name, /(\d+(?:[.,]\d+)?)\s*m(?:²|2)/i));
    if (surface != null) {
      result.surfaceArea = surface;
    }
  }

  if (typeof product.description === 'string' && product.description.trim() !== '') {
    result.listingDescription = product.description.trim();
    // Mission 49 (revue) — M&A ne publie AUCUNE case d'extérieur/stationnement
    // structurée : jardin, parking, balcon ne vivent que dans la prose du bloc
    // Product (à nous par construction). On les PROPOSE — ligne « — à confirmer » —,
    // jamais on ne les coche (même règle que Green Acres). L'écran laisse le
    // conseiller trancher.
    const suggestions = readOutdoorSuggestions(result.listingDescription);
    if (suggestions.length > 0) {
      result.outdoorSuggestions = suggestions;
    }
  }

  const image =
    typeof product.image === 'string'
      ? product.image
      : Array.isArray(product.image) && typeof product.image[0] === 'string'
        ? product.image[0]
        : '';
  const photos = scopedPhotos(html, image);
  if (photos.length > 0) {
    result.photoUrls = photos;
  }

  return result;
}
