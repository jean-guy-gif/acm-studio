export const ALLOWED_PROTOCOLS = ['http:', 'https:'];

// Parses a user-supplied string into a URL. Returns null when it is not a
// syntactically valid absolute URL. Protocol filtering is done separately.
export function normalizeUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return null;
  }
  try {
    return new URL(trimmed);
  } catch {
    return null;
  }
}

export function isAllowedProtocol(url: URL): boolean {
  return ALLOWED_PROTOCOLS.includes(url.protocol);
}
