import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeSupabase, type FakeCall, type FakeResponse } from '@/test-fixtures/fake-supabase';

// Mission 131 — les gestes du lien de l'Étude de marché, appelés POUR DE VRAI avec un client
// factice (modèle de `sensitive-actions.test.ts`, M100) : un appel refusé n'écrit rien.

const state = vi.hoisted(() => ({
  profile: null as Record<string, unknown> | null,
  respond: (() => ({})) as (table: string, write: string) => FakeResponse,
}));

const tableOf = (calls: FakeCall[]): string => {
  const from = [...calls].reverse().find((call) => call.method === 'from');
  return from ? String(from.args[0]) : '';
};
const lastWrite = (calls: FakeCall[]): string => {
  const from = calls.map((call) => call.method).lastIndexOf('from');
  const chain = calls.slice(Math.max(from, 0)).map((call) => call.method);
  return ['insert', 'update', 'delete', 'select'].find((method) => chain.includes(method)) ?? '';
};

const server = fakeSupabase((calls) => state.respond(tableOf(calls), lastWrite(calls)));
const service = fakeSupabase((calls) => state.respond(tableOf(calls), lastWrite(calls)));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/auth/get-profile', () => ({ getProfile: async () => state.profile }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => server.client }));
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: () => service.client }));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));

const AGENCY = '11111111-1111-4111-8111-111111111111';
const PROJECT = '33333333-3333-4333-8333-333333333333';
const LINK = '55555555-5555-4555-8555-555555555555';
const advisor = { id: 'u-advisor', agency_id: AGENCY, role: 'advisor', removed_at: null };
const removed = { ...advisor, removed_at: '2026-10-01T00:00:00Z' };

const noWrite = () => expect([...server.writes(), ...service.writes()]).toEqual([]);

beforeEach(() => {
  server.reset();
  service.reset();
  state.profile = advisor;
  state.respond = () => ({});
});

describe('créer le lien de l’Étude de marché', () => {
  it('refusé sans session, à un membre retiré, sur un dossier hors de son agence ou archivé', async () => {
    const { createMarketStudyLink } =
      await import('@/features/market-study/actions/create-market-study-link');
    state.profile = null;
    expect((await createMarketStudyLink(PROJECT)).ok).toBe(false);
    state.profile = removed;
    expect((await createMarketStudyLink(PROJECT)).ok).toBe(false);
    state.profile = advisor;
    expect((await createMarketStudyLink('pas-un-uuid')).ok).toBe(false);
    noWrite();
    state.respond = () => ({ data: null });
    expect((await createMarketStudyLink(PROJECT)).ok).toBe(false);
    noWrite();
    const guard = server.calls.filter((call) => ['eq', 'neq'].includes(call.method));
    expect(guard.map((call) => [call.method, ...call.args])).toEqual([
      ['eq', 'id', PROJECT],
      ['eq', 'agency_id', AGENCY],
      ['neq', 'status', 'archived'],
    ]);
  });

  it('créé avec son seul condensat, et remplace les liens précédents du dossier', async () => {
    const { createMarketStudyLink } =
      await import('@/features/market-study/actions/create-market-study-link');
    state.respond = (table) =>
      table === 'projects'
        ? { data: { id: PROJECT } }
        : table === 'market_study_links'
          ? { data: { id: LINK, expires_at: '2026-12-05T10:00:00.000Z' } }
          : {};
    const result = await createMarketStudyLink(PROJECT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.url).toMatch(/\/etude-de-marche\/[A-Za-z0-9_-]{43}$/);
    expect(service.writes()).toEqual(['insert market_study_links', 'delete market_study_links']);
    const inserted = service.calls.find((call) => call.method === 'insert')?.args[0] as Record<
      string,
      string
    >;
    expect(inserted).toMatchObject({
      agency_id: AGENCY,
      project_id: PROJECT,
      created_by: advisor.id,
    });
    expect(inserted.token_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.url).not.toContain(inserted.token_hash);
    const afterDelete = service.calls.slice(
      service.calls.findIndex((call) => call.method === 'delete'),
    );
    expect(afterDelete.filter((call) => call.method === 'eq').map((call) => call.args)).toEqual([
      ['project_id', PROJECT],
      ['agency_id', AGENCY],
    ]);
    expect(afterDelete.find((call) => call.method === 'neq')?.args).toEqual(['id', LINK]);
  });

  it('si les anciens ne se retirent pas, le nouveau est retiré et rien ne change', async () => {
    const { createMarketStudyLink } =
      await import('@/features/market-study/actions/create-market-study-link');
    state.respond = (table, write) =>
      table === 'projects'
        ? { data: { id: PROJECT } }
        : write === 'insert'
          ? { data: { id: LINK, expires_at: '2026-12-05T10:00:00.000Z' } }
          : write === 'delete' && service.writes().length === 2
            ? { error: { message: 'refusé' } }
            : {};
    expect((await createMarketStudyLink(PROJECT)).ok).toBe(false);
    expect(service.writes()).toEqual([
      'insert market_study_links',
      'delete market_study_links',
      'delete market_study_links',
    ]);
    const last = service.calls.slice(
      service.calls.map((call) => call.method).lastIndexOf('delete'),
    );
    expect(last.find((call) => call.method === 'eq')?.args).toEqual(['id', LINK]);
  });
});

describe('retirer le lien de l’Étude de marché', () => {
  it('cadré sur le dossier et l’agence de la session ; refusé à un membre retiré', async () => {
    const { removeMarketStudyLink } =
      await import('@/features/market-study/actions/remove-market-study-link');
    state.profile = removed;
    expect((await removeMarketStudyLink(PROJECT, LINK)).ok).toBe(false);
    noWrite();
    state.profile = advisor;
    state.respond = () => ({ data: [] });
    expect((await removeMarketStudyLink(PROJECT, LINK)).ok).toBe(false);
    service.reset();
    state.respond = (table) => (table === 'market_study_links' ? { data: [{ id: LINK }] } : {});
    expect(await removeMarketStudyLink(PROJECT, LINK)).toEqual({ ok: true });
    expect(service.calls.filter((call) => call.method === 'eq').map((call) => call.args)).toEqual([
      ['id', LINK],
      ['project_id', PROJECT],
      ['agency_id', AGENCY],
    ]);
  });
});

describe('le lien public relu', () => {
  it('un jeton mal formé ne touche pas la base', async () => {
    const { findMarketStudyLink } =
      await import('@/features/market-study/queries/find-market-study-link');
    const admin = service.client as Parameters<typeof findMarketStudyLink>[0];
    expect(await findMarketStudyLink(admin, 'court')).toBeNull();
    expect(await findMarketStudyLink(admin, `${'A'.repeat(42)}!`)).toBeNull();
    expect(service.calls).toEqual([]);
  });

  it('cherché par son condensat et ses 30 jours ; expiré ou inconnu : rien', async () => {
    const { findMarketStudyLink } =
      await import('@/features/market-study/queries/find-market-study-link');
    const { hashMarketStudyToken, newMarketStudyToken } =
      await import('@/features/market-study/services/market-study-link');
    const admin = service.client as Parameters<typeof findMarketStudyLink>[0];
    const token = newMarketStudyToken();
    const now = new Date('2026-11-05T10:00:00.000Z');
    state.respond = () => ({ data: null });
    expect(await findMarketStudyLink(admin, token, now)).toBeNull();
    expect(service.calls.find((call) => call.method === 'eq')?.args).toEqual([
      'token_hash',
      hashMarketStudyToken(token),
    ]);
    expect(service.calls.find((call) => call.method === 'gt')?.args).toEqual([
      'expires_at',
      now.toISOString(),
    ]);
    state.respond = () => ({ data: { project_id: PROJECT, agency_id: AGENCY } });
    expect(await findMarketStudyLink(admin, token, now)).toEqual({
      projectId: PROJECT,
      agencyId: AGENCY,
    });
  });
});
