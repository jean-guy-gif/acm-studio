import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RelaunchFacts } from '@/features/buyers/services/link-relaunch';
import {
  demoKellerRefusalsPlan,
  demoLambertSelectionPlan,
} from '@/features/demo/services/demo-seed';

// Mission 135 — « J'ai relancé » et le partage noté : relus au serveur ; un appel refusé n'écrit
// rien ; un second partage de la même sélection ne change rien (la première date est gardée).
const profile = vi.hoisted(() => ({
  current: null as null | {
    id: string;
    agency_id: string;
    removed_at: string | null;
    first_name: string;
  },
}));
const relaunch = vi.hoisted(() => ({ facts: null as RelaunchFacts | null, failed: false }));
const writes = vi.hoisted(() => ({
  list: [] as string[],
  insertError: null as unknown,
  linkValid: true,
}));

const buyerRow = {
  id: '22222222-2222-4222-8222-222222222222',
  agency_id: 'agency-a',
  advisor_id: 'u1',
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
  archived_at: null,
  name: 'M. et Mme Lambert',
  phone: null,
  email: null,
  purpose: null,
  timeline: null,
  notes: null,
  property_types: ['house'],
  cities: ['Vence'],
  budget_ideal: null,
  budget_max: 790000,
  rooms_min: 4,
  bedrooms_min: null,
  surface_min: null,
  outdoor: null,
  parking: null,
  pool: true,
  floor_min: null,
  elevator: null,
  energy_rating_max: null,
  works_accepted: null,
  must_have: ['cities', 'pool'],
  deal_breakers: null,
  status: 'searching',
  status_changed_at: '2026-10-01T00:00:00Z',
  demo: false,
  ignored_suggestions: [],
  financing: 'validated',
  financing_changed_at: null,
  contacted_at: null,
};

// Un client qui répond table par table et note ses écritures.
function client() {
  return {
    from(table: string) {
      const chain: Record<string, unknown> = {};
      for (const method of ['select', 'eq', 'is', 'in', 'gt', 'order', 'limit', 'maybeSingle']) {
        chain[method] = () => chain;
      }
      for (const method of ['insert', 'update']) {
        chain[method] = () => {
          writes.list.push(`${method} ${table}`);
          return chain;
        };
      }
      chain.then = (resolve: (value: unknown) => unknown) =>
        resolve(
          table === 'buyers'
            ? { data: buyerRow, error: null }
            : table === 'buyer_selections'
              ? { data: { id: 's1' }, error: null }
              : table === 'buyer_dossier_links'
                ? { data: writes.linkValid ? { id: 'l1' } : null, error: null }
                : { data: null, error: writes.insertError },
        );
      return chain;
    },
  };
}

vi.mock('@/lib/auth/get-profile', () => ({ getProfile: async () => profile.current }));
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: () => client() }));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('@/features/buyers/queries/get-relaunch-facts', () => ({
  getRelaunchFacts: async () => ({
    facts: new Map(relaunch.facts ? [[relaunch.facts.buyerId, relaunch.facts]] : []),
    failed: relaunch.failed,
  }),
}));

const { recordBuyerRelaunch, recordLinkShared } =
  await import('@/features/buyers/actions/relaunch');
const BUYER = buyerRow.id;
const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

beforeEach(() => {
  profile.current = { id: 'u1', agency_id: 'agency-a', removed_at: null, first_name: 'Carl' };
  relaunch.facts = {
    buyerId: BUYER,
    status: 'searching',
    selectionId: 's1',
    sentAt: daysAgo(3),
    answered: false,
    relaunches: [],
    linkActive: true,
  };
  relaunch.failed = false;
  writes.list = [];
  writes.insertError = null;
  writes.linkValid = true;
});

describe('« J’ai relancé »', () => {
  it('note la relance et un échange', async () => {
    expect(await recordBuyerRelaunch(BUYER)).toEqual({ ok: true });
    expect(writes.list).toEqual(['insert buyer_events', 'update buyers']);
  });

  it('rien de dû, déjà répondu, lecture en échec, membre retiré : rien n’est écrit', async () => {
    relaunch.facts = { ...relaunch.facts!, sentAt: daysAgo(1) };
    expect((await recordBuyerRelaunch(BUYER)).ok).toBe(false);
    relaunch.facts = { ...relaunch.facts!, sentAt: daysAgo(3), answered: true };
    expect((await recordBuyerRelaunch(BUYER)).ok).toBe(false);
    relaunch.facts = { ...relaunch.facts!, answered: false };
    relaunch.failed = true;
    expect((await recordBuyerRelaunch(BUYER)).ok).toBe(false);
    relaunch.failed = false;
    profile.current = { ...profile.current!, removed_at: daysAgo(1) };
    expect((await recordBuyerRelaunch(BUYER)).ok).toBe(false);
    expect(writes.list).toEqual([]);
  });
});

describe('le partage noté', () => {
  it('le premier partage s’écrit ; un second (la base refuse) ne change rien', async () => {
    expect(await recordLinkShared(BUYER)).toEqual({ ok: true });
    expect(writes.list).toEqual(['insert buyer_events']);
    writes.insertError = { code: '23505' };
    expect(await recordLinkShared(BUYER)).toEqual({ ok: true });
    writes.insertError = { code: '42501' };
    expect((await recordLinkShared(BUYER)).ok).toBe(false);
  });

  it('sans lien valable pour sa dernière sélection, aucun partage n’est noté', async () => {
    writes.linkValid = false;
    expect((await recordLinkShared(BUYER)).ok).toBe(false);
    expect(writes.list).toEqual([]);
  });
});

describe('la démo', () => {
  it('les Lambert : une sélection de Vence avec la maison à la piscine ; les Keller : deux refus de Mougins', () => {
    const now = new Date();
    expect(demoLambertSelectionPlan(now).map((item) => item.listingId)).toEqual([
      'ven-02',
      'ven-04',
    ]);
    const keller = demoKellerRefusalsPlan(now);
    expect(keller.map((item) => item.listingId)).toEqual(['mou-06', 'mou-01']);
    expect(Math.min(...keller.map((item) => item.listedPrice ?? Infinity))).toBe(1_580_000);
  });
});
