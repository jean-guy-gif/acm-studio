import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  demoKellerWatchFinds,
  demoKellerWatchListings,
  demoSeedCompetitors,
} from '@/features/demo/services/demo-seed';
import { DEMO_SCENARIOS } from '@/features/demo/data/scenarios';

// Mission 136 — « Veille des acquéreurs : jusqu'à … € par mois » : le manager seul, jamais plus de
// la moitié du budget de l'agence, un refus n'écrit rien. Et la veille semée de la démo.
const profile = vi.hoisted(() => ({
  current: null as null | {
    id: string;
    agency_id: string;
    removed_at: string | null;
    role: string;
  },
}));
const writes = vi.hoisted(() => ({ list: [] as unknown[], agencyCap: null as number | null }));

vi.mock('@/lib/auth/get-profile', () => ({ getProfile: async () => profile.current }));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: () => ({
    from(table: string) {
      const chain: Record<string, unknown> = {};
      for (const method of ['select', 'eq']) chain[method] = () => chain;
      chain.maybeSingle = () =>
        Promise.resolve({
          data: writes.agencyCap != null ? { monthly_cap_cents: writes.agencyCap } : null,
          error: null,
        });
      chain.update = (values: unknown) => {
        writes.list.push([table, values]);
        return chain;
      };
      chain.then = (resolve: (value: unknown) => unknown) => resolve({ data: null, error: null });
      return chain;
    },
  }),
}));

const { setBuyerWatchCap } = await import('@/features/buyer-watch/actions/set-watch-cap');

beforeEach(() => {
  profile.current = { id: 'u1', agency_id: 'agency-a', removed_at: null, role: 'manager' };
  writes.list = [];
  writes.agencyCap = null;
});

describe('le plafond de la veille', () => {
  it('le manager le règle, jusqu’à la moitié du budget de l’agence (30 € par défaut)', async () => {
    expect(await setBuyerWatchCap('12')).toEqual({ ok: true, cents: 1200 });
    expect(writes.list).toEqual([['agencies', { buyer_watch_cap_cents: 1200 }]]);
  });

  it('au-delà de la moitié, un conseiller, un membre retiré : refusé, rien d’écrit', async () => {
    expect((await setBuyerWatchCap('16')).ok).toBe(false);
    writes.agencyCap = 10_000;
    expect((await setBuyerWatchCap('51')).ok).toBe(false);
    profile.current = { ...profile.current!, role: 'advisor' };
    expect((await setBuyerWatchCap('5')).ok).toBe(false);
    profile.current = { ...profile.current!, role: 'manager', removed_at: '2026-11-01T00:00:00Z' };
    expect((await setBuyerWatchCap('5')).ok).toBe(false);
    expect(writes.list).toEqual([]);
  });
});

describe('la veille de la démo', () => {
  it('deux maisons à piscine de leurs communes, sous leur plafond + 5 %, inconnues de l’agence', () => {
    const listings = demoKellerWatchListings();
    expect(listings).toHaveLength(2);
    const mougins = DEMO_SCENARIOS.find((scenario) => scenario.id === 'mougins')!;
    const competitors = new Set(demoSeedCompetitors(mougins).map((listing) => listing.id));
    for (const listing of listings) {
      expect(listing.hasPool).toBe(true);
      expect(listing.price).toBeLessThanOrEqual(1_732_500);
      expect(competitors.has(listing.id)).toBe(false);
      expect(['mou-01', 'mou-02', 'mou-03', 'mou-06', 'mou-07']).not.toContain(listing.id);
    }
    const finds = demoKellerWatchFinds(new Date());
    expect(finds).toHaveLength(2);
    for (const find of finds) {
      expect(find.url).toMatch(/^https:\/\/annonces\.demonstration\.invalid\//);
      expect(JSON.stringify(find)).not.toMatch(/"title"/);
    }
  });
});
