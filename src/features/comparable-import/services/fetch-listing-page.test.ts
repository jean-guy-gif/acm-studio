import { describe, expect, it, vi } from 'vitest';

import {
  FETCH_LIMITS,
  FETCH_MESSAGES,
  fetchListingPage,
} from '@/features/comparable-import/services/fetch-listing-page';

const publicResolve = async () => ['93.184.216.34'];
const htmlResponse = (body: string, headers: Record<string, string> = {}) =>
  new Response(body, { status: 200, headers: { 'content-type': 'text/html', ...headers } });

describe('fetchListingPage — SSRF', () => {
  it('rejects forbidden protocols and localhost/private literals before any request', async () => {
    const fetchImpl = vi.fn();
    for (const url of [
      'file:///etc/passwd',
      'ftp://example.com/file',
      'data:text/html,test',
      'http://localhost',
      'http://127.0.0.1',
      'http://0.0.0.0',
      'http://10.0.0.1',
      'http://172.16.0.1',
      'http://192.168.1.1',
      'http://169.254.169.254',
      'http://[::1]',
      'http://[fc00::1]',
      'http://[fe80::1]',
    ]) {
      const result = await fetchListingPage(url, { fetchImpl, resolveHost: publicResolve });
      expect(result.ok, url).toBe(false);
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects a public domain that resolves to a private IP (no request sent)', async () => {
    const fetchImpl = vi.fn();
    const result = await fetchListingPage('http://evil.example.com', {
      fetchImpl,
      resolveHost: async () => ['127.0.0.1'],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(FETCH_MESSAGES.forbidden);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects a redirect to a private address', async () => {
    const fetchImpl = vi.fn(
      async () => new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/' } }),
    );
    const result = await fetchListingPage('https://example.com/a', {
      fetchImpl,
      resolveHost: publicResolve,
    });
    expect(result.ok).toBe(false);
  });

  it('rejects a redirect chain that exceeds the limit', async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const current = typeof input === 'string' ? input : input.toString();
      const n = Number(new URL(current).searchParams.get('n') ?? '0');
      return new Response(null, {
        status: 302,
        headers: { location: `https://example.com/?n=${n + 1}` },
      });
    });
    const result = await fetchListingPage('https://example.com/?n=0', {
      fetchImpl,
      resolveHost: publicResolve,
    });
    expect(result.ok).toBe(false);
  });
});

describe('fetchListingPage — network', () => {
  it('returns the html for a valid page', async () => {
    const fetchImpl = vi.fn(async () => htmlResponse('<html>ok</html>'));
    const result = await fetchListingPage('https://example.com/a', {
      fetchImpl,
      resolveHost: publicResolve,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.html).toContain('ok');
  });

  it('follows a valid redirect', async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/start')) {
        return new Response(null, {
          status: 301,
          headers: { location: 'https://example.com/final' },
        });
      }
      return htmlResponse('<html>final</html>');
    });
    const result = await fetchListingPage('https://example.com/start', {
      fetchImpl,
      resolveHost: publicResolve,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.finalUrl).toContain('/final');
  });

  it('maps http status codes to controlled messages', async () => {
    const cases: Array<[number, string]> = [
      [403, FETCH_MESSAGES.refused],
      [429, FETCH_MESSAGES.refused],
      [404, FETCH_MESSAGES.unavailable],
      [500, FETCH_MESSAGES.unavailable],
    ];
    for (const [status, message] of cases) {
      const fetchImpl = vi.fn(async () => new Response('x', { status }));
      const result = await fetchListingPage('https://example.com/a', {
        fetchImpl,
        resolveHost: publicResolve,
      });
      expect(result.ok, String(status)).toBe(false);
      if (!result.ok) expect(result.error).toBe(message);
    }
  });

  it('rejects non-html content types', async () => {
    for (const type of ['application/pdf', 'image/jpeg', '']) {
      const fetchImpl = vi.fn(
        async () =>
          new Response('x', { status: 200, headers: type ? { 'content-type': type } : {} }),
      );
      const result = await fetchListingPage('https://example.com/a', {
        fetchImpl,
        resolveHost: publicResolve,
      });
      expect(result.ok, type).toBe(false);
      if (!result.ok) expect(result.error).toBe(FETCH_MESSAGES.notHtml);
    }
  });

  it('rejects a response over the size limit', async () => {
    const big = 'x'.repeat(FETCH_LIMITS.maxBytes + 1);
    const fetchImpl = vi.fn(async () => htmlResponse(big));
    const result = await fetchListingPage('https://example.com/a', {
      fetchImpl,
      resolveHost: publicResolve,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(FETCH_MESSAGES.tooLarge);
  });

  it('maps an aborted request to a timeout message', async () => {
    const fetchImpl = vi.fn(async () => {
      const error = new Error('aborted');
      error.name = 'AbortError';
      throw error;
    });
    const result = await fetchListingPage('https://example.com/a', {
      fetchImpl,
      resolveHost: publicResolve,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(FETCH_MESSAGES.timeout);
  });
});

// Terrain (19/08) : SeLoger et Green Acres autorisent les pages d'annonces,
// Belles Demeures les interdit. L'outil se présente honnêtement ; il doit donc
// aussi obéir aux règles que le portail publie.
describe('fetchListingPage — robots.txt', () => {
  it('refuse une page interdite par le portail', async () => {
    const fetchImpl = vi.fn(async () => htmlResponse('<html></html>'));
    const result = await fetchListingPage('https://exemple.fr/annonces/1', {
      fetchImpl,
      resolveHost: publicResolve,
      robotsFor: async () => ({ isAllowed: () => false }),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(FETCH_MESSAGES.robots);
    // La page elle-même n'a jamais été demandée.
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('procède quand le portail autorise la page', async () => {
    const fetchImpl = vi.fn(async () => htmlResponse('<html>annonce</html>'));
    const result = await fetchListingPage('https://exemple.fr/annonces/1', {
      fetchImpl,
      resolveHost: publicResolve,
      robotsFor: async () => ({ isAllowed: () => true }),
    });
    expect(result.ok).toBe(true);
  });

  it('ne suit pas une redirection de robots.txt vers une IP bloquée', async () => {
    // Hôte unique : évite toute collision avec le cache robots.txt d'autres tests.
    const base = 'https://robots-ssrf.example';
    const internalHost = 'internal.robots-ssrf.example';
    const calledUrls: string[] = [];
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const target = typeof input === 'string' ? input : input.toString();
      calledUrls.push(target);
      const parsed = new URL(target);
      // Le robots.txt de l'hôte public redirige vers un robots.txt interne.
      if (parsed.hostname === 'robots-ssrf.example' && parsed.pathname === '/robots.txt') {
        return new Response(null, {
          status: 302,
          headers: { location: `https://${internalHost}/robots.txt` },
        });
      }
      return htmlResponse('<html>annonce</html>');
    });
    const resolveHost = async (hostname: string) =>
      hostname === internalHost ? ['10.0.0.5'] : ['93.184.216.34'];

    const result = await fetchListingPage(`${base}/annonces/1`, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      resolveHost,
    });

    // robots.txt retombe sur ALLOW_ALL, la page est récupérée normalement…
    expect(result.ok).toBe(true);
    // …mais la cible interne de la redirection n'a jamais été contactée.
    expect(calledUrls.some((url) => url.includes(internalHost))).toBe(false);
  });

  it('se présente sous une identité de robot nommée et contactable', async () => {
    let sent: Record<string, string> = {};
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      sent = (init?.headers ?? {}) as Record<string, string>;
      return htmlResponse('<html></html>');
    });
    await fetchListingPage('https://exemple.fr/annonces/1', {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      resolveHost: publicResolve,
      robotsFor: async () => ({ isAllowed: () => true }),
    });
    expect(sent['user-agent']).toContain('ACMStudioBot');
    expect(sent['user-agent']).toContain('+http');
  });
});
