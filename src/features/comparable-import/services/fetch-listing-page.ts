import dns from 'node:dns';

import { isAllowedProtocol, normalizeUrl } from '@/features/comparable-import/utils/normalize-url';
import { isBlockedIp, validateUrlForSsrf } from '@/features/comparable-import/utils/ssrf-guard';

export const FETCH_LIMITS = {
  timeoutMs: 8000,
  maxRedirects: 3,
  maxBytes: 2 * 1024 * 1024,
} as const;

const ACCEPTED_CONTENT_TYPES = ['text/html', 'application/xhtml+xml'];
const USER_AGENT = 'ACMStudioImporter/1.0 (+listing-import; no-cookies)';

// User-facing messages (already safe to display; no internal detail leaked).
export const FETCH_MESSAGES = {
  invalid: 'URL invalide.',
  unanalyzable: 'Cette adresse ne peut pas être analysée.',
  forbidden: 'Cette adresse est interdite.',
  refused: 'Le site a refusé l’accès à l’annonce.',
  timeout: 'L’analyse de l’annonce a expiré.',
  tooLarge: 'La réponse reçue est trop volumineuse.',
  notHtml: 'Le contenu reçu n’est pas une page HTML.',
  unavailable: 'L’annonce semble indisponible ou supprimée.',
} as const;

export type FetchDeps = {
  fetchImpl?: typeof fetch;
  resolveHost?: (hostname: string) => Promise<string[]>;
};

export type FetchPageResult =
  { ok: true; html: string; finalUrl: string } | { ok: false; error: string };

async function defaultResolveHost(hostname: string): Promise<string[]> {
  const records = await dns.promises.lookup(hostname, { all: true });
  return records.map((record) => record.address);
}

// Validates a URL (syntactic) AND resolves its hostname, refusing if any
// resolved address is in a blocked range. Called before every hop.
async function isHostAllowed(
  url: URL,
  resolveHost: (hostname: string) => Promise<string[]>,
): Promise<boolean> {
  if (!validateUrlForSsrf(url).ok) {
    return false;
  }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  let addresses: string[];
  try {
    addresses = await resolveHost(host);
  } catch {
    return false;
  }
  if (addresses.length === 0) {
    return false;
  }
  return addresses.every((address) => !isBlockedIp(address));
}

async function readLimited(response: Response, maxBytes: number): Promise<string | null> {
  const body = response.body;
  if (!body) {
    const text = await response.text();
    return Buffer.byteLength(text, 'utf8') > maxBytes ? null : text;
  }
  const reader = body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    if (value) {
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(Buffer.from(value));
    }
  }
  return Buffer.concat(chunks).toString('utf8');
}

// Fetches a listing page server-side with SSRF protection, timeout, manual
// redirect revalidation, size cap and Content-Type validation. No cookies, no
// auth headers, no JavaScript execution. fetch/DNS are injectable for tests.
export async function fetchListingPage(
  rawUrl: string,
  deps: FetchDeps = {},
): Promise<FetchPageResult> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const resolveHost = deps.resolveHost ?? defaultResolveHost;

  let current = normalizeUrl(rawUrl);
  if (!current || !isAllowedProtocol(current)) {
    return { ok: false, error: FETCH_MESSAGES.invalid };
  }

  for (let redirect = 0; redirect <= FETCH_LIMITS.maxRedirects; redirect += 1) {
    if (!(await isHostAllowed(current, resolveHost))) {
      return { ok: false, error: FETCH_MESSAGES.forbidden };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_LIMITS.timeoutMs);
    let response: Response;
    try {
      response = await fetchImpl(current.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml' },
      });
    } catch (error) {
      clearTimeout(timer);
      if (error instanceof Error && error.name === 'AbortError') {
        return { ok: false, error: FETCH_MESSAGES.timeout };
      }
      return { ok: false, error: FETCH_MESSAGES.unanalyzable };
    }
    clearTimeout(timer);

    if (response.status >= 300 && response.status < 400) {
      if (redirect >= FETCH_LIMITS.maxRedirects) {
        return { ok: false, error: FETCH_MESSAGES.forbidden };
      }
      const location = response.headers.get('location');
      if (!location) {
        return { ok: false, error: FETCH_MESSAGES.unavailable };
      }
      let next: URL;
      try {
        next = new URL(location, current);
      } catch {
        return { ok: false, error: FETCH_MESSAGES.forbidden };
      }
      if (!isAllowedProtocol(next)) {
        return { ok: false, error: FETCH_MESSAGES.forbidden };
      }
      current = next;
      continue;
    }

    if (response.status === 401 || response.status === 403 || response.status === 429) {
      return { ok: false, error: FETCH_MESSAGES.refused };
    }
    if (response.status === 404 || response.status === 410) {
      return { ok: false, error: FETCH_MESSAGES.unavailable };
    }
    if (response.status >= 400) {
      return { ok: false, error: FETCH_MESSAGES.unavailable };
    }

    const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
    if (!ACCEPTED_CONTENT_TYPES.some((type) => contentType.includes(type))) {
      return { ok: false, error: FETCH_MESSAGES.notHtml };
    }

    const html = await readLimited(response, FETCH_LIMITS.maxBytes);
    if (html === null) {
      return { ok: false, error: FETCH_MESSAGES.tooLarge };
    }
    return { ok: true, html, finalUrl: current.toString() };
  }

  return { ok: false, error: FETCH_MESSAGES.forbidden };
}
