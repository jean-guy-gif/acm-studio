import { describe, expect, it, vi } from 'vitest';

import { MAX_PHOTO_BYTES } from '@/features/subject-property-photos/constants';
import { fetchListingImage } from '@/features/subject-property-import/services/fetch-listing-image';

// A publicly-routable address, so the DNS-rebind guard lets the fetch proceed.
const PUBLIC_IP = '93.184.216.34';
const resolvePublic = async () => [PUBLIC_IP];

function imageResponse(bytes: Uint8Array, headers: Record<string, string> = {}): Response {
  // Uint8Array is a valid BufferSource body at runtime; the DOM lib's BodyInit
  // type just doesn't list it, so cast for the compiler.
  return new Response(bytes as unknown as BodyInit, { status: 200, headers });
}

describe('fetchListingImage', () => {
  it('rejects a non-http(s) protocol without fetching', async () => {
    const fetchImpl = vi.fn();
    const result = await fetchListingImage('file:///etc/passwd', {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      resolveHost: resolvePublic,
    });
    expect(result.ok).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects a URL carrying embedded credentials (SSRF guard)', async () => {
    const fetchImpl = vi.fn();
    const result = await fetchListingImage('https://user:pass@example.com/a.jpg', {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      resolveHost: resolvePublic,
    });
    expect(result.ok).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects a host that resolves to a blocked (private) IP', async () => {
    const fetchImpl = vi.fn();
    const result = await fetchListingImage('https://intranet.example.com/a.jpg', {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      resolveHost: async () => ['127.0.0.1'],
    });
    expect(result.ok).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects an over-limit image declared via content-length', async () => {
    const fetchImpl = vi.fn(async () =>
      imageResponse(new Uint8Array([0xff, 0xd8, 0xff]), {
        'content-length': String(MAX_PHOTO_BYTES + 1),
      }),
    );
    const result = await fetchListingImage('https://example.com/big.jpg', {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      resolveHost: resolvePublic,
    });
    expect(result.ok).toBe(false);
  });

  it('rejects an over-limit image whose body exceeds the cap despite no content-length', async () => {
    const fetchImpl = vi.fn(async () => imageResponse(new Uint8Array(MAX_PHOTO_BYTES + 1)));
    const result = await fetchListingImage('https://example.com/big.jpg', {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      resolveHost: resolvePublic,
    });
    expect(result.ok).toBe(false);
  });

  it('rejects an empty body', async () => {
    const fetchImpl = vi.fn(async () => imageResponse(new Uint8Array()));
    const result = await fetchListingImage('https://example.com/empty.jpg', {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      resolveHost: resolvePublic,
    });
    expect(result.ok).toBe(false);
  });

  it('returns the raw bytes on a successful download (validation is the caller’s job)', async () => {
    const body = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const fetchImpl = vi.fn(async () => imageResponse(body));
    const result = await fetchListingImage('https://example.com/photo.jpg', {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      resolveHost: resolvePublic,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Array.from(result.bytes)).toEqual(Array.from(body));
    }
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it('re-validates a redirect target and rejects a hop to a blocked IP (SSRF via redirect)', async () => {
    // Host resolves public on the first hop, private on the redirect target — the
    // classic redirect-bypass. The manual-redirect guard must block the 2nd hop.
    const resolveHost = vi.fn(async (hostname: string) =>
      hostname === 'metadata.internal' ? ['169.254.169.254'] : [PUBLIC_IP],
    );
    const fetchImpl = vi.fn(
      async () =>
        new Response(null, { status: 302, headers: { location: 'http://metadata.internal/' } }),
    );
    const result = await fetchListingImage('https://example.com/photo.jpg', {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      resolveHost,
    });
    expect(result.ok).toBe(false);
    // The blocked target must never be fetched: only the first hop connects.
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it('follows a safe redirect to a public host', async () => {
    const body = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, { status: 301, headers: { location: 'https://cdn.example.com/p.jpg' } }),
      )
      .mockResolvedValueOnce(imageResponse(body));
    const result = await fetchListingImage('https://example.com/photo.jpg', {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      resolveHost: resolvePublic,
    });
    expect(result.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('stops after too many redirects', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(null, { status: 302, headers: { location: 'https://example.com/loop' } }),
    );
    const result = await fetchListingImage('https://example.com/start', {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      resolveHost: resolvePublic,
    });
    expect(result.ok).toBe(false);
  });

  it('surfaces a non-2xx download as a failure', async () => {
    const fetchImpl = vi.fn(async () => new Response('nope', { status: 404 }));
    const result = await fetchListingImage('https://example.com/missing.jpg', {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      resolveHost: resolvePublic,
    });
    expect(result.ok).toBe(false);
  });
});
