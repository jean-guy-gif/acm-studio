import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mission 134 — le catalogue des biens de la boucle ; Mission 145 (partie A) — seul un bien sous
// MANDAT SIGNÉ, sans offre acceptée, se propose à un acquéreur (décision de Jean-Guy, 07/11) : un
// vendeur à relancer, un concurrent retenu, un nouveau venu ou un bien démarché n'y entrent plus,
// ni un mandat qu'une offre acceptée tient ; l'offre tombée, il revient. Un dossier archivé ou
// d'exemple n'entre pas (lu par la requête) ; un envoi noté exclut son acquéreur ; une lecture en
// échec le dit, jamais « rien à proposer » (M98).
const user = vi.hoisted(() => ({ client: null as unknown }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => user.client }));
vi.mock('@/features/buyers/queries/get-property-buyers', async (original) => ({
  ...(await original<typeof import('@/features/buyers/queries/get-property-buyers')>()),
  loadLoopProperties: async (_agencyId: string, ids: string[]) => ({
    properties: new Map(
      ids.map((id) => [
        id,
        {
          property: {
            propertyType: 'house',
            roomsCount: 5,
            surfaceArea: 135,
            city: 'Vence',
            bedroomsCount: 4,
            floor: null,
            hasElevator: null,
            hasPool: false,
            outdoorSpaces: ['garden'],
            parkingTypes: [],
            energyRating: null,
            generalCondition: null,
          },
          price: 713_000,
        },
      ]),
    ),
    failed: false,
  }),
}));

const { loadLoopCatalog } = await import('@/features/buyers/queries/get-loop-properties');

// Un client qui répond table par table, même quand les lectures partent ensemble.
function tableClient(respond: (table: string) => { data?: unknown; error?: unknown }) {
  return {
    from(table: string) {
      const chain: Record<string, unknown> = {};
      for (const method of ['select', 'eq', 'neq', 'in', 'is', 'gte', 'order', 'range']) {
        chain[method] = () => chain;
      }
      chain.then = (resolve: (value: unknown) => unknown) =>
        resolve({ data: null, error: null, ...respond(table) });
      return chain;
    },
  };
}
const now = new Date('2026-11-07T10:00:00Z');
const offer = (projectId: string, decision: string, status: string) => ({
  id: `o-${projectId}-${status}`,
  buyer_id: 'b-keller',
  fields: { projectId },
  buyers: { name: 'Famille Keller', status },
  buyer_document_acceptances: [{ decision, decided_at: '2026-11-06T10:00:00Z' }],
});

let answers: Record<string, unknown>;
let failing: string | null;
beforeEach(() => {
  failing = null;
  answers = {
    // La requête ne lit que les mandats signés : la base ne rend que ceux-là.
    project_meeting_conclusions: [
      {
        project_id: 'p-lopez',
        outcome: 'signed',
        signed_at: '2026-11-04T10:00:00Z',
        concluded_at: '2026-11-04T10:00:00Z',
      },
      {
        project_id: 'p-mougins',
        outcome: 'signed',
        signed_at: '2026-10-07T10:00:00Z',
        concluded_at: '2026-10-07T10:00:00Z',
      },
    ],
    projects: [
      {
        id: 'p-lopez',
        seller_name: 'M. et Mme Lopez',
        status: 'meeting_completed',
        is_example: false,
      },
      {
        id: 'p-mougins',
        seller_name: 'M. Lefebvre',
        status: 'meeting_completed',
        is_example: false,
      },
      {
        id: 'p-lambert-duval',
        seller_name: 'M. et Mme Lambert-Duval',
        status: 'meeting_completed',
        is_example: false,
      },
    ],
    buyer_documents: [offer('p-mougins', 'accepted', 'under_offer')],
    buyer_proposals: [{ buyer_id: 'b1', property_key: 'x', sent_at: '2026-11-06T09:00:00Z' }],
  };
  user.client = tableClient((table) =>
    table === failing ? { error: { message: 'panne' } } : { data: answers[table] ?? [] },
  );
});

describe('le catalogue de la boucle', () => {
  it('un mandat signé sans offre acceptée, et lui seul', async () => {
    const catalog = await loadLoopCatalog('agency-a', now);
    expect(catalog.failed).toBe(false);
    expect(catalog.items.map((item) => item.key)).toEqual(['project:p-lopez']);
    const [lopez] = catalog.items;
    expect(lopez?.origin).toBe('mandate');
    expect(lopez?.sellerName).toBe('M. et Mme Lopez');
    expect(lopez?.price).toBe(713_000);
    expect(lopez?.bornAt).toBe('2026-11-04T10:00:00Z');
    expect(catalog.contacts.proposals.get('x')?.get('b1')).toBe('2026-11-06T09:00:00Z');
  });

  it('ne lit ni les concurrents, ni les biens démarchés, ni les vendeurs à relancer', async () => {
    const tables: string[] = [];
    const filters: unknown[][] = [];
    user.client = {
      from(table: string) {
        tables.push(table);
        const chain: Record<string, unknown> = {};
        for (const method of ['select', 'neq', 'in', 'is', 'gte', 'order', 'range']) {
          chain[method] = () => chain;
        }
        chain.eq = (...args: unknown[]) => {
          if (table === 'project_meeting_conclusions') filters.push(args);
          return chain;
        };
        chain.then = (resolve: (value: unknown) => unknown) =>
          resolve({ data: answers[table] ?? [], error: null });
        return chain;
      },
    };
    await loadLoopCatalog('agency-a', now);
    expect(tables).not.toContain('comparables');
    expect(tables).not.toContain('buyer_prospects');
    expect(filters).toContainEqual(['outcome', 'signed']);
  });

  it('l’offre tombée (l’acquéreur revenu en visite), le mandat se propose de nouveau', async () => {
    answers.buyer_documents = [offer('p-mougins', 'accepted', 'visiting')];
    const keys = (await loadLoopCatalog('agency-a', now)).items.map((item) => item.key).sort();
    expect(keys).toEqual(['project:p-lopez', 'project:p-mougins']);
  });

  it('une offre refusée ne tient pas le mandat ; « A acheté » le tient', async () => {
    answers.buyer_documents = [offer('p-mougins', 'refused', 'visiting')];
    expect((await loadLoopCatalog('agency-a', now)).items).toHaveLength(2);
    answers.buyer_documents = [offer('p-mougins', 'accepted', 'purchased')];
    expect((await loadLoopCatalog('agency-a', now)).items.map((item) => item.key)).toEqual([
      'project:p-lopez',
    ]);
  });

  it('une lecture en échec le dit', async () => {
    for (const table of [
      'project_meeting_conclusions',
      'buyer_proposals',
      'projects',
      'buyer_documents',
    ]) {
      failing = table;
      expect((await loadLoopCatalog('agency-a', now)).failed).toBe(true);
    }
  });
});
