import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mission 134 — le catalogue des biens de la boucle : un concurrent retenu sur deux dossiers est un
// seul bien ; un dossier archivé ou d'exemple n'entre pas (lu par la requête) ; un envoi noté exclut
// son acquéreur ; une lecture en échec le dit, jamais « rien à proposer » (M98).
const user = vi.hoisted(() => ({ client: null as unknown }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => user.client }));
vi.mock('@/features/buyers/queries/get-property-buyers', async (original) => ({
  ...(await original<typeof import('@/features/buyers/queries/get-property-buyers')>()),
  loadLoopProperties: async () => ({ properties: new Map(), failed: false }),
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
const now = new Date('2026-11-06T10:00:00Z');
const comparable = (id: string, projectId: string) => ({
  id,
  project_id: projectId,
  created_at: '2026-11-05T10:00:00Z',
  listing_url: 'https://www.seloger.com/annonces/achat/maison/vence-06/123456789.htm',
  listing_gone_at: null,
  meeting_frozen_at: null,
  property_type: 'house',
  rooms_count: 5,
  surface_area: '140.00',
  land_area: null,
  city: 'Vence',
  district: null,
  bedrooms_count: 4,
  outdoor_spaces: [],
  parking_types: [],
  listing_features: ['Piscine'],
  energy_rating: null,
  price: '779000',
  photo_urls: [],
});

let answers: Record<string, unknown>;
let failing: string | null;
beforeEach(() => {
  failing = null;
  answers = {
    project_meeting_conclusions: [],
    projects: [
      { id: 'p1', seller_name: 'Bernard', status: 'ready_for_meeting', is_example: false },
      { id: 'p2', seller_name: 'Garcia', status: 'ready_for_meeting', is_example: false },
    ],
    comparables: [comparable('c1', 'p1'), comparable('c2', 'p2'), comparable('c3', 'p-archive')],
    buyer_prospects: [],
    buyer_prospect_origins: [],
    buyer_proposals: [{ buyer_id: 'b1', property_key: 'x', sent_at: '2026-11-06T09:00:00Z' }],
  };
  user.client = tableClient((table) =>
    table === failing ? { error: { message: 'panne' } } : { data: answers[table] ?? [] },
  );
});

describe('le catalogue de la boucle', () => {
  it('un bien retenu sur deux dossiers est un seul bien ; un dossier hors liste n’entre pas', async () => {
    const catalog = await loadLoopCatalog('agency-a', now);
    expect(catalog.failed).toBe(false);
    expect(catalog.items).toHaveLength(1);
    const [bien] = catalog.items;
    expect(bien?.key).toMatch(/^listing:/);
    expect(bien?.selectionRefs.filter((ref) => ref.startsWith('competitor:')).sort()).toEqual([
      'competitor:c1',
      'competitor:c2',
    ]);
    // Une colonne numérique en texte est convertie : prix et surface sont des nombres.
    expect(bien?.price).toBe(779_000);
    expect(bien?.property.surfaceArea).toBe(140);
    expect(catalog.contacts.proposals.get('x')?.get('b1')).toBe('2026-11-06T09:00:00Z');
  });

  it('une lecture en échec le dit', async () => {
    for (const table of ['comparables', 'buyer_proposals', 'projects', 'buyer_prospects']) {
      failing = table;
      expect((await loadLoopCatalog('agency-a', now)).failed).toBe(true);
    }
  });
});
