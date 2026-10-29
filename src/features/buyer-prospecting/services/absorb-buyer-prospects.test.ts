import { beforeEach, describe, expect, it, vi } from 'vitest';

import { listingIdentityKey } from '@/features/comparable-import/utils/extract-listing-key';
import { fakeSupabase } from '@/test-fixtures/fake-supabase';

// Mission 120 (décision du 28/10) — un concurrent ne reprend la carte d'une recherche acquéreur que
// quand il porte lui-même une carte : retenu dans un mandat signé.
const rpcs = vi.hoisted(() => [] as unknown[]);
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: () => ({
    rpc: async (name: string, args: unknown) => {
      rpcs.push([name, args]);
      return { data: 1, error: null };
    },
  }),
}));
vi.mock('@/lib/app-errors/report-server-error', () => ({
  reportServerError: async () => undefined,
}));

const { absorbBuyerProspectsForProject } =
  await import('@/features/buyer-prospecting/services/absorb-buyer-prospects');

const URL = 'https://www.seloger.com/annonces/achat/maison/mougins-06/26ZEJMLWB13Y.htm';
// Le service lit le dossier et sa conclusion d'un coup : le double répond dans l'ordre des
// attentes (dossier, conclusion), puis les concurrents retenus.
const client = (status: string, outcome: string | null) => {
  let answered = 0;
  return fakeSupabase(() => {
    answered += 1;
    if (answered === 1) return { data: { status } };
    if (answered === 2) return { data: outcome ? { outcome } : null };
    return {
      data: [
        { id: 'c1', listing_url: URL },
        { id: 'c2', listing_url: null },
      ],
    };
  });
};

beforeEach(() => {
  rpcs.length = 0;
});

describe('la fusion d’un bien démarché dans un concurrent', () => {
  it('un mandat signé : chaque concurrent retenu qui a une annonce reconnue', async () => {
    const supabase = client('meeting_completed', 'signed');
    expect(await absorbBuyerProspectsForProject(supabase.client as never, 'a1', 'p1')).toBe(1);
    expect(rpcs).toEqual([
      [
        'absorb_buyer_prospect',
        { p_agency_id: 'a1', p_comparable_id: 'c1', p_listing_key: listingIdentityKey(URL) },
      ],
    ]);
    expect(
      supabase.calls.filter((call) => call.method === 'eq').map((call) => call.args),
    ).toContainEqual(['is_selected', true]);
  });

  it('un seul concurrent, celui qui vient d’être inséré ou retenu', async () => {
    const supabase = client('meeting_completed', 'signed');
    await absorbBuyerProspectsForProject(supabase.client as never, 'a1', 'p1', 'c1');
    expect(
      supabase.calls.filter((call) => call.method === 'eq').map((call) => call.args),
    ).toContainEqual(['id', 'c1']);
  });

  it('un dossier en préparation, prêt, ou conclu autrement : aucune fusion', async () => {
    for (const [status, outcome] of [
      ['draft', null],
      ['ready_for_meeting', null],
      ['meeting_completed', 'follow_up'],
      ['archived', 'signed'],
    ] as const) {
      const supabase = client(status, outcome);
      expect(await absorbBuyerProspectsForProject(supabase.client as never, 'a1', 'p1')).toBe(0);
      expect(
        supabase.calls.some((call) => call.method === 'from' && call.args[0] === 'comparables'),
      ).toBe(false);
    }
    expect(rpcs).toEqual([]);
  });
});
