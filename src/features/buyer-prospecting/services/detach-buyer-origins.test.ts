import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeSupabase, type FakeCall } from '@/test-fixtures/fake-supabase';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/app-errors/report-server-error', () => ({
  reportServerError: async () => undefined,
}));

const { detachBuyerOrigins, detachBuyerOriginsForProject } =
  await import('@/features/buyer-prospecting/services/detach-buyer-origins');
const { listingIdentityKey } =
  await import('@/features/comparable-import/utils/extract-listing-key');

const LISTING = 'https://www.bienici.com/annonce/vente/mougins/maison/5pieces/ag-123456';
const KEY = listingIdentityKey(LISTING);

// Mission 120 B — le miroir de l'absorption : un concurrent qui cesse de porter sa carte ne laisse
// jamais une origine acquéreur sans carte (décision du 29/10).
type World = {
  origins: { comparable_id: string }[];
  competitor: Record<string, unknown>;
  copies: { id: string; project_id: string }[];
  open: Record<string, boolean>;
};
const world: World = { origins: [], competitor: {}, copies: [], open: {} };

const sinceLastFrom = (calls: FakeCall[]): FakeCall[] =>
  calls.slice(calls.map((call) => call.method).lastIndexOf('from'));

const service = fakeSupabase((calls) => {
  const last = calls[calls.length - 1];
  if (last?.method === 'rpc') return { data: 1 };
  const chain = sinceLastFrom(calls);
  const table = String(chain[0]?.args[0]);
  const eq = (column: string) =>
    chain.find((call) => call.method === 'eq' && call.args[0] === column)?.args[1];
  if (table === 'buyer_prospect_origins') return { data: world.origins };
  if (table === 'comparables') {
    if (eq('listing_url')) return { data: world.copies };
    if (eq('project_id')) return { data: [{ id: 'c1' }, { id: 'c2' }] };
    return { data: [world.competitor] };
  }
  if (table === 'projects') {
    const id = String(eq('id'));
    return { data: { status: world.open[id] ? 'meeting_completed' : 'archived' } };
  }
  if (table === 'project_meeting_conclusions') {
    return { data: { outcome: 'signed' } };
  }
  return { data: null };
});
const client = service.client as Parameters<typeof detachBuyerOrigins>[0];

const rpcArgs = () =>
  service.calls
    .filter((call) => call.method === 'rpc')
    .map((call) => call.args[1] as Record<string, unknown>);

beforeEach(() => {
  service.reset();
  world.origins = [{ comparable_id: 'c1' }];
  world.copies = [];
  world.open = {};
  world.competitor = {
    id: 'c1',
    project_id: 'p1',
    is_selected: false,
    listing_url: LISTING,
    property_type: 'Maison',
    surface_area: 140,
    rooms_count: 5,
    land_area: null,
    outdoor_spaces: null,
    parking_types: null,
    listing_features: [],
    energy_rating: null,
    district: null,
    city: 'Mougins',
    price: 1_200_000,
    photo_urls: [],
  };
});

describe('détacher les recherches acquéreur d’un concurrent', () => {
  it('l’annonce a une identité', () => {
    expect(KEY).not.toBeNull();
  });

  it('sans origine : aucun appel', async () => {
    world.origins = [];
    expect(await detachBuyerOrigins(client, 'agency-a', ['c1'])).toBe(0);
    expect(service.writes()).toEqual([]);
  });

  it('écarté, sans autre copie : le bien redevient un bien démarché, avec ses faits', async () => {
    expect(await detachBuyerOrigins(client, 'agency-a', ['c1'])).toBe(1);
    expect(service.writes()).toEqual(['rpc detach_buyer_origins']);
    const [args] = rpcArgs();
    expect(args).toMatchObject({
      p_agency_id: 'agency-a',
      p_comparable_id: 'c1',
      p_listing_key: KEY,
    });
    expect(args.p_target_comparable_id).toBeUndefined();
    expect(args.p_facts).toMatchObject({
      propertyType: 'Maison',
      surfaceArea: 140,
      city: 'Mougins',
    });
    expect(JSON.stringify(args.p_facts)).not.toContain('bienici');
  });

  it('une autre copie retenue dans un mandat signé : les origines y passent', async () => {
    world.copies = [
      { id: 'c1', project_id: 'p1' },
      { id: 'c9', project_id: 'p9' },
    ];
    world.open = { p9: true };
    await detachBuyerOrigins(client, 'agency-a', ['c1']);
    expect(rpcArgs()[0].p_target_comparable_id).toBe('c9');
  });

  it('une copie dans un dossier qui n’est plus un mandat signé ne reçoit rien', async () => {
    world.copies = [{ id: 'c9', project_id: 'p9' }];
    await detachBuyerOrigins(client, 'agency-a', ['c1']);
    expect(rpcArgs()[0].p_target_comparable_id).toBeUndefined();
  });

  it('un concurrent qui porte encore sa carte ne se détache pas, sauf avant une suppression', async () => {
    world.competitor = { ...world.competitor, is_selected: true };
    world.open = { p1: true };
    expect(await detachBuyerOrigins(client, 'agency-a', ['c1'])).toBe(0);
    expect(service.writes()).toEqual([]);
    expect(await detachBuyerOrigins(client, 'agency-a', ['c1'], { beforeDelete: true })).toBe(1);
    expect(service.writes()).toEqual(['rpc detach_buyer_origins']);
  });

  it('tout un dossier : ses concurrents, cadrés sur l’agence', async () => {
    await detachBuyerOriginsForProject(client, 'agency-a', 'p1');
    const projectRead = service.calls.findIndex(
      (call) => call.method === 'eq' && call.args[0] === 'project_id',
    );
    expect(projectRead).toBeGreaterThan(-1);
    expect(
      service.calls.some(
        (call) =>
          call.method === 'eq' && call.args[0] === 'agency_id' && call.args[1] === 'agency-a',
      ),
    ).toBe(true);
    expect(service.writes()).toEqual(['rpc detach_buyer_origins']);
  });
});
