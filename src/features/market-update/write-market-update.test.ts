import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/app-errors/report-server-error', () => ({
  reportServerError: async () => undefined,
}));

import { writeMarketUpdate } from '@/features/market-update/services/write-market-update';
import { fakeSupabase, type FakeCall, type FakeResponse } from '@/test-fixtures/fake-supabase';

// Mission 127 B — le point du jour réécrit garde les propositions payées encore à trancher, et
// retire celles que le dossier connaît (concurrent, écartée, import en attente) et celle réglée.

const AGENCY = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PROJECT = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const UPDATE = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const A = 'https://www.seloger.com/annonces/achat/maison/mougins-06/A.htm';
const B = 'https://www.seloger.com/annonces/achat/maison/mougins-06/B.htm';
const C = 'https://www.seloger.com/annonces/achat/maison/mougins-06/C.htm';
const D = 'https://www.seloger.com/annonces/achat/maison/mougins-06/D.htm';

const proposal = (url: string) => ({
  url,
  label: 'Maison · 6 pièces · 190 m² · Mougins',
  price: 1495000,
  pricePerSqm: null,
  surfaceArea: 190,
  roomsCount: 6,
  propertyType: 'house',
  city: 'Mougins',
  photoUrls: [],
  seenSince: '2026-10-15T00:00:00.000Z',
  energyClass: null,
  snapshot: null,
});

type Client = Parameters<typeof writeMarketUpdate>[0]['supabase'];
const tableOf = (calls: FakeCall[]): string => {
  const from = [...calls].reverse().find((call) => call.method === 'from');
  return from ? String(from.args[0]) : '';
};
const lastWrite = (calls: FakeCall[]): string => {
  const from = calls.map((call) => call.method).lastIndexOf('from');
  const chain = calls.slice(Math.max(from, 0)).map((call) => call.method);
  return ['insert', 'update', 'delete', 'select'].find((m) => chain.includes(m)) ?? '';
};

describe('writeMarketUpdate — les propositions gardées sur le point', () => {
  const state = { respond: (() => ({})) as (table: string, write: string) => FakeResponse };
  const server = fakeSupabase((calls) => state.respond(tableOf(calls), lastWrite(calls)));
  const service = fakeSupabase((calls) => state.respond(tableOf(calls), lastWrite(calls)));
  beforeEach(() => {
    server.reset();
    service.reset();
  });

  it('garde la proposition à trancher, retire celle du dossier, l’écartée et la réglée', async () => {
    const previous = {
      version: 1,
      newcomersSearch: {
        madeAt: new Date().toISOString(),
        found: 4,
        billed: 20,
        limitedToPrice: true,
        excludedNoDate: 0,
        proposed: [proposal(A), proposal(B), proposal(C), proposal(D)],
      },
      meetingDate: null,
      agreedPrice: 1639500,
      advisorAnalysis: null,
      competitors: [],
      counts: {
        read: 0,
        dropped: 0,
        raised: 0,
        probableSale: 0,
        withdrawn: 0,
        unread: 0,
        unreadable: 0,
        goneUnknown: 0,
        newcomers: 0,
      },
      lines: {
        meeting: null,
        today: null,
        todayGone: { probableSale: 0, withdrawn: 0, unknown: 0 },
        newcomers: null,
        newcomersCount: 0,
        scale: null,
      },
    };
    state.respond = (table, write) => {
      if (table === 'comparables' && write === 'select')
        return { data: [{ listing_url: `${A}?utm=x` }] };
      if (table === 'competitor_decisions') return { data: [{ listing_url: B }] };
      if (table === 'pending_competitor_imports') return { data: [] };
      if (table === 'project_market_updates' && write === 'select')
        return { data: { id: UPDATE, made_at: new Date().toISOString(), summary: previous } };
      if (table === 'project_market_updates' && write === 'update')
        return { data: { id: UPDATE, made_at: new Date().toISOString() } };
      return { data: null };
    };
    const written = await writeMarketUpdate({
      supabase: server.client as Client,
      service: service.client as Client,
      agencyId: AGENCY,
      projectId: PROJECT,
      profileId: 'u-advisor',
      settledProposalUrl: C,
    });
    expect(written?.updateId).toBe(UPDATE);
    expect(written?.summary.newcomersSearch?.proposed.map((item) => item.url)).toEqual([D]);
    // Le point du jour est réécrit (jamais un second point), par la clé service.
    expect(service.writes()).toEqual(['update project_market_updates']);
    expect(server.writes()).toEqual([]);
  });

  it('sans recherche gardée, aucune lecture des annonces connues ; un point d’un autre jour fait un point neuf', async () => {
    state.respond = (table, write) => {
      if (table === 'project_market_updates' && write === 'select')
        return {
          data: { id: UPDATE, made_at: '2026-10-01T10:00:00.000Z', summary: { version: 1 } },
        };
      if (table === 'project_market_updates' && write === 'insert')
        return {
          data: { id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', made_at: new Date().toISOString() },
        };
      return { data: null };
    };
    const written = await writeMarketUpdate({
      supabase: server.client as Client,
      service: service.client as Client,
      agencyId: AGENCY,
      projectId: PROJECT,
      profileId: 'u-advisor',
    });
    expect(written?.summary.newcomersSearch).toBeNull();
    expect(service.writes()).toEqual(['insert project_market_updates']);
    expect(
      server.calls.some(
        (call) => call.method === 'from' && call.args[0] === 'competitor_decisions',
      ),
    ).toBe(false);
  });
});
