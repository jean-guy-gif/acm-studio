import { beforeEach, describe, expect, it, vi } from 'vitest';

import { orderAgenciesForWatch } from '@/features/buyer-watch/services/watch-schedule';

// Mission 136 — avant la nuit : un passage resté « en cours » plus d'une heure est échoué, sa
// réservation rendue, l'acquéreur éligible de nouveau ; les agences passent la moins récemment
// servie d'abord (décisions de Jean-Guy, 06/11).
const state = vi.hoisted(() => ({
  stale: [] as { id: string; buyer_id: string; agency_id: string }[],
  reservations: [] as { id: string }[],
  updates: [] as { values: unknown; filters: [string, unknown][] }[],
  filters: [] as [string, unknown][],
  settled: [] as [string, number][],
}));

function admin() {
  return {
    from(table: string) {
      const filters: [string, unknown][] = [];
      let update: unknown = null;
      const chain: Record<string, unknown> = {};
      for (const method of ['select', 'eq', 'lt', 'in', 'order', 'range']) {
        chain[method] = (...args: unknown[]) => {
          if (method === 'eq' || method === 'lt') filters.push([String(args[0]), args[1]]);
          return chain;
        };
      }
      chain.update = (values: unknown) => {
        update = values;
        return chain;
      };
      chain.then = (resolve: (value: unknown) => unknown) => {
        if (update != null) {
          state.updates.push({ values: update, filters });
          return resolve({ data: null, error: null });
        }
        if (table === 'buyer_watch_runs') return resolve({ data: state.stale, error: null });
        state.filters = filters;
        return resolve({ data: state.reservations, error: null });
      };
      return chain;
    },
  };
}

vi.mock('@/features/search-budget/services/reserve-budget', () => ({
  settleSearchBudget: async (id: string, billed: number) => {
    state.settled.push([id, billed]);
  },
}));
vi.mock('@/lib/app-errors/report-server-error', () => ({ reportServerError: async () => {} }));

const { releaseStaleWatchRuns } = await import('@/features/buyer-watch/server/watch-housekeeping');

beforeEach(() => {
  state.stale = [];
  state.reservations = [];
  state.updates = [];
  state.filters = [];
  state.settled = [];
});

describe('un passage resté « en cours » plus d’une heure', () => {
  it('est marqué échoué, sa réservation rendue', async () => {
    state.stale = [{ id: 'run-1', buyer_id: 'keller', agency_id: 'agency-a' }];
    state.reservations = [{ id: 'res-1' }];
    expect(await releaseStaleWatchRuns(admin() as never, new Date())).toBe(1);
    expect(state.updates).toHaveLength(1);
    expect(state.updates[0]!.values).toEqual({ status: 'failed' });
    // Seulement s'il est encore « en cours » (un passage terminé entre-temps reste terminé).
    expect(state.updates[0]!.filters).toContainEqual(['status', 'running']);
    // La réservation de la veille de cet acquéreur, encore réservée.
    expect(state.filters).toEqual(
      expect.arrayContaining([
        ['buyer_id', 'keller'],
        ['buyer_watch', true],
        ['reserved', true],
      ]),
    );
    expect(state.settled).toEqual([['res-1', 0]]);
  });

  it('rien d’ancien : rien ne change', async () => {
    expect(await releaseStaleWatchRuns(admin() as never, new Date())).toBe(0);
    expect(state.updates).toEqual([]);
    expect(state.settled).toEqual([]);
  });
});

describe('l’ordre de la nuit', () => {
  it('jamais servie d’abord, puis la moins récemment servie', () => {
    const last = new Map([
      ['a', '2026-11-05T02:17:00Z'],
      ['b', '2026-10-30T02:17:00Z'],
    ]);
    expect(orderAgenciesForWatch(['a', 'b', 'c'], last)).toEqual(['c', 'b', 'a']);
    expect(orderAgenciesForWatch(['x', 'y'], new Map())).toEqual(['x', 'y']);
  });
});
