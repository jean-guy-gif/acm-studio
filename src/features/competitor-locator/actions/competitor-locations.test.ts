import { beforeEach, describe, expect, it, vi } from 'vitest';

import { listingIdentityKey } from '@/features/comparable-import/utils/extract-listing-key';
import { fakeSupabase } from '@/test-fixtures/fake-supabase';
import { buildOppositions, opposedOn } from '@/features/prospecting/services/opposition';

const LISTING_URL = 'https://www.seloger.com/annonces/achat/maison/antibes-06/26ZEJMLWB13Y.htm';
// L'identité publiée de l'annonce, telle que la liste d'opposition la garde (M102).
const LISTING_KEY = listingIdentityKey(LISTING_URL) as string;
const ADDRESS = '8 avenue du Docteur Hochet, 06160 Antibes';

const state = vi.hoisted(() => ({
  opposedListings: [] as string[],
  inserted: [] as unknown[],
  insertSucceeds: true,
  reported: [] as string[],
}));

const server = fakeSupabase((calls) =>
  calls.some((call) => call.method === 'update')
    ? {}
    : {
        data: [
          {
            id: 'c1',
            listing_url: LISTING_URL,
            locator_state: 'en-cours',
            locator_label: null,
            locator_label_key: null,
            locator_address: null,
            locator_source: null,
            locator_confirmed: false,
            locator_property_id: null,
            locator_latitude: null,
            locator_longitude: null,
            locator_analyzed_at: null,
            locator_purged_at: null,
          },
        ],
      },
);

vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('@/lib/auth/get-profile', () => ({
  getProfile: async () => ({ id: 'u-1', agency_id: 'a-1', removed_at: null }),
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => server.client }));
vi.mock('@/features/competitor-locator/schemas/locator-property', () => ({
  parseLocatorProperty: () => ({
    state: 'pret',
    label: 'Adresse confirmée',
    labelKey: 'confirmee',
    address: ADDRESS,
    source: 'dpe',
    confirmed: true,
    propertyId: 'b1',
    latitude: 43.5,
    longitude: 7.1,
    analyzedAt: '2026-10-19T09:00:00.000Z',
  }),
}));
vi.mock('@/features/prospecting/queries/get-oppositions', () => ({
  getOppositions: async () =>
    buildOppositions(
      state.opposedListings.map((listing_key) => ({
        address_key: null,
        listing_key,
        requested_at: '2026-10-19T08:00:00.000Z',
      })),
    ),
}));
vi.mock('@/features/prospecting/queries/insert-oppositions', () => ({
  insertOppositions: async (_s: unknown, _a: unknown, keys: unknown) => {
    state.inserted.push(keys);
    return state.insertSucceeds;
  },
}));
vi.mock('@/lib/app-errors/report-server-error', () => ({
  reportServerError: async (scope: string) => {
    state.reported.push(scope);
  },
}));

import { saveCompetitorLocations } from '@/features/competitor-locator/actions/competitor-locations';

beforeEach(() => {
  server.reset();
  state.opposedListings = [];
  state.inserted = [];
  state.insertSucceeds = true;
  state.reported = [];
});

// Mission 109 — le résultat de l'ajout est vérifié : un échec part au journal (la nuit rattrape).
describe('l’ajout de la clé d’adresse qui échoue', () => {
  it('part au journal, sans faire échouer la confirmation', async () => {
    state.opposedListings = [LISTING_KEY];
    state.insertSucceeds = false;
    const result = await saveCompetitorLocations('p1', [{ listingUrl: LISTING_URL, raw: {} }]);
    expect(result).toEqual({ ok: true, changed: 1 });
    expect(state.reported).toEqual(['oppositionParAnnonce']);
  });
});

// Mission 107 — « Ne plus solliciter » avant l'adresse : l'opposition porte sur l'annonce ; quand
// le Localisateur confirme ensuite l'adresse, sa clé s'ajoute à l'opposition existante.
describe('opposition par l’annonce, puis adresse confirmée', () => {
  it('la clé d’adresse s’ajoute à l’opposition', async () => {
    expect(LISTING_KEY).toMatch(/^seloger:/);
    state.opposedListings = [LISTING_KEY];
    const result = await saveCompetitorLocations('p1', [{ listingUrl: LISTING_URL, raw: {} }]);
    expect(result).toEqual({ ok: true, changed: 1 });
    expect(state.inserted).toEqual([
      { addressKey: '8 avenue du docteur hochet antibes', listingKeys: [] },
    ]);
  });

  it('un bien non opposé ne s’inscrit pas tout seul', async () => {
    await saveCompetitorLocations('p1', [{ listingUrl: LISTING_URL, raw: {} }]);
    expect(state.inserted).toEqual([]);
  });

  it('la carte reste bloquée partout : par l’annonce, puis par l’adresse aussi', () => {
    const byListing = buildOppositions([
      { address_key: null, listing_key: LISTING_KEY, requested_at: '2026-10-19T08:00:00.000Z' },
    ]);
    // Adresse confirmée ensuite : l'annonce suffit à bloquer courrier, lot et tournée (opposedOn).
    expect(opposedOn({ address: ADDRESS, listingKey: LISTING_KEY }, byListing)).not.toBeNull();
    const both = buildOppositions([
      { address_key: null, listing_key: LISTING_KEY, requested_at: '2026-10-19T08:00:00.000Z' },
      {
        address_key: '8 avenue du docteur hochet antibes',
        listing_key: null,
        requested_at: '2026-10-20T08:00:00.000Z',
      },
    ]);
    // Et l'immeuble est bloqué, même sous une autre annonce.
    expect(
      opposedOn({ address: '8 av. du Dr Hochet, Antibes', listingKey: null }, both),
    ).not.toBeNull();
  });
});
