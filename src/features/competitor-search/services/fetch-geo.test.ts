import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/app-errors/report-server-error', () => ({
  reportServerError: async () => undefined,
}));

import {
  GEO_ATTEMPTS,
  GEO_TIMEOUT_MS,
  fetchCommunes,
  getJson,
} from '@/features/competitor-search/services/fetch-geo';

const ANTIBES = [{ nom: 'Antibes', code: '06004', codesPostaux: ['06160', '06600'] }];
const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

afterEach(() => vi.unstubAllGlobals());

// Mission 104 — depuis Vercel, geo.api.gouv.fr dépassait souvent 5 s : 8 s, et un second essai.
describe('le service des communes, attendu plus longtemps et réessayé', () => {
  it('attend 8 secondes, deux fois au plus', () => {
    expect(GEO_TIMEOUT_MS).toBe(8_000);
    expect(GEO_ATTEMPTS).toBe(2);
  });

  it('un premier essai qui expire ou échoue est rejoué', async () => {
    for (const failure of [
      () =>
        Promise.reject(
          new DOMException('The operation was aborted due to timeout', 'TimeoutError'),
        ),
      () => Promise.resolve(new Response('', { status: 503 })),
    ]) {
      const fetchMock = vi.fn().mockImplementationOnce(failure).mockResolvedValueOnce(ok(ANTIBES));
      vi.stubGlobal('fetch', fetchMock);
      expect(await getJson('https://geo.api.gouv.fr/communes?codePostal=06600')).toEqual(ANTIBES);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    }
  });

  it('une adresse refusée par le service (4xx) n’est pas redemandée', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 400 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(getJson('https://geo.api.gouv.fr/communes?codePostal=x')).rejects.toThrow('400');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('deux essais sans réponse : « indisponible » (null), jamais « aucune commune »', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('réseau'));
    vi.stubGlobal('fetch', fetchMock);
    expect(await fetchCommunes({ postalCode: '06600' })).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
