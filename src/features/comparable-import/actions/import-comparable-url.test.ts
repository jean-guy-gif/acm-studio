import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeSupabase } from '@/test-fixtures/fake-supabase';

// Lancement, mission 11 (suite, 25/11) — l'import par le serveur : Belles Demeures refusée avant
// toute lecture (son robots.txt interdit ses pages d'annonce à tout robot, relu le 25/11) ; un échec
// de lecture garde sa raison, pour que l'écran ne dise pas « supprimée » quand c'est l'extension
// qui n'a pas lu.

const state = vi.hoisted(() => ({
  fetched: [] as string[],
  page: { ok: false, error: 'non', reason: 'unavailable' } as Record<string, unknown>,
}));
const db = fakeSupabase(() => ({ data: { id: 'p1' } }));

vi.mock('@/lib/auth/get-profile', () => ({
  getProfile: async () => ({ id: 'u1', agency_id: 'a1', removed_at: null }),
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => db.client }));
vi.mock('@/features/comparable-import/services/fetch-listing-page', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchListingPage: async (url: string) => {
    state.fetched.push(url);
    return state.page;
  },
}));

const { importComparableUrl } =
  await import('@/features/comparable-import/actions/import-comparable-url');
const { FETCH_MESSAGES } = await import('@/features/comparable-import/services/fetch-listing-page');

const form = (url: string) => {
  const data = new FormData();
  data.set('url', url);
  return data;
};

beforeEach(() => {
  state.fetched = [];
  db.reset();
});

describe('l’import d’une annonce par le serveur', () => {
  it('Belles Demeures : refusée sans rien lire', async () => {
    const result = await importComparableUrl(
      'p1',
      form('https://www.bellesdemeures.com/277322163/detail.htm?serp_view=list#ln=x'),
    );
    expect(result).toEqual({
      ok: false,
      error:
        'Belles Demeures interdit la lecture automatique de ses annonces\u00a0: ACM ne peut pas la reprendre. Saisissez le bien à la main ci-dessous.',
    });
    expect(state.fetched).toEqual([]);
  });

  it('une lecture en échec garde sa raison', async () => {
    state.page = { ok: false, error: FETCH_MESSAGES.unavailable, reason: 'unavailable' };
    const result = await importComparableUrl(
      'p1',
      form('https://www.seloger.com/annonce/achat/x/cannes-06400/264A7CPMX7U5'),
    );
    expect(result).toEqual({
      ok: false,
      error: FETCH_MESSAGES.unavailable,
      reason: 'unavailable',
    });
  });

  it('une page lue sans rien d’exploitable le dit, avec sa raison', async () => {
    state.page = { ok: true, html: '<html><body>Un instant…</body></html>', finalUrl: '' };
    const result = await importComparableUrl(
      'p1',
      form('https://www.seloger.com/annonce/achat/x/cannes-06400/264A7CPMX7U5'),
    );
    expect(result).toEqual({
      ok: false,
      error: 'Aucune information exploitable n’a été détectée.',
      reason: 'empty',
    });
  });
});
