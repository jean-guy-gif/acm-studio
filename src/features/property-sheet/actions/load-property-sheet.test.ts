import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeSupabase } from '@/test-fixtures/fake-supabase';

const ID = '11111111-1111-4111-8111-111111111111';
const PROJECT = '22222222-2222-4222-8222-222222222222';

const state = vi.hoisted(() => ({
  profile: { id: 'u-1', agency_id: 'a-1', removed_at: null as string | null } as {
    id: string;
    agency_id: string;
    removed_at: string | null;
  } | null,
  rows: {} as Record<string, unknown>,
  failing: null as string | null,
}));

const server = fakeSupabase((calls) => {
  const table = String([...calls].reverse().find((call) => call.method === 'from')?.args[0]);
  if (state.failing === table) return { error: { message: 'panne' } };
  return { data: state.rows[table] ?? null };
});

vi.mock('@/lib/auth/get-profile', () => ({ getProfile: async () => state.profile }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => server.client }));
vi.mock('@/lib/app-errors/report-server-error', () => ({ reportServerError: async () => {} }));
vi.mock('@/features/subject-property-photos/services/property-photo-storage', () => ({
  signPropertyPhotos: async (_client: unknown, paths: string[]) =>
    paths.map((path) => ({ path, url: `https://storage.example.com/${path}` })),
}));

const { loadPropertySheet } = await import('@/features/property-sheet/actions/load-property-sheet');
const { SHEET_NOT_FOUND, SHEET_UNREADABLE } =
  await import('@/features/property-sheet/sheet-messages');

const competitor = {
  property_type: 'house',
  rooms_count: 5,
  surface_area: 150,
  city: 'Vence',
  land_area: 1300,
  bedrooms_count: 4,
  bathrooms_count: null,
  energy_rating: 'C',
  ges_rating: null,
  outdoor_spaces: [],
  parking_types: [],
  heating_type: null,
  construction_year: null,
  general_condition: null,
  exposure: null,
  listing_features: [],
  listing_description: 'Belle maison.',
  listing_published_at: null,
  listing_url: 'https://www.seloger.com/annonces/achat/maison/vence-06/123456.htm',
  photo_urls: ['https://mms.seloger.com/1.jpg'],
  price: 740_000,
  price_drop_amount: null,
  first_seen_on: null,
  created_at: '2026-10-01T08:00:00Z',
};

beforeEach(() => {
  state.profile = { id: 'u-1', agency_id: 'a-1', removed_at: null };
  state.rows = {};
  state.failing = null;
  server.reset();
});

const filters = () =>
  server.calls.filter((call) => call.method === 'eq').map((call) => call.args.join('='));

describe('loadPropertySheet — la fiche complète, pour le conseiller seul', () => {
  it('un concurrent de l’agence : sa fiche, lue dans l’agence du conseiller, rien d’écrit', async () => {
    state.rows = { comparables: competitor, listing_observations: [] };
    const result = await loadPropertySheet({ kind: 'competitor', id: ID });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sheet.description).toBe('Belle maison.');
    expect(result.sheet.onlineUrl).toContain('seloger.com');
    expect(filters()).toContain('agency_id=a-1');
    expect(server.writes()).toEqual([]);
  });

  it('une autre agence (aucune ligne) : introuvable', async () => {
    const result = await loadPropertySheet({ kind: 'competitor', id: ID });
    expect(result).toEqual({ ok: false, error: SHEET_NOT_FOUND });
  });

  it('un membre retiré, ou sans profil, ne lit rien', async () => {
    state.profile = { id: 'u-1', agency_id: 'a-1', removed_at: '2026-11-01T00:00:00Z' };
    expect(await loadPropertySheet({ kind: 'project', id: PROJECT })).toEqual({
      ok: false,
      error: SHEET_NOT_FOUND,
    });
    expect(server.calls).toHaveLength(0);
    state.profile = null;
    expect((await loadPropertySheet({ kind: 'project', id: PROJECT })).ok).toBe(false);
  });

  it('une demande mal formée est refusée avant toute lecture', async () => {
    const result = await loadPropertySheet({ kind: 'competitor', id: 'pas-un-identifiant' });
    expect(result).toEqual({ ok: false, error: SHEET_NOT_FOUND });
    expect(server.calls).toHaveLength(0);
  });

  it('un mandat : ses photos signées, son prix de commercialisation, aucun lien', async () => {
    state.rows = {
      subject_properties: {
        ...competitor,
        has_pool: true,
        has_elevator: null,
        floor: null,
        strengths: ['Vue mer'],
        description: 'Maison familiale.',
        photo_urls: ['a-1/p/1.jpg'],
      },
      project_meeting_conclusions: { commercialization_price: 713_000 },
    };
    const result = await loadPropertySheet({ kind: 'project', id: PROJECT });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sheet.photos).toEqual(['https://storage.example.com/a-1/p/1.jpg']);
    expect(result.sheet.price).toBe(713_000);
    expect(result.sheet.onlineUrl).toBeNull();
    expect(result.sheet.strengths).toEqual(['Vue mer']);
  });

  it('une lecture en échec n’est jamais « introuvable » : elle le dit (M98)', async () => {
    state.failing = 'comparables';
    expect(await loadPropertySheet({ kind: 'competitor', id: ID })).toEqual({
      ok: false,
      error: SHEET_UNREADABLE,
    });
  });

  it('un bien d’une sélection, annonce du marché : la sélection de l’agence, lue telle quelle', async () => {
    state.rows = {
      buyer_selection_items: {
        source: 'listing',
        reference: 'https://www.bienici.com/annonce/vente/vence/maison/5pieces/ag-1',
        label: 'Maison · 5 pièces · 150 m² · Vence',
        listed_price: 735_000,
        price_seen_on: '2026-11-10',
        imported: { listingDescription: 'Lu sur la page.', photoUrls: [] },
        snapshot: null,
      },
    };
    const result = await loadPropertySheet({ kind: 'selection-item', id: ID });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sheet.description).toBe('Lu sur la page.');
    expect(result.sheet.originLabel).toBe('Marché · Bien’ici');
    expect(filters()).toContain('agency_id=a-1');
  });
});
