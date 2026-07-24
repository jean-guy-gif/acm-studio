// Deterministic HTML image scanner. Real portals lazy-load gallery photos via
// data-src / data-lazy-src / srcset rather than a plain <img src>, so a naive
// extractor finds nothing. This reads <img> and <source> tags in document order,
// preferring the lazy / highest-resolution candidate per tag. No headless, no AI.

// Attribute priority per tag: the real (lazy) image wins over a placeholder src.
const URL_ATTRS = ['data-src', 'data-lazy-src', 'data-original', 'data-lazy', 'src'] as const;

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&#0*38;/g, '&')
    .replace(/&#x0*26;/gi, '&');
}

function attr(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return match ? (match[1] ?? match[2] ?? match[3] ?? null) : null;
}

// Pick the highest-resolution candidate from a srcset (largest w / x descriptor,
// else the last entry).
function bestFromSrcset(srcset: string): string | null {
  const candidates = srcset
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [url, descriptor] = part.split(/\s+/);
      const match = descriptor?.match(/^(\d+(?:\.\d+)?)[wx]$/);
      return { url, weight: match ? Number.parseFloat(match[1]) : 0 };
    })
    .filter((candidate) => candidate.url);
  if (candidates.length === 0) {
    return null;
  }
  const weighted = candidates.filter((candidate) => candidate.weight > 0);
  if (weighted.length > 0) {
    return weighted.reduce((best, candidate) => (candidate.weight > best.weight ? candidate : best))
      .url;
  }
  return candidates[candidates.length - 1].url;
}

export function extractImageUrls(html: string): string[] {
  const urls: string[] = [];
  const tags = html.match(/<(?:img|source)\b[^>]*>/gi) ?? [];

  for (const tag of tags) {
    // srcset (lazy variant first, then eager) usually carries the real gallery.
    const srcset = attr(tag, 'data-srcset') ?? attr(tag, 'data-lazy-srcset') ?? attr(tag, 'srcset');
    let candidate = srcset ? bestFromSrcset(srcset) : null;
    if (!candidate) {
      for (const name of URL_ATTRS) {
        const value = attr(tag, name);
        if (value) {
          candidate = value;
          break;
        }
      }
    }
    if (candidate) {
      const decoded = decodeEntities(candidate.trim());
      if (decoded !== '' && !decoded.startsWith('data:')) {
        urls.push(decoded);
      }
    }
  }

  return urls;
}
