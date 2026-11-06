import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NO_PROGRESS } from '@/features/buyers/services/buyer-progress';

// Mission 136 — la veille de la nuit, avec une base factice : un acquéreur prêt est cherché, le
// budget réglé, ses nouveaux biens gardés ; plafond atteint → aucun appel ; un passage déjà fait
// cette semaine → rien ; un acquéreur qui n'est pas prêt n'est jamais cherché.
const state = vi.hoisted(() => ({
  reservation: [] as unknown[],
  runs: [] as unknown[],
  updates: [] as unknown[],
  rpcCalls: 0,
  settled: [] as [string, number][],
  fetched: 0,
  financing: 'validated',
  recentRun: null as null | { id: string },
}));

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

const buyerRow = () => ({
  id: '33333333-3333-4333-8333-333333333333',
  agency_id: 'agency-a',
  advisor_id: 'u1',
  created_at: daysAgo(40),
  updated_at: daysAgo(40),
  archived_at: null,
  name: 'Famille Keller',
  phone: null,
  email: null,
  purpose: null,
  timeline: null,
  notes: null,
  property_types: ['house'],
  cities: ['Mougins'],
  budget_ideal: null,
  budget_max: 1_650_000,
  rooms_min: 6,
  bedrooms_min: null,
  surface_min: null,
  outdoor: null,
  parking: null,
  pool: true,
  floor_min: null,
  elevator: null,
  energy_rating_max: null,
  works_accepted: null,
  must_have: ['pool', 'cities'],
  deal_breakers: null,
  status: 'searching',
  status_changed_at: daysAgo(40),
  demo: false,
  ignored_suggestions: [],
  financing: state.financing,
  financing_changed_at: daysAgo(5),
  contacted_at: daysAgo(5),
});

function admin() {
  return {
    from(table: string) {
      const chain: Record<string, unknown> = {};
      for (const method of ['select', 'eq', 'is', 'in', 'gt', 'order', 'limit', 'range']) {
        chain[method] = () => chain;
      }
      chain.update = (values: unknown) => {
        state.updates.push(values);
        return chain;
      };
      chain.maybeSingle = () => Promise.resolve({ data: state.recentRun, error: null });
      chain.then = (resolve: (value: unknown) => unknown) =>
        resolve(
          table === 'buyers'
            ? { data: [buyerRow()], error: null }
            : table === 'buyer_watch_runs'
              ? { data: state.runs, error: null }
              : { data: null, error: null },
        );
      return chain;
    },
    rpc() {
      state.rpcCalls += 1;
      return Promise.resolve({ data: state.reservation, error: null });
    },
  };
}

vi.mock('@/features/buyers/queries/get-buyers-progress', () => ({
  getBuyersProgress: async (_client: unknown, _agency: string, ids: string[]) =>
    new Map(ids.map((id) => [id, { ...NO_PROGRESS }])),
}));
vi.mock('@/features/buyer-watch/queries/known-keys', () => ({
  readBuyerKnownKeys: async () => ({ ok: true, keys: () => new Set<string>() }),
}));
vi.mock('@/features/search-budget/services/reserve-budget', () => ({
  settleSearchBudget: async (id: string, billed: number) => {
    state.settled.push([id, billed]);
  },
}));
vi.mock('@/lib/app-errors/report-server-error', () => ({ reportServerError: async () => {} }));
vi.mock('@/features/ideal-properties/services/ideal-market-search', () => ({
  resolveIdealPlans: async () => ({
    ok: true,
    resolved: { plans: [], codes: ['06085'], names: [] },
  }),
  runIdealMarketSearch: async (
    _deduced: unknown,
    _resolved: unknown,
    options: { fetchPage: (params: URLSearchParams) => Promise<unknown>; newestFirst?: boolean },
  ) => {
    expect(options.newestFirst).toBe(true);
    await options.fetchPage(new URLSearchParams());
    return {
      ok: true,
      candidates: [
        {
          key: '100000001',
          url: 'https://www.seloger.com/annonces/achat/maison/mougins-06/100000001.htm',
          title: 'Titre',
          price: 1_600_000,
          surfaceArea: 210,
          roomsCount: 7,
          propertyType: 'house',
          pricePerSqm: null,
          landArea: null,
          city: 'Mougins',
          photoUrls: [],
          isNewBuild: false,
          streamEstate: {
            propertyId: 'se-1',
            originSite: 'SeLoger',
            onlineSince: daysAgo(1),
            firstKnownAt: daysAgo(1),
            lastSeenAt: daysAgo(0),
            priceDrops: [],
          },
        },
      ],
    };
  },
}));

const { runAgencyWatch } = await import('@/features/buyer-watch/server/run-buyer-watch');

const fetchPageFor = (onBilled: (count: number) => void) => async () => {
  state.fetched += 1;
  onBilled(20);
  return { ok: true as const, json: {} };
};
const run = () =>
  runAgencyWatch(admin() as never, 'agency-a', new Date(), Date.now() + 60_000, fetchPageFor);

beforeEach(() => {
  state.reservation = [{ run_id: 'run-1', reservation_id: 'res-1', adverts: 20 }];
  state.runs = [];
  state.updates = [];
  state.rpcCalls = 0;
  state.settled = [];
  state.fetched = 0;
  state.financing = 'validated';
  state.recentRun = null;
});

describe('la veille de la nuit', () => {
  it('un acquéreur prêt : réservé, cherché, réglé, ses nouveaux biens gardés', async () => {
    const report = await run();
    expect(report).toMatchObject({ watched: 1, found: 1, billed: 20, stopped: 'done' });
    expect(state.fetched).toBe(1);
    expect(state.settled).toEqual([['res-1', 20]]);
    const update = state.updates[0] as { status: string; found_count: number; finds: unknown[] };
    expect(update).toMatchObject({ status: 'done', found_count: 1, adverts: 20 });
    expect(JSON.stringify(update.finds)).not.toMatch(/Titre/);
  });

  it('plafond de la veille ou de l’agence atteint : aucun appel, la nuit s’arrête', async () => {
    state.reservation = [];
    const report = await run();
    expect(report.stopped).toBe('budget');
    expect(state.fetched).toBe(0);
    expect(state.updates).toEqual([]);
  });

  it('un passage déjà fait cette semaine (double déclenchement) : rien, sans appel', async () => {
    state.reservation = [];
    state.recentRun = { id: 'run-0' };
    const report = await run();
    expect(report).toMatchObject({ watched: 0, stopped: 'done' });
    expect(state.fetched).toBe(0);
  });

  it('cherché il y a 6 jours : pas dû, la base n’est même pas sollicitée', async () => {
    state.runs = [{ buyer_id: buyerRow().id, ran_at: daysAgo(6), status: 'done' }];
    await run();
    expect(state.rpcCalls).toBe(0);
    expect(state.fetched).toBe(0);
  });

  it('pas prêt à visiter (financement en cours) : jamais cherché', async () => {
    state.financing = 'in_progress';
    await run();
    expect(state.rpcCalls).toBe(0);
    expect(state.fetched).toBe(0);
  });

  it('passé l’heure limite : plus aucun acquéreur lancé', async () => {
    const report = await runAgencyWatch(
      admin() as never,
      'agency-a',
      new Date(),
      Date.now() - 1,
      fetchPageFor,
    );
    expect(report.stopped).toBe('deadline');
    expect(state.rpcCalls).toBe(0);
  });
});
