import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeSupabase, type FakeCall } from '@/test-fixtures/fake-supabase';

// Mission 118 — « Retenir la sélection » : trois biens au plus, pour une fiche de l'agence, non
// archivée ; une sélection neuve s'ajoute (la précédente reste lisible) ; en démonstration, les
// annonces retenues reçoivent leurs données importées depuis le jeu de données, sans extension.
const state = vi.hoisted(() => ({
  profile: null as null | { id: string; agency_id: string; removed_at: string | null },
  demo: false,
  client: null as unknown,
  // Ce que l'acquéreur a déjà vu (`readSeenProperties`) ; null : la lecture a échoué.
  seen: {
    facts: [] as [string, string][],
    marks: [] as unknown[],
    failed: false,
    // Sa dernière sélection lui est-elle parvenue (présentée, envoyée) ?
    received: false,
  },
}));
vi.mock('@/features/buyers/queries/read-seen-properties', () => ({
  readSeenProperties: async (_client: unknown, _agencyId: string, buyerId: string) =>
    state.seen.failed
      ? null
      : {
          seen: new Map([
            [
              buyerId,
              new Map(state.seen.facts.map(([key, reason]) => [key, { reason, at: null }])),
            ],
          ]),
          keyOf: (item: { source: string; reference: string }) =>
            `${item.source}:${item.reference}`,
          marks: () => state.seen.marks,
          receivedAt: () => (state.seen.received ? '2026-11-13T16:04:00Z' : null),
        },
}));
vi.mock('@/lib/auth/get-profile', () => ({ getProfile: async () => state.profile }));
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: () => state.client }));
vi.mock('@/features/demo/services/is-demo-agency', () => ({
  isDemoAgency: async () => state.demo,
}));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));

const { saveIdealSelection } =
  await import('@/features/ideal-properties/actions/save-ideal-selection');
const { NOT_PROPOSABLE } = await import('@/features/ideal-properties/services/ideal-agency');
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
    state.seen = { facts: [], marks: [], failed: false, received: false };
  });

  // Lancement, mission 3 (suite, Jean-Guy, 25/11) — un bien qu'il a déjà reçu, visité ou refusé ne
  // se retient plus : relu en base, jamais cru du navigateur.
  it('un bien qu’il a déjà vu : refusé, rien n’est écrit — même revenu sous une autre annonce', async () => {
    const fake = fakeSupabase(() => ({ data: { id: BUYER } }));
    state.client = fake.client;
    state.seen.facts = [['listing:u1', 'sent']];
    const direct = await saveIdealSelection(BUYER, [item('u1'), item('u2')], null);
    expect(direct).toEqual({
      ok: false,
      error:
        'L’un de ces biens a déjà été vu avec lui, ou écarté pour lui : il ne se retient plus. Rechargez la page.',
    });
    // La même maison, rendue par la recherche sous une autre annonce : son identifiant chez le
    // fournisseur est celui que la sélection présentée a gardé.
    state.seen.marks = [{ key: 'listing:u1', propertyId: 'se-735', like: null }];
    const again = await saveIdealSelection(
      BUYER,
      [{ ...item('autre-annonce'), snapshot: { key: 'se-735' } }],
      null,
    );
    expect(again.ok).toBe(false);
    expect(fake.writes()).toEqual([]);
  });

  it('un bien déjà visité de sa sélection en cours, pas encore reçue, reste ; reçue, il ne se retient plus', async () => {
    const withPrevious = () =>
      fakeSupabase((calls) => {
        const table = [...calls].reverse().find((call) => call.method === 'from')?.args[0];
        if (table === 'buyer_selections') {
          return calls.some((call) => call.method === 'insert')
            ? { data: { id: 'sel-2', buyer_id: BUYER, created_at: '2026-11-25T10:00:00Z' } }
            : { data: { id: 'sel-1' } };
        }
        if (table === 'buyer_selection_items') {
          return calls.some((call) => call.method === 'insert')
            ? { data: [] }
            : { data: [{ source: 'listing', reference: 'u1', listed_price: 1_639_500 }] };
        }
        return { data: { id: BUYER } };
      });
    state.seen.facts = [['listing:u1', 'visited']];
    const composing = withPrevious();
    state.client = composing.client;
    expect((await saveIdealSelection(BUYER, [item('u1'), item('u2')], null)).ok).toBe(true);
    state.seen.received = true;
    const received = withPrevious();
    state.client = received.client;
    expect((await saveIdealSelection(BUYER, [item('u1'), item('u2')], null)).ok).toBe(false);
    expect(received.writes()).toEqual([]);
    // Refusé, ou écarté pour lui, il ne se reprend jamais, même gardé d'une sélection en cours.
    state.seen.received = false;
    for (const reason of ['refused', 'dismissed']) {
      state.seen.facts = [['listing:u1', reason]];
      const refused = withPrevious();
      state.client = refused.client;
      expect((await saveIdealSelection(BUYER, [item('u1'), item('u2')], null)).ok).toBe(false);
      expect(refused.writes()).toEqual([]);
    }
  });

  it('ce qu’il a déjà vu n’a pas pu être lu : rien n’est écrit (M98)', async () => {
    const fake = fakeSupabase(() => ({ data: { id: BUYER } }));
    state.client = fake.client;
    state.seen.failed = true;
    expect((await saveIdealSelection(BUYER, [item('u1')], null)).ok).toBe(false);
    expect(fake.writes()).toEqual([]);
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
      // Mission 145 — p-1 est un mandat signé, sans offre.
      if (table === 'project_meeting_conclusions')
        return { data: [{ project_id: 'p-1', outcome: 'signed' }] };
      if (table === 'buyer_documents') return { data: [] };
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

  it('le jour de la veille n’est gardé que s’il est celui d’un passage qui a trouvé l’annonce', async () => {
    const found = 'https://www.seloger.com/annonces/100000001.htm';
    const fake = fakeSupabase((calls) => {
      const table = [...calls].reverse().find((call) => call.method === 'from')?.args[0];
      if (table === 'buyers') return { data: { id: BUYER } };
      if (table === 'buyer_watch_runs') {
        return {
          data: [
            {
              ran_at: '2026-11-04T01:20:00Z',
              finds: [
                {
                  key: null,
                  url: found,
                  price: 1_420_000,
                  surfaceArea: 185,
                  roomsCount: 6,
                  propertyType: 'house',
                  pricePerSqm: null,
                  landArea: null,
                  city: 'Mouans-Sartoux',
                  photoUrls: [],
                },
              ],
            },
          ],
        };
      }
      if (table === 'buyer_selections') {
        return {
          data: {
            id: 'sel-1',
            agency_id: 'agency-a',
            buyer_id: BUYER,
            created_by: 'advisor-1',
            created_at: '2026-11-06T10:00:00Z',
          },
        };
      }
      const insert = lastTable(calls, 'insert').at(-1)?.args[0] as
        Record<string, unknown>[] | undefined;
      if (!insert || table !== 'buyer_selection_items') return { data: [] };
      return { data: insert.map((row, index) => ({ ...row, id: `item-${index + 1}` })) };
    });
    state.client = fake.client;
    await saveIdealSelection(
      BUYER,
      [
        { ...item(found), seenOn: '2026-11-04' },
        // Un jour que le navigateur invente : la date de la recherche du jour s'applique.
        { ...item('https://www.seloger.com/annonces/2.htm'), seenOn: '2026-10-01' },
      ],
      '2026-11-06',
    );
    const rows = lastTable(fake.calls, 'insert')[1]?.args[0] as Record<string, unknown>[];
    expect(rows.map((row) => row.price_seen_on)).toEqual(['2026-11-04', '2026-11-06']);
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

// Mission 145 (partie A) — un bien de l'agence nouveau dans la sélection doit être un mandat signé
// sans offre acceptée (décision de Jean-Guy, 07/11) : un vendeur à relancer, un dossier sans mandat
// ou un mandat sous offre acceptée sont refusés, rien n'est écrit ; un bien déjà retenu reste.
describe('saveIdealSelection : seul un mandat signé sans offre acceptée', () => {
  beforeEach(() => {
    state.profile = { id: 'advisor-1', agency_id: 'agency-a', removed_at: null };
    state.demo = false;
    state.seen = { facts: [], marks: [], failed: false, received: false };
  });

  const clientWith = (
    conclusions: { project_id: string; outcome: string }[],
    offers: unknown[],
    previousItems: { source: string; reference: string }[] = [],
  ) =>
    fakeSupabase((calls) => {
      const table = [...calls].reverse().find((call) => call.method === 'from')?.args[0];
      if (table === 'buyers') return { data: { id: BUYER } };
      if (table === 'project_meeting_conclusions') return { data: conclusions };
      if (table === 'buyer_documents') return { data: offers };
      if (table === 'buyer_selections' && !calls.some((call) => call.method === 'insert'))
        return { data: previousItems.length > 0 ? { id: 'sel-0' } : null };
      if (table === 'buyer_selection_items' && !calls.some((call) => call.method === 'insert'))
        return {
          data: previousItems.map((row) => ({
            ...row,
            listed_price: null,
            price_seen_on: null,
            imported: null,
            snapshot: null,
          })),
        };
      return { data: null, error: { message: 'non prévu' } };
    });

  it('un vendeur à relancer ou un dossier sans conclusion : refusé, rien n’est écrit', async () => {
    for (const conclusions of [[{ project_id: 'p-1', outcome: 'follow_up' }], []]) {
      const fake = clientWith(conclusions, []);
      state.client = fake.client;
      const result = await saveIdealSelection(BUYER, [item('p-1', 'project')], null);
      expect(result).toEqual({ ok: false, error: NOT_PROPOSABLE });
      expect(fake.writes()).toEqual([]);
    }
  });

  it('un mandat signé sous offre acceptée : refusé ; l’offre tombée, il passe', async () => {
    const offer = (status: string) => ({
      id: 'o-1',
      buyer_id: 'b-keller',
      fields: { projectId: 'p-1' },
      buyers: { name: 'Famille Keller', status },
      buyer_document_acceptances: [{ decision: 'accepted', decided_at: '2026-11-06T10:00:00Z' }],
    });
    const held = clientWith([{ project_id: 'p-1', outcome: 'signed' }], [offer('under_offer')]);
    state.client = held.client;
    expect(await saveIdealSelection(BUYER, [item('p-1', 'project')], null)).toEqual({
      ok: false,
      error: NOT_PROPOSABLE,
    });
    expect(held.writes()).toEqual([]);
    const fallen = clientWith([{ project_id: 'p-1', outcome: 'signed' }], [offer('visiting')]);
    state.client = fallen.client;
    await saveIdealSelection(BUYER, [item('p-1', 'project')], null);
    expect(fallen.writes()).toContain('insert buyer_selections');
  });

  it('un bien de l’agence déjà dans la sélection précédente reste, sans être relu', async () => {
    const fake = clientWith([], [], [{ source: 'project', reference: 'p-1' }]);
    state.client = fake.client;
    await saveIdealSelection(BUYER, [item('p-1', 'project')], null);
    expect(fake.writes()).toContain('insert buyer_selections');
    expect(
      fake.calls.some(
        (call) => call.method === 'from' && call.args[0] === 'project_meeting_conclusions',
      ),
    ).toBe(false);
  });
});
