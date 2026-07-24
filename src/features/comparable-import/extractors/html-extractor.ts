import type { PartialListingData } from '@/features/comparable-import/types';
import { extractImageUrls } from '@/features/comparable-import/utils/extract-image-urls';
import { normalizeArea } from '@/features/comparable-import/utils/normalize-area';
import { normalizeCount } from '@/features/comparable-import/utils/normalize-count';
import { normalizePrice } from '@/features/comparable-import/utils/normalize-price';

function firstMatch(html: string, regex: RegExp): string | null {
  const match = html.match(regex);
  return match ? match[1] : null;
}

// Simple, portal-agnostic fallback. Only fills values it can match with an
// explicit pattern; anything uncertain is left empty.
export function extractHtml(html: string): PartialListingData {
  const result: PartialListingData = {};

  const titleTag = firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleTag) {
    const title = titleTag.replace(/\s+/g, ' ').trim();
    if (title !== '') {
      result.title = title;
    }
  }

  const metaDescription = firstMatch(
    html,
    /<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i,
  );
  if (metaDescription && metaDescription.trim() !== '') {
    result.listingDescription = metaDescription.trim();
  }

  // Conservative: only accept a price explicitly tied to a "prix" label, never
  // the first monetary fragment in the page.
  const priceText = firstMatch(html, /prix\D{0,40}?([\d][\d\s.,]*)\s*(?:€|eur\b)/i);
  const price = normalizePrice(priceText);
  if (price != null) {
    result.price = price;
  }

  // Conservative: only accept a surface explicitly tied to a "surface" label,
  // never a bare number followed by m².
  const surfaceText = firstMatch(
    html,
    /surface(?:\s+habitable)?\D{0,20}?([\d][\d\s.,]*)\s*m(?:²|2)(?![a-z])/i,
  );
  const surface = normalizeArea(surfaceText);
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

  // Portal's own price/m², tied to an explicit €/m² (or "prix au m²") label.
  const ppsm = normalizePrice(
    firstMatch(html, /([\d][\d\s.,]*)\s*(?:€|eur)\s*\/\s*m(?:²|2)/i) ??
      firstMatch(html, /prix\s*au\s*m(?:²|2)\D{0,20}?([\d][\d\s.,]*)/i),
  );
  if (ppsm != null) {
    result.portalPricePerSquareMeter = ppsm;
  }

  // DPE (energy class): the rating letter must directly follow an explicit DPE /
  // performance-énergétique label, and must be a standalone letter (not part of
  // an A–G scale). Never an isolated letter grabbed from anywhere on the page.
  const dpe = firstMatch(
    html,
    /(?:DPE|diagnostic\s+de\s+performance\s+[eé]nerg[eé]tique|performance\s+[eé]nerg[eé]tique|energy\s+performance)\s*[:\-–]?\s*([A-G])(?![A-Za-z])/i,
  );
  if (dpe) {
    result.energyRating = dpe.toUpperCase();
  }

  // GES (greenhouse gas): extracted from its own explicit label, separately.
  const ges = firstMatch(
    html,
    /(?:GES|gaz\s+[àa]\s+effet\s+de\s+serre|greenhouse\s+gas)\s*[:\-–]?\s*([A-G])(?![A-Za-z])/i,
  );
  if (ges) {
    result.gesRating = ges.toUpperCase();
  }

  // Gallery images from <img>/<source> (src, data-src, data-lazy-src, srcset).
  // Generic assets + relative-URL resolution + dedup are handled downstream.
  const images = extractImageUrls(html);
  if (images.length > 0) {
    result.photoUrls = images;
  }

  return result;
}
