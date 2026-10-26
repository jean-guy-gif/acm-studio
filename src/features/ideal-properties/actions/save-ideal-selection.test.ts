import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeSupabase, type FakeCall } from '@/test-fixtures/fake-supabase';

// Mission 118 — « Retenir la sélection » : trois biens au plus, pour une fiche de l'agence, non
// archivée ; une sélection neuve s'ajoute (la précédente reste lisible) ; en démonstration, les
// annonces retenues reçoivent leurs données importées depuis le jeu de données, sans extension.
const state = vi.hoisted(() => ({
  profile: null as null | { id: string; agency_id: string; removed_at: string | null },
  demo: false,
  client: null as unknown,
}));
vi.mock('@/lib/auth/get-profile', () => ({ getProfile: async () => state.profile }));
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: () => state.client }));
vi.mock('@/features/demo/services/is-demo-agency', () => ({
  isDemoAgency: async () => state.demo,
}));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));

const { saveIdealSelection } =
  await import('@/features/ideal-properties/actions/save-ideal-selection');
const { DEMO_LISTINGS } = await import('@/features/demo/data/scenarios');
const { demoListingUrl } = await import('@/features/demo/services/demo-urls');

const BUYER = '11111111-1111-4111-8111-111111111111';
const item = (reference: string, source = 'listing') => ({
  source,
  reference,
  label: 'Maison · 7 pièces · 210 m² · Mougins',
  listedPrice: 1_639_500,
  category: source === 'listing' ? 'strong' : 'agency',
  gaps: [],
  snapshot: null,
});

const lastTable = (calls: FakeCall[], method: string) =>
  calls.filter((call) => call.method === method);

describe('saveIdealSelection', () => {
  beforeEach(() => {
    state.profile = { id: 'advisor-1', agency_id: 'agency-a', removed_at: null };
    state.demo = false;
  });

  it('sans profil, sans bien ou avec quatre biens : rien n’est écrit', async () => {
    const fake = fakeSupabase(() => ({ data: { id: BUYER } }));
    state.client = fake.client;
    state.profile = null;
    expect((await saveIdealSelection(BUYER, [item('u1')], null)).ok).toBe(false);
    state.profile = { id: 'advisor-1', agency_id: 'agency-a', removed_at: null };
    expect((await saveIdealSelection(BUYER, [], null)).ok).toBe(false);
    expect(
      (
        await saveIdealSelection(
          BUYER,
          ['u1', 'u2', 'u3', 'u4'].map((u) => item(u)),
          null,
        )
      ).ok,
    ).toBe(false);
    expect(fake.writes()).toEqual([]);
  });

  it('une fiche archivée ou d’une autre agence : introuvable, rien n’est écrit', async () => {
    const fake = fakeSupabase(() => ({ data: null }));
    state.client = fake.client;
    expect(await saveIdealSelection(BUYER, [item('u1')], '2026-10-24')).toEqual({
      ok: false,
      error: 'Cette fiche acquéreur n’existe plus.',
    });
    expect(fake.writes()).toEqual([]);
    expect(fake.calls.some((call) => call.method === 'is' && call.args[0] === 'archived_at')).toBe(
      true,
    );
  });

  it('écrit la sélection puis ses biens, dans l’ordre, avec la date « affiché le » ; les annonces sont à importer', async () => {
    const fake = fakeSupabase((calls) => {
      const table = [...calls].reverse().find((call) => call.method === 'from')?.args[0];
      if (table === 'buyers') return { data: { id: BUYER } };
      if (table === 'buyer_selections')
        return {
          data: {
            id: 'sel-1',
            agency_id: 'agency-a',
            buyer_id: BUYER,
            created_by: 'advisor-1',
            created_at: '2026-10-24T10:00:00Z',
          },
        };
      const insert = lastTable(calls, 'insert').at(-1)?.args[0] as
        Record<string, unknown>[] | undefined;
      // Avant l'écriture : les biens de la sélection précédente (aucun ici).
      if (!insert || table !== 'buyer_selection_items' || !calls.some((c) => c.method === 'insert'))
        return { data: [] };
      return {
        data: insert.map((row, index) => ({
          ...row,
          id: `item-${index + 1}`,
          created_at: '2026-10-24T10:00:00Z',
        })),
      };
    });
    state.client = fake.client;
    const result = await saveIdealSelection(
      BUYER,
      [item('p-1', 'project'), item('https://www.seloger.com/annonces/1.htm')],
      '2026-10-24',
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(fake.writes()).toEqual(['insert buyer_selections', 'insert buyer_selection_items']);
    const rows = lastTable(fake.calls, 'insert')[1]?.args[0] as Record<string, unknown>[];
    expect(rows.map((row) => [row.position, row.source, row.price_seen_on])).toEqual([
      [1, 'project', null],
      [2, 'listing', '2026-10-24'],
    ]);
    expect(rows.every((row) => row.agency_id === 'agency-a' && row.selection_id === 'sel-1')).toBe(
      true,
    );
    expect(result.toImport).toEqual([
      { itemId: 'item-2', url: 'https://www.seloger.com/annonces/1.htm' },
    ]);
    expect(result.selection.items).toHaveLength(2);
  });

  it('en démonstration : les annonces retenues reçoivent leurs données du jeu de données, rien à importer', async () => {
    state.demo = true;
    const listing = DEMO_LISTINGS[0]!;
    const fake = fakeSupabase((calls) => {
      const table = [...calls].reverse().find((call) => call.method === 'from')?.args[0];
      if (table === 'buyers') return { data: { id: BUYER } };
      if (table === 'buyer_selections')
        return {
          data: {
            id: 'sel-1',
            agency_id: 'agency-a',
            buyer_id: BUYER,
            created_by: null,
            created_at: '2026-10-24T10:00:00Z',
          },
        };
      const insert = lastTable(calls, 'insert').at(-1)?.args[0] as
        Record<string, unknown>[] | undefined;
      // Avant l'écriture : les biens de la sélection précédente (aucun ici).
      if (!insert || table !== 'buyer_selection_items' || !calls.some((c) => c.method === 'insert'))
        return { data: [] };
      return {
        data: insert.map((row, index) => ({ ...row, id: `item-${index + 1}`, created_at: 'x' })),
      };
    });
    state.client = fake.client;
    const result = await saveIdealSelection(BUYER, [item(demoListingUrl(listing))], '2026-10-24');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const rows = lastTable(fake.calls, 'insert')[1]?.args[0] as Record<string, unknown>[];
    expect(rows[0]!.imported).toMatchObject({
      price: listing.price,
      listingUrl: demoListingUrl(listing),
    });
    expect(result.toImport).toEqual([]);
    expect(result.selection.items[0]!.imported).toBe(true);
  });

  // Essai de Jean-Guy (26/10) : une annonce gardée de la sélection précédente, au même prix, garde
  // sa date « affiché le » et ses données importées ; elle n'est pas à relire.
  it('une annonce gardée, au même prix : sa date et ses données importées, rien à relire', async () => {
    const url = 'https://www.seloger.com/annonces/1.htm';
    const previousRow = {
      source: 'listing',
      reference: url,
      listed_price: 1_639_500,
      price_seen_on: '2026-10-20',
      imported: { price: 1_639_500, listingFeatures: ['Piscine'] },
      snapshot: { propertyType: 'house' },
    };
    const fake = fakeSupabase((calls) => {
      const table = [...calls].reverse().find((call) => call.method === 'from')?.args[0];
      if (table === 'buyers') return { data: { id: BUYER } };
      if (table === 'buyer_selections')
        return {
          data: {
            id: 'sel-0',
            agency_id: 'agency-a',
            buyer_id: BUYER,
            created_by: null,
            created_at: '2026-10-24T10:00:00Z',
          },
        };
      const insert = lastTable(calls, 'insert').filter(
        (call) => (call.args[0] as unknown[])?.length !== undefined,
      );
      if (insert.length === 0) return { data: [previousRow] };
      const rows = insert.at(-1)!.args[0] as Record<string, unknown>[];
      return {
        data: rows.map((row, index) => ({ ...row, id: `item-${index + 1}`, created_at: 'x' })),
      };
    });
    state.client = fake.client;
    const result = await saveIdealSelection(BUYER, [item(url)], '2026-10-26');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const rows = lastTable(fake.calls, 'insert')[1]?.args[0] as Record<string, unknown>[];
    expect(rows[0]!.price_seen_on).toBe('2026-10-20');
    expect(rows[0]!.imported).toEqual(previousRow.imported);
    expect(result.toImport).toEqual([]);
  });
});
