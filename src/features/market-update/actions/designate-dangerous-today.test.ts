import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeSupabase, type FakeCall } from '@/test-fixtures/fake-supabase';

// Mission 129 — « Désigner le plus dangereux aujourd'hui » : relu au serveur, gardé dans le
// `summary` du dernier point, jamais dans `live_seller_summary`.
const PROJECT = '11111111-1111-4111-8111-111111111111';
const UPDATE = '22222222-2222-4222-8222-222222222222';
const LISTED = '33333333-3333-4333-8333-333333333333';
const GONE = '44444444-4444-4444-8444-444444444444';

const competitor = (id: string, patch: Record<string, unknown> = {}) => ({
  id,
  position: 1,
  label: 'Maison · 5 pièces · 165 m² · Mougins',
  surfaceArea: 165,
  dangerous: false,
  meetingPrice: 800_000,
  meetingPriceSource: 'revealed',
  currentPrice: 800_000,
  gapAmount: 0,
  gapPercent: 0,
  state: 'unchanged',
  daysOnMarket: 11,
  daysApproximate: false,
  goneAt: null,
  conclusion: null,
  ...patch,
});
const summary = {
  version: 1,
  meetingDate: '2026-10-21T13:31:00.000Z',
  agreedPrice: 830_000,
  advisorAnalysis: null,
  competitors: [competitor(LISTED), competitor(GONE, { state: 'gone', dangerous: true })],
  counts: {
    read: 1,
    dropped: 0,
    raised: 0,
    probableSale: 0,
    withdrawn: 0,
    unread: 0,
    unreadable: 0,
    newcomers: 0,
  },
  lines: {
    meeting: null,
    today: null,
    todayGone: { probableSale: 0, withdrawn: 0 },
    newcomers: null,
    newcomersCount: 0,
    scale: null,
  },
};

const state = vi.hoisted(() => ({
  profile: null as null | Record<string, unknown>,
  outcome: 'signed' as string | null,
  madeAt: new Date().toISOString(),
}));
const tableOf = (calls: FakeCall[]) =>
  String([...calls].reverse().find((call) => call.method === 'from')?.args[0] ?? '');
const user = fakeSupabase((calls) => {
  const table = tableOf(calls);
  if (table === 'projects') return { data: { id: PROJECT, status: 'meeting_completed' } };
  if (table === 'project_meeting_conclusions') return { data: { outcome: state.outcome } };
  if (table === 'project_market_updates')
    return { data: { id: UPDATE, made_at: state.madeAt, summary } };
  return { data: null };
});
const service = fakeSupabase(() => ({ data: [{ id: UPDATE }] }));
vi.mock('@/lib/auth/get-profile', () => ({ getProfile: async () => state.profile }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => user.client }));
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: () => service.client }));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));

const { designateDangerousToday } =
  await import('@/features/market-update/actions/designate-dangerous-today');

const written = () =>
  service.calls.find((call) => call.method === 'update')?.args[0] as {
    summary: Record<string, unknown>;
  };

beforeEach(() => {
  user.reset();
  service.reset();
  state.profile = { id: 'advisor-1', agency_id: 'agency-a', removed_at: null };
  state.outcome = 'signed';
  state.madeAt = new Date().toISOString();
});

describe('désigner le plus dangereux aujourd’hui', () => {
  it('sans session, membre retiré, identifiant douteux ou mandat non signé : rien n’est écrit', async () => {
    state.profile = null;
    expect((await designateDangerousToday(PROJECT, LISTED)).ok).toBe(false);
    state.profile = { id: 'advisor-1', agency_id: 'agency-a', removed_at: '2026-10-01' };
    expect((await designateDangerousToday(PROJECT, LISTED)).ok).toBe(false);
    state.profile = { id: 'advisor-1', agency_id: 'agency-a', removed_at: null };
    expect((await designateDangerousToday(PROJECT, 'pas-un-id')).ok).toBe(false);
    state.outcome = 'follow_up';
    expect((await designateDangerousToday(PROJECT, LISTED)).ok).toBe(false);
    expect(service.writes()).toEqual([]);
  });

  it('un bien qui n’est plus en vente, ou absent du point : refusé', async () => {
    expect(await designateDangerousToday(PROJECT, GONE)).toEqual({
      ok: false,
      error: 'Ce bien n’est plus en vente\u00a0: choisissez-en un autre.',
    });
    expect(
      (await designateDangerousToday(PROJECT, '55555555-5555-4555-8555-555555555555')).ok,
    ).toBe(false);
    expect(service.writes()).toEqual([]);
  });

  it('un bien encore en vente : gardé dans le dernier point, dans l’agence, par la clé service', async () => {
    expect(await designateDangerousToday(PROJECT, LISTED)).toEqual({ ok: true });
    expect(service.writes()).toEqual(['update project_market_updates']);
    expect(written().summary.dangerousToday).toMatchObject({ competitorId: LISTED });
    const filters = service.calls.filter((call) => call.method === 'eq').map((call) => call.args);
    expect(filters).toEqual([
      ['id', UPDATE],
      ['project_id', PROJECT],
      ['agency_id', 'agency-a'],
    ]);
    expect(user.writes()).toEqual([]);
  });

  it('un point d’un autre jour ne change plus : il se rouvre tel qu’il a été remis (M127)', async () => {
    state.madeAt = new Date(Date.now() - 3 * 86_400_000).toISOString();
    expect(await designateDangerousToday(PROJECT, LISTED)).toEqual({
      ok: false,
      error: 'Mettez d’abord les concurrents à jour\u00a0: un point déjà remis ne change plus.',
    });
    expect(service.writes()).toEqual([]);
  });

  it('un bien en vente avant le rendez-vous, absent du classement : refusé', async () => {
    const before = '66666666-6666-4666-8666-666666666666';
    summary.competitors.push(
      competitor(before, { newcomer: true, seenSince: '2025-06-17', meetingPrice: null }),
    );
    try {
      expect((await designateDangerousToday(PROJECT, before)).ok).toBe(false);
      expect(service.writes()).toEqual([]);
    } finally {
      summary.competitors.pop();
    }
  });

  it('null revient au choix du rendez-vous', async () => {
    expect(await designateDangerousToday(PROJECT, null)).toEqual({ ok: true });
    expect(written().summary.dangerousToday).toBeNull();
  });
});
