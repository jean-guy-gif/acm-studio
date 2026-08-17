import type { PartialListingData } from '@/features/comparable-import/types';
import { decodeHtmlEntities } from '@/features/comparable-import/utils/html-text';
import { normalizeArea } from '@/features/comparable-import/utils/normalize-area';
import { normalizeCount } from '@/features/comparable-import/utils/normalize-count';
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

    const rooms = normalizeCount(firstMatch(title, /(\d+)\s*pi[eè]ces?\b/i));
    if (rooms != null) {
      result.roomsCount = rooms;
    }
  }

  const bedrooms = normalizeCount(firstMatch(html, /(\d+)\s*chambres?\b/i));
  if (bedrooms != null) {
    result.bedroomsCount = bedrooms;
  }

  // Listing photos live on the Figaro CDN only; anything else on the page
  // (Google-hosted agency logo, avatars) is not the property.
  const photoRegex =
    /https:\/\/cdn\.immobilier\.lefigaro\.fr\/[^"'\s<>]+\.(?:jpg|jpeg|webp|png)[^"'\s<>]*/gi;
  const photos = html.match(photoRegex);
  if (photos && photos.length > 0) {
    result.photoUrls = photos.map((url) => decodeHtmlEntities(url));
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
