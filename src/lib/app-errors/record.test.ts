import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeSupabase, type FakeResponse } from '@/test-fixtures/fake-supabase';

// Mission 100 — le journal des erreurs : ce qui y entre est nettoyé, l'identité vient de la
// session, et un journal en panne n'ajoute jamais une erreur à l'erreur.

const state = vi.hoisted(() => ({
  profile: null as Record<string, unknown> | null,
  response: {} as FakeResponse,
  broken: false,
}));
const service = fakeSupabase(() => state.response);

vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: () => {
    if (state.broken) throw new Error('Missing Supabase service role configuration.');
    return service.client;
  },
}));
vi.mock('@/lib/auth/get-profile', () => ({ getProfile: async () => state.profile }));
vi.mock('next/headers', () => ({
  headers: async () =>
    new Map([
      ['referer', 'https://acm.test/builder/3f2b8c1e-1a2b-4c3d-9e8f-0123456789ab/property'],
    ]),
}));

const inserted = () => service.calls.find((call) => call.method === 'insert')?.args[0];

beforeEach(() => {
  service.reset();
  state.profile = { id: 'u-1', agency_id: 'a-1' };
  state.response = {};
  state.broken = false;
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  delete process.env.VERCEL_GIT_COMMIT_SHA;
});

describe('recordAppError', () => {
  it('écrit une ligne nettoyée : ni saisie, ni prix, ni identifiant de dossier', async () => {
    const { recordAppError } = await import('@/lib/app-errors/record');
    process.env.VERCEL_GIT_COMMIT_SHA = 'abc1234def5678';
    await recordAppError({
      source: 'server',
      page: '/builder/3f2b8c1e-1a2b-4c3d-9e8f-0123456789ab/property?ville=Antibes',
      error: new Error('invalid input syntax for type numeric: "350 000 €"'),
      scope: 'action',
      agencyId: 'a-1',
      userId: 'u-1',
    });
    expect(service.writes()).toEqual(['insert app_errors']);
    expect(inserted()).toEqual({
      source: 'server',
      page: '/builder/[id]/property',
      message: '[action] invalid input syntax for type numeric: [texte]',
      agency_id: 'a-1',
      user_id: 'u-1',
      version: 'abc1234def5678',
    });
  });

  it('ne lève jamais : base qui refuse, ou clé service absente', async () => {
    const { recordAppError } = await import('@/lib/app-errors/record');
    state.response = { error: { code: '23514' } };
    await expect(
      recordAppError({ source: 'live', page: '/live/x', error: 'boom' }),
    ).resolves.toBeUndefined();
    state.broken = true;
    await expect(
      recordAppError({ source: 'live', page: '/live/x', error: 'boom' }),
    ).resolves.toBeUndefined();
  });
});

describe('reportServerError', () => {
  it('prend l’identité dans la session et la page dans l’en-tête de la requête', async () => {
    const { reportServerError } = await import('@/lib/app-errors/report-server-error');
    await reportServerError('rememberPortalPlaces', { message: 'permission denied' });
    expect(inserted()).toMatchObject({
      source: 'server',
      page: '/builder/[id]/property',
      message: '[rememberPortalPlaces] permission denied',
      agency_id: 'a-1',
      user_id: 'u-1',
    });
  });
});

describe('reportClientError', () => {
  it('n’écrit que ce qui a la forme attendue, avec l’identité de la SESSION', async () => {
    const { reportClientError } = await import('@/lib/app-errors/report-client-error');
    await reportClientError({
      source: 'live',
      page: '/live/3f2b8c1e-1a2b-4c3d-9e8f-0123456789ab',
      message: 'TypeError: Failed to fetch',
      agency_id: 'une-autre-agence',
      user_id: 'quelqu-un-d-autre',
    });
    expect(inserted()).toEqual({
      source: 'live',
      page: '/live/[id]',
      message: 'TypeError: Failed to fetch',
      agency_id: 'a-1',
      user_id: 'u-1',
      version: null,
    });
  });

  it('ignore une charge mal formée, une origine inventée, un message démesuré', async () => {
    const { reportClientError } = await import('@/lib/app-errors/report-client-error');
    await reportClientError(null);
    await reportClientError({
      source: 'server',
      page: '/x',
      message: 'se fait passer pour le serveur',
    });
    await reportClientError({ source: 'browser', page: '/x', message: 'a'.repeat(5001) });
    await reportClientError({ source: 'browser', page: '/x' });
    expect(service.writes()).toEqual([]);
  });

  it('sans session, l’erreur est gardée, sans identité', async () => {
    const { reportClientError } = await import('@/lib/app-errors/report-client-error');
    state.profile = null;
    await reportClientError({ source: 'browser', page: '/login', message: 'ChunkLoadError' });
    expect(inserted()).toMatchObject({ agency_id: null, user_id: null, page: '/login' });
  });

  it('un navigateur en boucle ne remplit pas le journal : 30 signalements par minute au plus', async () => {
    vi.resetModules();
    const { reportClientError } = await import('@/lib/app-errors/report-client-error');
    for (let i = 0; i < 45; i += 1) {
      await reportClientError({ source: 'browser', page: '/x', message: 'boucle' });
    }
    expect(service.writes()).toHaveLength(30);
  });
});

describe('/api/version', () => {
  it('rend le commit déployé, et rien d’autre', async () => {
    const { GET } = await import('@/app/api/version/route');
    process.env.VERCEL_GIT_COMMIT_SHA = '7b7ec37a7ec1deedbe53931ee0ba3aea4c2bb7ae';
    const response = GET();
    expect(await response.json()).toEqual({ commit: '7b7ec37a7ec1deedbe53931ee0ba3aea4c2bb7ae' });
    expect(response.headers.get('cache-control')).toBe('no-store');
    delete process.env.VERCEL_GIT_COMMIT_SHA;
    expect(await GET().json()).toEqual({ commit: null });
  });
});
