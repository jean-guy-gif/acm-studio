import { beforeEach, describe, expect, it, vi } from 'vitest';

import { candidateSnapshot } from '@/features/competitor-search/services/search-snapshot';
import type { CompetitorCandidate } from '@/features/competitor-search/types';
import { fakeSupabase, type FakeCall, type FakeResponse } from '@/test-fixtures/fake-supabase';

// Mission 101 — « retenu, import en attente » : les actions serveur sont appelées pour de vrai,
// avec un client Supabase factice. On vérifie ce qui est écrit, pour qui, et ce qu'un appel
// refusé n'écrit pas.

const state = vi.hoisted(() => ({
  profile: null as Record<string, unknown> | null,
  respond: (() => ({})) as (table: string, method: string) => FakeResponse,
  promoted: 0,
}));

const tableOf = (calls: FakeCall[]) =>
  String([...calls].reverse().find((call) => call.method === 'from')?.args[0] ?? '');
const methodOf = (calls: FakeCall[]) => {
  const chain = calls
    .slice(Math.max(calls.map((call) => call.method).lastIndexOf('from'), 0))
    .map((call) => call.method);
  return ['insert', 'update', 'upsert', 'delete', 'select'].find((m) => chain.includes(m)) ?? '';
};
const server = fakeSupabase((calls) => state.respond(tableOf(calls), methodOf(calls)));
const service = fakeSupabase(() => ({}));

vi.mock('@/lib/auth/get-profile', () => ({ getProfile: async () => state.profile }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => server.client }));
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: () => service.client }));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('@/features/projects/services/project-readiness', () => ({
  maybePromoteToReady: async () => {
    state.promoted += 1;
    return false;
  },
}));

const AGENCY = '11111111-1111-4111-8111-111111111111';
const PROJECT = '33333333-3333-4333-8333-333333333333';
const PENDING = '44444444-4444-4444-8444-444444444444';
const URL = 'https://www.seloger.com/annonces/achat/appartement/cagnes-sur-mer-06/123.htm';
const card: CompetitorCandidate = {
  key: '123',
  url: URL,
  title: 'Appartement 3 pièces',
  price: 336_000,
  surfaceArea: 65,
  roomsCount: 3,
  propertyType: 'apartment',
  pricePerSqm: null,
  landArea: null,
  city: 'Cagnes-sur-Mer',
  photoUrls: ['https://v.seloger.com/a.jpg'],
  isNewBuild: false,
};
const snapshot = candidateSnapshot(card);

// La base telle que l'action la trouve : le dossier, la ligne en attente, pas de doublon.
function database(overrides: {
  project?: unknown;
  pending?: unknown;
  existing?: unknown;
  insertError?: unknown;
}) {
  state.respond = (table, method) => {
    if (table === 'projects') {
      return { data: 'project' in overrides ? overrides.project : { id: PROJECT } };
    }
    if (table === 'pending_competitor_imports' && method === 'select') {
      return { data: 'pending' in overrides ? overrides.pending : { id: PENDING, snapshot } };
    }
    if (table === 'pending_competitor_imports' && method === 'delete') {
      return { data: [{ id: PENDING }] };
    }
    if (table === 'comparables' && method === 'insert') {
      return { error: overrides.insertError ?? null };
    }
    if (table === 'comparables') {
      return { data: overrides.existing ?? null };
    }
    return {};
  };
}
const inserted = () =>
  server.calls.find((call, index) => {
    const from = server.calls
      .slice(0, index)
      .reverse()
      .find((c) => c.method === 'from');
    return call.method === 'insert' && from?.args[0] === 'comparables';
  })?.args[0] as Record<string, unknown> | undefined;

beforeEach(() => {
  server.reset();
  service.reset();
  state.profile = { id: 'u-1', agency_id: AGENCY, removed_at: null };
  state.promoted = 0;
  database({});
});

describe('registerPendingImports', () => {
  it('enregistre chaque bien retenu AVANT toute lecture, pour l’agence et l’auteur de la session', async () => {
    const { registerPendingImports } =
      await import('@/features/competitor-search/actions/pending-imports');
    const result = await registerPendingImports(PROJECT, [{ url: URL, snapshot }]);
    expect(result).toEqual({ ok: true });
    expect(server.writes()).toEqual(['upsert pending_competitor_imports']);
    const rows = server.calls.find((call) => call.method === 'upsert')?.args[0] as unknown[];
    expect(rows).toEqual([
      expect.objectContaining({
        agency_id: AGENCY,
        project_id: PROJECT,
        created_by: 'u-1',
        listing_url: URL,
        listing_host: 'www.seloger.com',
        snapshot,
      }),
    ]);
  });

  it('refuse sans session, un membre retiré, le dossier d’une autre agence, une charge mal formée', async () => {
    const { registerPendingImports } =
      await import('@/features/competitor-search/actions/pending-imports');
    const entries = [{ url: URL, snapshot }];
    state.profile = null;
    expect((await registerPendingImports(PROJECT, entries)).ok).toBe(false);
    state.profile = { id: 'u-1', agency_id: AGENCY, removed_at: '2026-10-01' };
    expect((await registerPendingImports(PROJECT, entries)).ok).toBe(false);
    state.profile = { id: 'u-1', agency_id: AGENCY, removed_at: null };
    database({ project: null });
    expect((await registerPendingImports(PROJECT, entries)).ok).toBe(false);
    database({});
    for (const bad of [null, [], 'texte', [{ url: 'javascript:alert(1)', snapshot }]]) {
      expect((await registerPendingImports(PROJECT, bad)).ok).toBe(false);
    }
    expect(
      (await registerPendingImports(PROJECT, [{ url: URL, snapshot: { source: 'x' } }])).ok,
    ).toBe(false);
    expect(server.writes()).toEqual([]);
  });
});

describe('createCompetitorFromSearch', () => {
  it('crée le concurrent depuis les données RELUES EN BASE, retenu, marqué et à vérifier', async () => {
    const { createCompetitorFromSearch } =
      await import('@/features/competitor-search/actions/pending-imports');
    expect(await createCompetitorFromSearch(PROJECT, URL, false)).toEqual({
      ok: true,
      retained: true,
    });
    expect(inserted()).toMatchObject({
      project_id: PROJECT,
      agency_id: AGENCY,
      price: 336000,
      surface_area: 65,
      rooms_count: 3,
      city: 'Cagnes-sur-Mer',
      property_type: 'apartment',
      listing_url: URL,
      photo_urls: ['https://v.seloger.com/a.jpg'],
      imported_from_search: true,
      listing_withdrawn: false,
      is_selected: true,
      listing_description: null,
    });
    // Tout ce qui est rempli reste à relire, plus les chambres (vides), le vendeur et l'exclusivité.
    expect(inserted()?.fields_to_verify).toEqual([
      'title',
      'city',
      'surface_area',
      'rooms_count',
      'bedrooms_count',
      'price',
      'sold_by',
      'exclusivity',
    ]);
    // Le bien n'est plus en attente, et le dossier peut basculer « prêt ».
    expect(server.writes()).toEqual(['insert comparables', 'delete pending_competitor_imports']);
    expect(state.promoted).toBe(1);
  });

  it('une annonce retirée entre avec sa mention, NON retenue, sans basculer le dossier', async () => {
    const { createCompetitorFromSearch } =
      await import('@/features/competitor-search/actions/pending-imports');
    expect(await createCompetitorFromSearch(PROJECT, URL, true)).toEqual({
      ok: true,
      retained: false,
    });
    expect(inserted()).toMatchObject({
      imported_from_search: true,
      listing_withdrawn: true,
      is_selected: false,
    });
    expect(state.promoted).toBe(0);
  });

  it('sans prix dans la recherche : rien n’est créé, le bien RESTE en attente avec sa cause', async () => {
    const { createCompetitorFromSearch } =
      await import('@/features/competitor-search/actions/pending-imports');
    database({ pending: { id: PENDING, snapshot: { ...snapshot, price: null } } });
    expect(await createCompetitorFromSearch(PROJECT, URL, false)).toMatchObject({
      ok: false,
      code: 'no_price',
    });
    expect(server.writes()).toEqual(['update pending_competitor_imports']);
    expect(server.calls.find((call) => call.method === 'update')?.args[0]).toMatchObject({
      last_cause: 'no_price',
    });
  });

  it('une lecture coupée a déjà créé le concurrent : pas de doublon, l’attente est levée', async () => {
    const { createCompetitorFromSearch } =
      await import('@/features/competitor-search/actions/pending-imports');
    database({ existing: { id: 'déjà-là', is_selected: true } });
    expect(await createCompetitorFromSearch(PROJECT, URL, false)).toEqual({
      ok: true,
      retained: true,
    });
    expect(server.writes()).toEqual(['delete pending_competitor_imports']);
  });

  it('l’écriture échoue : le bien reste en attente (sa ligne n’est pas retirée)', async () => {
    const { createCompetitorFromSearch } =
      await import('@/features/competitor-search/actions/pending-imports');
    database({ insertError: { code: '42501' } });
    expect((await createCompetitorFromSearch(PROJECT, URL, false)).ok).toBe(false);
    expect(server.writes()).not.toContain('delete pending_competitor_imports');
  });

  it('sans ligne en attente (bien jamais retenu) ou sans session : rien', async () => {
    const { createCompetitorFromSearch } =
      await import('@/features/competitor-search/actions/pending-imports');
    database({ pending: null });
    expect((await createCompetitorFromSearch(PROJECT, URL, false)).ok).toBe(false);
    state.profile = null;
    expect((await createCompetitorFromSearch(PROJECT, URL, false)).ok).toBe(false);
    expect(server.writes()).toEqual([]);
  });
});

describe('recordImportReadFailure', () => {
  it('note la cause sur la ligne en attente et au journal : le portail, jamais l’adresse', async () => {
    const { recordImportReadFailure } =
      await import('@/features/competitor-search/actions/pending-imports');
    await recordImportReadFailure(PROJECT, URL, 'robots', 1);
    expect(server.writes()).toEqual(['update pending_competitor_imports']);
    expect(server.calls.find((call) => call.method === 'update')?.args[0]).toMatchObject({
      last_cause: 'robots',
      attempts: 1,
    });
    const journal = service.calls.find((call) => call.method === 'insert')?.args[0];
    expect(journal).toMatchObject({
      source: 'import',
      message: 'seloger.com · robots',
      page: '/builder/[id]/comparables/find',
      agency_id: AGENCY,
      user_id: 'u-1',
    });
    expect(JSON.stringify(journal)).not.toMatch(/annonces|cagnes|123\.htm/);
  });

  it('ignore une cause hors liste, et un appel sans session', async () => {
    const { recordImportReadFailure } =
      await import('@/features/competitor-search/actions/pending-imports');
    await recordImportReadFailure(PROJECT, URL, 'inventée' as never, 1);
    state.profile = null;
    await recordImportReadFailure(PROJECT, URL, 'robots', 1);
    expect(server.writes()).toEqual([]);
    expect(service.writes()).toEqual([]);
  });
});

describe('dismissPendingImport', () => {
  it('retire la ligne en attente du dossier de l’agence, et elle seule', async () => {
    const { dismissPendingImport } =
      await import('@/features/competitor-search/actions/pending-imports');
    expect(await dismissPendingImport(PROJECT, PENDING)).toEqual({ ok: true });
    expect(server.writes()).toEqual(['delete pending_competitor_imports']);
    expect(server.calls).toContainEqual({ method: 'eq', args: ['agency_id', AGENCY] });
    expect((await dismissPendingImport(PROJECT, 'pas-un-id')).ok).toBe(false);
  });
});
