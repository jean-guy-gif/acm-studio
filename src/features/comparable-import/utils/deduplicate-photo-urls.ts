export const MAX_PHOTO_URLS = 20;

// Cleans a list of candidate photo URLs: resolves them to absolute http(s)
// URLs against an optional base, drops empties/invalid/forbidden protocols,
// de-duplicates, and caps the count.
export function deduplicatePhotoUrls(
  urls: readonly string[],
  baseUrl?: string,
  max: number = MAX_PHOTO_URLS,
): string[] {
  const seen = new Set<string>();
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
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(key);
    if (result.length >= max) {
      break;
    }
  }

  return result;
}
