import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_SEARCH_SETTINGS } from '@/features/competitor-search/services/search-settings';
import {
  BUDGET_REACHED_LABEL,
  BUDGET_UNREADABLE_MESSAGE,
  searchBudget,
} from '@/features/search-budget/services/budget';

// Mission 100 — ne jamais dépenser sans limite : l'action « Chercher les concurrents » est
// appelée pour de vrai ; seuls l'API Stream Estate (`fetch`), la base et les services publics de
// géographie sont remplacés. On compte les appels payants qui partent, et ce qui est enregistré.

const state = vi.hoisted(() => ({
  profile: null as Record<string, unknown> | null,
  budget: null as unknown,
  usage: [] as unknown[],
  errors: [] as string[],
  // Mission 105 — ce que la base accepte de réserver (null : tout ce qui est demandé).
  grant: null as number | null,
  reserved: [] as number[],
}));

vi.mock('@/features/competitor-search/services/stream-estate-config', () => ({
  streamEstateApiKey: () => 'clé-de-test',
}));
vi.mock('@/features/projects/queries/get-project', () => ({
  getProject: async () => ({ id: PROJECT, is_example: false }),
}));
vi.mock('@/lib/auth/get-profile', () => ({ getProfile: async () => state.profile }));
vi.mock('@/features/search-budget/queries/get-search-budget', () => ({
  getSearchBudget: async () => state.budget,
}));
// Mission 105 — la réservation du budget (en base, compteur verrouillé) : la base accorde ce qui
// reste ; après l'appel, la réservation prend le nombre facturé, ou disparaît.
vi.mock('@/features/search-budget/services/reserve-budget', () => ({
  reserveSearchBudget: async (input: { wanted: number; agencyId: string; userId: string }) => {
    const adverts = Math.min(input.wanted, state.grant ?? input.wanted);
    if (adverts <= 0) return { ok: false, reason: 'reached' };
    state.reserved.push(adverts);
    return { ok: true, reservationId: 'r-1', adverts };
  },
  settleSearchBudget: async (_id: string, billed: number) => {
    if (billed > 0) state.usage.push({ adverts: billed });
  },
}));
vi.mock('@/lib/app-errors/report-server-error', () => ({
  reportServerError: async (scope: string) => {
    state.errors.push(scope);
  },
}));
vi.mock('@/features/competitor-search/queries/load-search-criteria', () => ({
  loadSearchCriteria: async () => ({
    ok: true,
    profileId: 'u-advisor',
    address: null,
    settings: DEFAULT_SEARCH_SETTINGS,
    criteria: {
      city: 'Antibes',
      postalCode: '06600',
      propertyType: 'Appartement',
      district: null,
      surfaceArea: 65,
      roomsCount: 3,
      advisorPriceMin: 300_000,
      advisorPriceMax: 350_000,
    },
  }),
}));
vi.mock('@/features/competitor-search/services/fetch-geo', () => ({
  resolveCommune: async () => ({
    ok: true,
    code: '06004',
    name: 'Antibes',
    display: 'Antibes',
    centre: { lat: 43.58, lon: 7.12 },
    departement: '06',
    arrondissement: null,
  }),
  geocodeSubject: async () => ({ ok: false, sector: { status: 'neutral', reason: 'no_address' } }),
  fetchDepartmentCommunes: async () => null,
}));

const AGENCY = '11111111-1111-4111-8111-111111111111';
const PROJECT = '33333333-3333-4333-8333-333333333333';

// L'API factice : chaque appel rend autant d'annonces (illisibles : aucune n'est gardée) que la
// page en demande. `pages` : les tailles demandées, dans l'ordre.
const pages: number[] = [];
function stubApi(status = 200): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const size = Number(new URL(url).searchParams.get('itemsPerPage'));
      pages.push(size);
      if (status !== 200) return new Response('{}', { status });
      return Response.json({
        'hydra:member': Array.from({ length: size }, () => ({})),
        'hydra:totalItems': 1000,
      });
    }),
  );
}

async function search() {
  const { searchStreamEstate } =
    await import('@/features/competitor-search/actions/search-stream-estate');
  return searchStreamEstate(PROJECT);
}

beforeEach(() => {
  pages.length = 0;
  state.usage = [];
  state.errors = [];
  state.grant = null;
  state.reserved = [];
  state.profile = { id: 'u-advisor', agency_id: AGENCY, role: 'advisor', removed_at: null };
  state.budget = { ok: true, budget: searchBudget(0, null) };
  stubApi();
});
afterEach(() => vi.unstubAllGlobals());

describe('« Chercher les concurrents » et le budget du mois', () => {
  it('plafond atteint : aucun appel ne part, rien n’est compté, et l’écran le dit', async () => {
    state.budget = { ok: true, budget: searchBudget(3000, null) };
    const result = await search();
    expect(result.ok).toBe(false);
    expect(result.ok ? '' : result.error).toContain(BUDGET_REACHED_LABEL);
    expect(pages).toEqual([]);
    expect(state.usage).toEqual([]);
  });

  it('plafond à 0 € : aucun appel dès la première recherche', async () => {
    state.budget = { ok: true, budget: searchBudget(0, 0) };
    expect((await search()).ok).toBe(false);
    expect(pages).toEqual([]);
  });

  it('budget illisible : aucun appel — une lecture en échec n’est pas un budget libre', async () => {
    state.budget = { ok: false };
    expect(await search()).toEqual({ ok: false, error: BUDGET_UNREADABLE_MESSAGE });
    expect(pages).toEqual([]);
  });

  it('sans session, ou membre retiré : aucun appel', async () => {
    for (const profile of [null, { id: 'u', agency_id: AGENCY, removed_at: '2026-10-01' }]) {
      state.profile = profile;
      expect((await search()).ok).toBe(false);
    }
    expect(pages).toEqual([]);
  });

  it('budget libre : la recherche s’arrête à 60 annonces, toutes comptées pour l’agence', async () => {
    const result = await search();
    const billed = pages.reduce((sum, size) => sum + size, 0);
    expect(billed).toBe(60);
    expect(result.ok && result.billed).toBe(60);
    expect(state.reserved).toEqual([60]);
    expect(state.usage).toEqual([{ adverts: 60 }]);
  });

  // Mission 105 — la base n'accorde que ce qui reste, compteur verrouillé : la recherche ne
  // facture jamais plus que ce qui lui a été réservé, et rien ne part sans réservation.
  it('la recherche ne facture jamais plus que sa réservation', async () => {
    state.grant = 20;
    await search();
    const billed = pages.reduce((sum, size) => sum + size, 0);
    expect(billed).toBeGreaterThan(0);
    expect(billed).toBeLessThanOrEqual(20);
    expect(state.usage).toEqual([{ adverts: billed }]);
  });

  it('plus rien à réserver (une autre recherche vient de tout prendre) : aucun appel', async () => {
    state.grant = 0;
    const result = await search();
    expect(result.ok ? '' : result.error).toContain(BUDGET_REACHED_LABEL);
    expect(pages).toEqual([]);
    expect(state.usage).toEqual([]);
  });

  it('il reste 15 centimes : la recherche ne facture pas une annonce de plus', async () => {
    state.budget = { ok: true, budget: searchBudget(2985, null) };
    await search();
    const billed = pages.reduce((sum, size) => sum + size, 0);
    expect(billed).toBeGreaterThan(0);
    expect(billed).toBeLessThanOrEqual(15);
    expect(state.usage).toEqual([{ adverts: billed }]);
  });

  it('l’API tombe en panne : rien n’est compté, et la panne entre au journal des erreurs', async () => {
    stubApi(502);
    expect((await search()).ok).toBe(false);
    expect(state.usage).toEqual([]);
    expect(state.errors).toContain('searchStreamEstate');
  });

  it('l’API refuse la clé : la panne entre au journal des erreurs', async () => {
    stubApi(401);
    const result = await search();
    expect(result.ok ? '' : result.error).toContain('refusée par le fournisseur des annonces');
    // Le détail technique part au journal, pas à l'écran.
    expect(result.ok ? '' : result.error).not.toMatch(/clé|console|401/);
    expect(state.errors).toEqual(['searchStreamEstate']);
  });
});
