import dns from 'node:dns';

import { isAllowedProtocol, normalizeUrl } from '@/features/comparable-import/utils/normalize-url';
import {
  ALLOW_ALL,
  parseRobots,
  type RobotsPolicy,
} from '@/features/comparable-import/utils/robots-policy';
import { isBlockedIp, validateUrlForSsrf } from '@/features/comparable-import/utils/ssrf-guard';

export const FETCH_LIMITS = {
  // Terrain (19/08) : les pages d'annonces pèsent 195 Ko à 995 Ko et mettent
  // plusieurs secondes à répondre. Huit secondes et 2 Mo étaient trop justes.
  timeoutMs: 15_000,
  maxRedirects: 3,
  maxBytes: 6 * 1024 * 1024,
  robotsTimeoutMs: 5_000,
  robotsCacheMs: 15 * 60 * 1000,
} as const;

const ACCEPTED_CONTENT_TYPES = ['text/html', 'application/xhtml+xml'];

// Carte d'identité du robot. Le préfixe « Mozilla/5.0 (compatible; … ) » est la
// convention des moteurs (Googlebot, Bingbot) : ce n'est pas un déguisement en
// navigateur, c'est le format que les portails savent lire. Le nom du robot et
// une adresse de contact y figurent en clair — nous ne prétendons jamais être
// autre chose que ce que nous sommes.
export const BOT_TOKEN = 'acmstudiobot';
const CONTACT_URL = process.env.ACM_BOT_CONTACT_URL ?? 'https://start-academy.fr';
const USER_AGENT = `Mozilla/5.0 (compatible; ACMStudioBot/1.0; +${CONTACT_URL})`;

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
  robots:
    'Ce portail interdit l’analyse automatique de cette page. Utilisez le copier-coller ci-dessous.',
} as const;

export type FetchDeps = {
  fetchImpl?: typeof fetch;
  resolveHost?: (hostname: string) => Promise<string[]>;
  // Permet aux tests de fournir la politique sans appel réseau.
  robotsFor?: (url: URL) => Promise<RobotsPolicy>;
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

// Politique robots.txt par hôte, gardée en mémoire le temps de quelques imports.
const robotsCache = new Map<string, { policy: RobotsPolicy; at: number }>();

// Récupère et interprète le robots.txt de l'hôte.
//
// En cas d'absence (404) ou d'échec, on autorise : c'est le comportement prévu
// par le protocole, et refuser sur une panne réseau bloquerait l'outil sans
// raison. L'appel est court et mis en cache : un import n'ajoute pas une
// requête à chaque fois.
async function fetchRobotsPolicy(
  url: URL,
  fetchImpl: typeof fetch,
  resolveHost: (hostname: string) => Promise<string[]>,
): Promise<RobotsPolicy> {
  const key = url.origin;
  const cached = robotsCache.get(key);
  if (cached && Date.now() - cached.at < FETCH_LIMITS.robotsCacheMs) {
    return cached.policy;
  }

  let policy: RobotsPolicy = ALLOW_ALL;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_LIMITS.robotsTimeoutMs);
  try {
    // Redirections suivies à la main, comme la page : un robots.txt qui redirige
    // vers une adresse interne ne doit pas être suivi (SSRF aveugle). On rejoue
    // isHostAllowed à chaque saut et on plafonne la chaîne. En cas de blocage ou
    // d'échec, on retombe sur ALLOW_ALL (comportement prévu par le protocole).
    let current = new URL('/robots.txt', url.origin);
    for (let redirect = 0; redirect <= FETCH_LIMITS.maxRedirects; redirect += 1) {
      if (!(await isHostAllowed(current, resolveHost))) {
        break;
      }
      const response = await fetchImpl(current.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'user-agent': USER_AGENT, accept: 'text/plain' },
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location || redirect >= FETCH_LIMITS.maxRedirects) {
          break;
        }
        let next: URL;
        try {
          next = new URL(location, current);
        } catch {
          break;
        }
        if (!isAllowedProtocol(next)) {
          break;
        }
        current = next;
        continue;
      }
      if (response.ok) {
        policy = parseRobots(await response.text(), BOT_TOKEN);
      }
      break;
    }
  } catch {
    policy = ALLOW_ALL;
  } finally {
    clearTimeout(timer);
  }

  robotsCache.set(key, { policy, at: Date.now() });
  return policy;
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
  const robotsFor =
    deps.robotsFor ?? ((url: URL) => fetchRobotsPolicy(url, fetchImpl, resolveHost));

  let current = normalizeUrl(rawUrl);
  if (!current || !isAllowedProtocol(current)) {
    return { ok: false, error: FETCH_MESSAGES.invalid };
  }

  for (let redirect = 0; redirect <= FETCH_LIMITS.maxRedirects; redirect += 1) {
    if (!(await isHostAllowed(current, resolveHost))) {
      return { ok: false, error: FETCH_MESSAGES.forbidden };
    }

    // Le portail publie ses règles : on les lit et on s'y tient, y compris
    // après une redirection.
    const robots = await robotsFor(current);
    if (!robots.isAllowed(current.pathname + current.search)) {
      return { ok: false, error: FETCH_MESSAGES.robots };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_LIMITS.timeoutMs);
    let response: Response;
    try {
      response = await fetchImpl(current.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'user-agent': USER_AGENT,
          accept: 'text/html,application/xhtml+xml',
          'accept-language': 'fr-FR,fr;q=0.9',
        },
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
