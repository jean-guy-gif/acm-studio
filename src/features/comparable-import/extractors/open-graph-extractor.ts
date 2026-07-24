import type { PartialListingData } from '@/features/comparable-import/types';
import { normalizePrice } from '@/features/comparable-import/utils/normalize-price';

function getAttr(tag: string, attr: string): string | null {
  const match = tag.match(new RegExp(`${attr}\\s*=\\s*["']([^"']*)["']`, 'i'));
  return match ? match[1].trim() : null;
}

// Collects all <meta> tags into a list of { key, content }, where key is the
// property or name attribute.
function parseMetaTags(html: string): Array<{ key: string; content: string }> {
  const metas: Array<{ key: string; content: string }> = [];
  const tagRegex = /<meta\s+[^>]*>/gi;
  let tag: RegExpExecArray | null;
  while ((tag = tagRegex.exec(html)) !== null) {
    const key = (getAttr(tag[0], 'property') ?? getAttr(tag[0], 'name'))?.toLowerCase() ?? null;
    const content = getAttr(tag[0], 'content');
    if (key && content !== null) {
      metas.push({ key, content });
    }
  }
  return metas;
}

// Extracts partial listing data from Open Graph / product meta tags.
export function extractOpenGraph(html: string): PartialListingData {
  const metas = parseMetaTags(html);
  const first = (key: string): string | null => {
    const found = metas.find((m) => m.key === key);
    return found && found.content.trim() !== '' ? found.content.trim() : null;
  };

  const result: PartialListingData = {};

  const title = first('og:title');
  if (title) {
    result.title = title;
  }
  const description = first('og:description');
  if (description) {
    result.listingDescription = description;
  }
  const price = normalizePrice(first('product:price:amount'));
  if (price != null) {
    result.price = price;
  }

  const photos: string[] = [];
  for (const meta of metas) {
    // Some portals expose the image only via og:image:secure_url.
    if (
      meta.key === 'og:image' ||
      meta.key === 'og:image:url' ||
      meta.key === 'og:image:secure_url'
    ) {
      if (meta.content.trim() !== '') {
        photos.push(meta.content.trim());
      }
    }
  }
  if (photos.length > 0) {
    result.photoUrls = photos;
  }

  return result;
}
