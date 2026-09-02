import 'server-only';

import dns from 'node:dns';

import { MAX_PHOTO_BYTES } from '@/features/subject-property-photos/constants';
import { isAllowedProtocol, normalizeUrl } from '@/features/comparable-import/utils/normalize-url';
import { isBlockedIp, validateUrlForSsrf } from '@/features/comparable-import/utils/ssrf-guard';

// Downloads ONE listing image, server-side, for the photo recovery of Mission 38.
// Same SSRF posture as the page fetcher (comparable-import, reused not modified):
// protocol + syntactic guard, then DNS resolution rejecting blocked IPs. Bounded
// by a timeout and by MAX_PHOTO_BYTES; the caller then validates the bytes with
// the exact same magic-byte/format/size rules as a manual upload.

const TIMEOUT_MS = 8_000;
// Redirects are followed by hand (see below), so bound the chain.
const MAX_REDIRECTS = 3;
const CONTACT_URL = process.env.ACM_BOT_CONTACT_URL ?? 'https://start-academy.fr';
const USER_AGENT = `Mozilla/5.0 (compatible; ACMStudioBot/1.0; +${CONTACT_URL})`;

export type FetchImageResult = { ok: true; bytes: Uint8Array } | { ok: false; error: string };

export type FetchImageDeps = {
  fetchImpl?: typeof fetch;
  resolveHost?: (hostname: string) => Promise<string[]>;
};

async function defaultResolveHost(hostname: string): Promise<string[]> {
  const records = await dns.promises.lookup(hostname, { all: true });
  return records.map((record) => record.address);
}

// Every URL we are about to fetch — the original AND each redirect target — must
// clear the same guard: allowed protocol, syntactic SSRF check, then a DNS
// resolution rejecting blocked IPs (anti-rebind). Returns the parsed URL when it
// is safe to connect, or an error otherwise.
async function assertFetchable(
  rawUrl: string,
  resolveHost: (hostname: string) => Promise<string[]>,
): Promise<{ ok: true; url: URL } | { ok: false; error: string }> {
  const url = normalizeUrl(rawUrl);
  if (!url || !isAllowedProtocol(url)) {
    return { ok: false, error: 'Adresse d’image invalide.' };
  }
  if (!validateUrlForSsrf(url).ok) {
    return { ok: false, error: 'Adresse d’image non autorisée.' };
  }
  try {
    const addresses = await resolveHost(url.hostname);
    if (addresses.length === 0 || addresses.some((address) => isBlockedIp(address))) {
      return { ok: false, error: 'Adresse d’image non autorisée.' };
    }
  } catch {
    return { ok: false, error: 'Hôte de l’image introuvable.' };
  }
  return { ok: true, url };
}

export async function fetchListingImage(
  rawUrl: string,
  deps: FetchImageDeps = {},
): Promise<FetchImageResult> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const resolveHost = deps.resolveHost ?? defaultResolveHost;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    // Manual redirect handling: `redirect: 'follow'` would let the platform jump
    // to a Location we never validated, defeating the guard above (e.g. a listing
    // URL that 302s to http://169.254.169.254/ or a private host). We re-run the
    // full guard on every hop and connect only to addresses we have vetted.
    let nextUrl = rawUrl;
    for (let hop = 0; ; hop++) {
      const guard = await assertFetchable(nextUrl, resolveHost);
      if (!guard.ok) {
        return { ok: false, error: guard.error };
      }
      const response = await fetchImpl(guard.url.href, {
        signal: controller.signal,
        redirect: 'manual',
        headers: { 'User-Agent': USER_AGENT, Accept: 'image/*' },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) {
          return { ok: false, error: 'Redirection d’image invalide.' };
        }
        if (hop >= MAX_REDIRECTS) {
          return { ok: false, error: 'Trop de redirections.' };
        }
        // Resolve relative Location against the current hop, then re-validate.
        nextUrl = new URL(location, guard.url).href;
        continue;
      }

      if (!response.ok) {
        return { ok: false, error: `Téléchargement refusé (${response.status}).` };
      }
      const declaredLength = Number(response.headers.get('content-length'));
      if (Number.isFinite(declaredLength) && declaredLength > MAX_PHOTO_BYTES) {
        return { ok: false, error: 'Image trop volumineuse.' };
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength === 0) {
        return { ok: false, error: 'Image vide.' };
      }
      if (bytes.byteLength > MAX_PHOTO_BYTES) {
        return { ok: false, error: 'Image trop volumineuse.' };
      }
      return { ok: true, bytes };
    }
  } catch {
    return { ok: false, error: 'Téléchargement de l’image échoué.' };
  } finally {
    clearTimeout(timer);
  }
}
