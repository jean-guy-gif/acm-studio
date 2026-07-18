import type { PartialListingData } from '@/features/comparable-import/types';
import { normalizeArea } from '@/features/comparable-import/utils/normalize-area';
import { normalizeCount } from '@/features/comparable-import/utils/normalize-count';
import { normalizePrice } from '@/features/comparable-import/utils/normalize-price';

const DOMAIN = 'bienici.com';

export function isBienIci(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === DOMAIN || host.endsWith(`.${DOMAIN}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Bien'ici is a client-rendered SPA: the public HTML shell contains no listing
// data. This extractor only reads an embedded ad JSON if one is present, and
// returns nothing otherwise (controlled failure, manual entry stays available).
export function extractBienIci(html: string): PartialListingData {
  const result: PartialListingData = {};

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
