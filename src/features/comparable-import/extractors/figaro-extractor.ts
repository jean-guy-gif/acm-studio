import type { PartialListingData } from '@/features/comparable-import/types';
import { decodeHtmlEntities } from '@/features/comparable-import/utils/html-text';
import { normalizeArea } from '@/features/comparable-import/utils/normalize-area';
import {
  normalizeCount,
  studioRoomsCount,
} from '@/features/comparable-import/utils/normalize-count';
import { normalizePrice } from '@/features/comparable-import/utils/normalize-price';

// Both Figaro real-estate hosts share the same photo CDN and close title
// conventions: proprietes.lefigaro.fr (prestige) and immobilier.lefigaro.fr.
const DOMAINS = ['proprietes.lefigaro.fr', 'immobilier.lefigaro.fr'];

export function isFigaro(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, '');
  return DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

function firstMatch(input: string, regex: RegExp): string | null {
  const match = input.match(regex);
  return match ? match[1] : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Mission 76 — the photo list of the ad, from the page's own structured data.
//
// Measured on 07/10/2026 (annonce-109593037, annonce-109592503): Figaro Immobilier
// no longer serves its photos from cdn.immobilier.lefigaro.fr (only pictograms are
// left there) but from lh3.googleusercontent.com, and the whole gallery is published
// in the application state « __NUXT_DATA__ »:
//   data → classifiedDetailResponse → classified → images → photos[]
//   each photo: { order, url: { "extra-large", "large", "medium", "small" } }
// The import was bringing back 20 pictograms and no photo at all.
//
// The state is a flat table: every value is a cell, and objects/arrays hold the
// INDEX of their children; a reactive wrapper is written ["ShallowReactive", index].
// We follow the path above cell by cell and read nothing else — the similar and
// related ads of the same state (« similarClassifieds », « relatedClassifieds ») are
// other branches, never visited.
const NUXT_WRAPPERS = new Set(['ShallowReactive', 'Reactive', 'ShallowRef', 'Ref']);
const PHOTO_SIZES = ['extra-large', 'large'] as const;

function structuredPhotoUrls(html: string): string[] {
  const raw = firstMatch(html, /<script[^>]*\bid="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (!raw) {
    return [];
  }
  let table: unknown;
  try {
    table = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(table)) {
    return [];
  }
  const cells: unknown[] = table;

  // The cell at an index, unwrapping reactive wrappers (bounded: no loop on a
  // malformed table).
  function cell(index: unknown): unknown {
    let value: unknown = typeof index === 'number' ? cells[index] : undefined;
    for (let depth = 0; depth < 4; depth++) {
      if (
        Array.isArray(value) &&
        value.length === 2 &&
        typeof value[0] === 'string' &&
        NUXT_WRAPPERS.has(value[0])
      ) {
        value = typeof value[1] === 'number' ? cells[value[1]] : undefined;
      } else {
        break;
      }
    }
    return value;
  }

  let node: unknown = cell(1);
  for (const key of ['data', 'classifiedDetailResponse', 'classified', 'images', 'photos']) {
    node = isRecord(node) ? cell(node[key]) : undefined;
  }
  if (!Array.isArray(node)) {
    return [];
  }

  const urls: string[] = [];
  for (const photoIndex of node) {
    const photo = cell(photoIndex);
    const sizes = isRecord(photo) ? cell(photo.url) : undefined;
    if (!isRecord(sizes)) {
      continue;
    }
    for (const size of PHOTO_SIZES) {
      const url = cell(sizes[size]);
      if (typeof url === 'string' && /^https:\/\//.test(url)) {
        urls.push(url);
        break;
      }
    }
  }
  return [...new Set(urls)];
}

// The <title> of a Figaro listing carries the reliable key data, e.g.
// "Vente Appartement / Penthouse de Luxe Lège-Cap-Ferret | 990 000 € | 98 m²".
// The page's JSON-LD @graph mixes the AGENCY Organization (Paris HQ address,
// Google-hosted logo) with the listing, so the generic extractors alone would
// yield a wrong city/photo — this portal extractor supplies the trusted values.
export function extractFigaro(html: string): PartialListingData {
  const result: PartialListingData = {};

  const titleRaw =
    firstMatch(html, /<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i) ??
    firstMatch(html, /<title[^>]*>([^<]+)<\/title>/i);
  if (titleRaw) {
    const title = decodeHtmlEntities(titleRaw).replace(/\s+/g, ' ').trim();
    if (title !== '') {
      result.title = title;
    }

    // Segments separated by "|": "… Ville | 990 000 € | 98 m²".
    const segments = title.split('|').map((segment) => segment.trim());
    for (const segment of segments.slice(1)) {
      if (result.price == null && /€/.test(segment)) {
        const price = normalizePrice(segment);
        if (price != null) {
          result.price = price;
        }
        continue;
      }
      if (result.surfaceArea == null && /m(?:²|2)\s*$/i.test(segment)) {
        const surface = normalizeArea(segment);
        if (surface != null) {
          result.surfaceArea = surface;
        }
      }
    }

    // City: last words of the first segment, after the property-type wording.
    // "Vente Appartement / Penthouse de Luxe Lège-Cap-Ferret" -> "Lège-Cap-Ferret"
    // "Appartement à vendre 3 pièces 65 m² Nice (06000)" -> "Nice"
    const head = segments[0];
    const cityFromLuxe = firstMatch(head, /de\s+(?:Luxe|Prestige)\s+(.{2,60})$/i);
    const cityFromParens = firstMatch(
      head,
      /([A-ZÀ-Ÿ][\p{L}'’-]+(?:\s[A-ZÀ-Ÿ][\p{L}'’-]+)*)\s*\(\d{5}\)/u,
    );
    const city = (cityFromLuxe ?? cityFromParens)?.trim();
    if (city && !/\d/.test(city)) {
      result.city = city;
    }
    const postalCode = firstMatch(head, /\((\d{5})\)/);
    if (postalCode) {
      result.postalCode = postalCode;
    }

    // Mission 68 — « Studio » / « T1 » / « F1 » sans « N pièces » dans le titre = 1 pièce.
    const rooms =
      normalizeCount(firstMatch(title, /(\d+)\s*pi[eè]ces?\b/i)) ?? studioRoomsCount(title);
    if (rooms != null) {
      result.roomsCount = rooms;
    }
  }

  const bedrooms = normalizeCount(firstMatch(html, /(\d+)\s*chambres?\b/i));
  if (bedrooms != null) {
    result.bedroomsCount = bedrooms;
  }

  // Mission 76 — the ad's own structured list first (complete, full size). Without
  // it (older page), the gallery of the Figaro CDN: anything else on the page
  // (Google-hosted agency logo, avatars) is not the property.
  const structuredPhotos = structuredPhotoUrls(html);
  if (structuredPhotos.length > 0) {
    result.photoUrls = structuredPhotos;
  } else {
    const photoRegex =
      /https:\/\/cdn\.immobilier\.lefigaro\.fr\/[^"'\s<>]+\.(?:jpg|jpeg|webp|png)[^"'\s<>]*/gi;
    const photos = html.match(photoRegex);
    if (photos && photos.length > 0) {
      result.photoUrls = photos.map((url) => decodeHtmlEntities(url));
    }
  }

  const descRaw = firstMatch(html, /<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i);
  if (descRaw) {
    const description = decodeHtmlEntities(descRaw).trim();
    if (description !== '') {
      result.listingDescription = description;
    }
  }

  return result;
}
