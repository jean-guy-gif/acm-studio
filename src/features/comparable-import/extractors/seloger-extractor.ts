import type { PartialListingData } from '@/features/comparable-import/types';
import { decodeHtmlEntities } from '@/features/comparable-import/utils/html-text';
import { normalizeArea } from '@/features/comparable-import/utils/normalize-area';
import { normalizeCount } from '@/features/comparable-import/utils/normalize-count';
import { normalizePrice } from '@/features/comparable-import/utils/normalize-price';

const DOMAIN = 'seloger.com';

export function isSeLoger(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === DOMAIN || host.endsWith(`.${DOMAIN}`);
}

function firstMatch(input: string, regex: RegExp): string | null {
  const match = input.match(regex);
  return match ? match[1] : null;
}

// "l-estagnol" -> "L'Estagnol", "antibes" -> "Antibes".
function toLabel(slug: string): string {
  return slug
    .replace(/^([ld])-/i, "$1'")
    .split('-')
    .map((word) => (word === '' ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ')
    .replace(/(['’])([a-zà-ÿ])/g, (_, apostrophe, char) => apostrophe + char.toUpperCase());
}

// Parses city/district from a SeLoger listing path like ".../antibes-06/l-estagnol/...".
function locationFromUrl(rawUrl: string | undefined): { city?: string; district?: string } {
  if (!rawUrl) {
    return {};
  }
  const match = rawUrl.match(/\/([a-z-]+)-\d{2}\/([a-z'’-]+)\//i);
  if (!match) {
    return {};
  }
  return { city: toLabel(match[1]), district: toLabel(match[2]) };
}

// SeLoger exposes the key data in og:title ("... T3/F3 52 m² 303000 € ...").
// City/district come from the ORIGINAL advisor URL (not the redirected canonical
// one). DPE/GES are handled by the strict generic extractors, never here.
export function extractSeLoger(html: string, originalUrl?: string): PartialListingData {
  const result: PartialListingData = {};

  const ogTitleRaw = firstMatch(html, /<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i);
  if (ogTitleRaw) {
    const title = decodeHtmlEntities(ogTitleRaw).trim();
    if (title !== '') {
      result.title = title;
    }
    const price = normalizePrice(firstMatch(title, /([\d][\d\s.]{3,})\s*€/));
    if (price != null) {
      result.price = price;
    }
    const surface = normalizeArea(firstMatch(title, /(\d+(?:[.,]\d+)?)\s*m(?:²|2)/i));
    if (surface != null) {
      result.surfaceArea = surface;
    }
    const rooms = normalizeCount(firstMatch(title, /\b[TF](\d+)\b/));
    if (rooms != null) {
      result.roomsCount = rooms;
    }
  }

  // Prefer the original URL; fall back to og:url only if needed.
  const ogUrl = firstMatch(html, /<meta[^>]+property="og:url"[^>]+content="([^"]+)"/i) ?? undefined;
  const location = locationFromUrl(originalUrl).city
    ? locationFromUrl(originalUrl)
    : locationFromUrl(ogUrl);
  if (location.city) {
    result.city = location.city;
  }
  if (location.district) {
    result.district = location.district;
  }

  return result;
}
