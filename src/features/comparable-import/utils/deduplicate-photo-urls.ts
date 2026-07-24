export const MAX_PHOTO_URLS = 20;

// Signature that treats the SAME image served in several sizes as one: the query
// string (often ?w=640&h=480) is dropped and explicit dimension / size-variant
// tokens are removed from the path. Bare numbers are left alone so genuinely
// different, index-named photos are never merged.
function photoSignature(url: URL): string {
  let path = url.pathname.toLowerCase();
  path = path.replace(/\b\d{2,4}x\d{2,4}\b/g, ''); // 640x480
  path = path.replace(
    /[-_](?:small|medium|large|thumb|thumbnail|mini|preview|xs|sm|md|lg|xl|xxl|orig|original)(?=[-_.]|$)/g,
    '',
  );
  return `${url.host}${path}`;
}

// Cleans a list of candidate photo URLs: resolves them to absolute http(s) URLs
// against an optional base, drops empties/invalid/forbidden protocols, removes
// exact AND size-variant duplicates (keeping the first / highest-priority one, so
// gallery order is preserved), and caps the count.
export function deduplicatePhotoUrls(
  urls: readonly string[],
  baseUrl?: string,
  max: number = MAX_PHOTO_URLS,
): string[] {
  const seen = new Set<string>();
  const seenSignatures = new Set<string>();
  const result: string[] = [];

  for (const raw of urls) {
    if (typeof raw !== 'string') {
      continue;
    }
    const trimmed = raw.trim();
    if (trimmed === '') {
      continue;
    }

    let absolute: URL;
    try {
      absolute = baseUrl ? new URL(trimmed, baseUrl) : new URL(trimmed);
    } catch {
      continue;
    }

    if (absolute.protocol !== 'http:' && absolute.protocol !== 'https:') {
      continue;
    }

    const key = absolute.toString();
    const signature = photoSignature(absolute);
    if (seen.has(key) || seenSignatures.has(signature)) {
      continue;
    }
    seen.add(key);
    seenSignatures.add(signature);
    result.push(key);
    if (result.length >= max) {
      break;
    }
  }

  return result;
}
