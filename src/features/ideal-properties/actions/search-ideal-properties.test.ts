import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeSupabase } from '@/test-fixtures/fake-supabase';

// Mission 118 — la recherche du marché pour un acquéreur : refusée sans profil, sur une fiche
// archivée ou d'une autre agence, sur une fiche sans type unique ; en démonstration, aucun appel
// réseau, aucun budget lu ni réservé, et les biens reviennent rangés en trois catégories.
const state = vi.hoisted(() => ({
  profile: null as null | { id: string; agency_id: string; removed_at: string | null },
  demo: true,
  buyer: null as Record<string, unknown> | null,
  budgetReads: 0,
  reservations: 0,
  // Lancement, mission 9 — ce que l'action demande au classement.
  ranked: [] as { criteria: string[]; demo: boolean; photos?: { max: number; pick: unknown } }[],
}));
vi.mock('@/features/soft-ranking/server/rank-listings', () => ({
  rankListings: async (input: {
    criteria: string[];
    demo: boolean;
    photos?: { max: number; pick: unknown };
  }) => {
    state.ranked.push(input);
    return null;
  },
}));
vi.mock('@/lib/auth/get-profile', () => ({ getProfile: async () => state.profile }));
vi.mock('@/features/demo/services/is-demo-agency', () => ({
  isDemoAgency: async () => state.demo,
}));
vi.mock('@/features/search-budget/queries/get-search-budget', () => ({
  getSearchBudget: async () => {
    state.budgetReads += 1;
    return { ok: true, budget: { reached: false, adverts: 0, capCents: 3000, percent: 0 } };
  },
}));
vi.mock('@/features/search-budget/services/reserve-budget', () => ({
  reserveSearchBudget: async () => {
    state.reservations += 1;
    return { ok: true, reservationId: 'r', adverts: 60 };
  },
  settleSearchBudget: async () => undefined,
}));
vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: () => fakeSupabase(() => ({ data: state.buyer })).client,
}));

const fetchSpy = vi.fn();
vi.stubGlobal('fetch', fetchSpy);

const { searchIdealProperties } =
  await import('@/features/ideal-properties/actions/search-ideal-properties');

const BUYER = '11111111-1111-4111-8111-111111111111';
const keller = {
  id: BUYER,
  agency_id: 'agency-a',
  advisor_id: 'advisor-1',
  created_at: 'x',
  updated_at: 'x',
  archived_at: null,
  name: 'Famille Keller',
  phone: null,
  email: null,
  purpose: null,
  timeline: null,
  notes: null,
  property_types: ['house'],
  cities: ['Mougins', 'Mouans-Sartoux', 'Valbonne'],
  budget_ideal: 1_500_000,
  budget_max: 1_650_000,
  rooms_min: 6,
  bedrooms_min: 4,
  surface_min: 180,
  outdoor: true,
  parking: true,
  pool: true,
  floor_min: null,
  elevator: null,
  energy_rating_max: null,
  works_accepted: false,
  must_have: ['pool', 'cities'],
  deal_breakers: null,
  status: 'searching',
  status_changed_at: 'x',
  demo: true,
};

describe('searchIdealProperties', () => {
  beforeEach(() => {
    state.profile = { id: 'advisor-1', agency_id: 'agency-a', removed_at: null };
    state.demo = true;
    state.buyer = keller;
    state.budgetReads = 0;
    state.reservations = 0;
    state.ranked = [];
    fetchSpy.mockReset();
    vi.unstubAllEnvs();
  });

  it('sans profil, ou fiche introuvable (archivée, autre agence) : refusée, aucun appel', async () => {
    state.profile = null;
    expect((await searchIdealProperties(BUYER)).ok).toBe(false);
    state.profile = { id: 'advisor-1', agency_id: 'agency-a', removed_at: null };
    state.buyer = null;
    expect(await searchIdealProperties(BUYER)).toEqual({
      ok: false,
      error: 'Cette fiche acquéreur n’existe plus.',
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('deux types sur la fiche : la recherche le dit, aucun appel', async () => {
    state.buyer = { ...keller, property_types: ['apartment', 'house'] };
    const result = await searchIdealProperties(BUYER);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/un type à la fois/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('en démonstration : simulée, sans appel réseau, sans budget lu ni réservé, 0 annonce facturée, trois catégories', async () => {
    const result = await searchIdealProperties(BUYER);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(state.budgetReads).toBe(0);
    expect(state.reservations).toBe(0);
    expect(result.billed).toBe(0);
    expect(result.communes).toEqual(['Mougins', 'Mouans-Sartoux', 'Valbonne']);
    expect(result.portal.candidates.length).toBeGreaterThan(0);
    const total =
      result.categorized.byCategory.strong.length +
      result.categorized.byCategory.compromise.length +
      result.categorized.byCategory.explore.length +
      result.categorized.excluded.count;
    expect(total).toBe(result.portal.candidates.length);
    expect(result.seenOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Tous les biens reçus sont des maisons des communes demandées.
    for (const candidate of result.portal.candidates) {
      expect(candidate.propertyType).toBe('house');
      expect(['Mougins', 'Mouans-Sartoux', 'Valbonne']).toContain(candidate.city);
    }
  }, 20_000);

  // Lancement, mission 9 — la lecture des photos est éteinte : c'est la garde de la page de
  // confidentialité. L'action ne demande des photos au classement que si l'interrupteur le dit.
  describe('les photos des mieux classés', () => {
    const withSoft = { ...keller, soft_criteria: [{ key: 'vue', words: 'une vue dégagée' }] };

    it('la démo sur l’essai et dans les tests : cinq biens au plus, simulés', async () => {
      state.buyer = withSoft;
      expect((await searchIdealProperties(BUYER)).ok).toBe(true);
      expect(state.ranked).toHaveLength(1);
      expect(state.ranked[0]!.criteria).toEqual(['vue']);
      expect(state.ranked[0]!.photos?.max).toBe(5);
      expect(typeof state.ranked[0]!.photos?.pick).toBe('function');
    });

    it('en production, interrupteur éteint : aucune photo demandée, démo comprise', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('VERCEL_ENV', 'production');
      state.buyer = withSoft;
      expect((await searchIdealProperties(BUYER)).ok).toBe(true);
      expect(state.ranked).toHaveLength(1);
      expect(state.ranked[0]!.photos).toBeUndefined();
    });

    it('l’action est le seul endroit qui demande des photos, et seulement par l’interrupteur', async () => {
      const { readFileSync } = await import('node:fs');
      const action = readFileSync(
        'src/features/ideal-properties/actions/search-ideal-properties.ts',
        'utf8',
      );
      expect(action).toMatch(/photos: photosForSearch\(\{ demo, resumed: resumeFrom != null \}\)/);
      expect(action.match(/photos:/g)).toHaveLength(1);
      // La veille de nuit ne lit aucune photo.
      const watch = readFileSync('src/features/buyer-watch/server/run-buyer-watch.ts', 'utf8');
      expect(watch).not.toMatch(/photos:|photosForSearch|listingPhotosRead/);
    });
  });
});
