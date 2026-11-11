import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeSupabase } from '@/test-fixtures/fake-supabase';

const URL = 'https://www.seloger.com/annonces/achat/maison/vence-06/123456.htm';
const TRAP_TITLE = 'EXCLUSIVITÉ Agence Dupont 12 rue des Lilas';

const state = vi.hoisted(() => ({
  revealed: true,
  demo: false,
  competitor: null as Record<string, unknown> | null,
}));

const server = fakeSupabase((calls) => {
  const table = [...calls].reverse().find((call) => call.method === 'from')?.args[0];
  if (table === 'comparables') return { data: state.competitor };
  if (table === 'competitor_listing_copies')
    return {
      data: {
        captured_at: '2026-10-21T08:00:00Z',
        price: 760_000,
        photo_urls: ['https://photos.example.com/1.jpg'],
        facts: { surfaceArea: 135, listingText: TRAP_TITLE },
      },
    };
  if (table === 'listing_observations')
    return { data: [{ observed_on: '2026-11-10', price: 740_000 }] };
  return {};
});

vi.mock('@/lib/auth/get-profile', () => ({
  getProfile: async () => ({ id: 'u-1', agency_id: 'a-1', removed_at: null }),
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => server.client }));
vi.mock('@/features/demo/services/is-demo-agency', () => ({
  isDemoAgency: async () => state.demo,
}));
vi.mock('@/features/live-seller/services/load-live-presentation', () => ({
  loadLivePresentation: async () => ({
    live: {
      direct: false,
      comparables: [
        {
          id: 'c-1',
          title: TRAP_TITLE,
          listingUrl: URL,
          photoUrls: ['https://photos.example.com/now.jpg'],
          response: state.revealed
            ? { seller_estimated_listing_price: 700_000, seller_serious_competitor: 'yes' }
            : null,
        },
      ],
    },
  }),
}));

import { openLiveListing } from '@/features/live-seller/actions/open-live-listing';

beforeEach(() => {
  server.reset();
  state.revealed = true;
  state.demo = false;
  state.competitor = {
    listing_url: URL,
    listing_gone_at: null,
    listing_withdrawn: false,
    updated_at: '2026-11-01T00:00:00Z',
    price: 740_000,
    photo_urls: [],
    surface_area: 135,
    land_area: null,
    rooms_count: 5,
    bedrooms_count: 4,
    energy_rating: 'C',
    outdoor_spaces: [],
    parking_types: [],
  };
});

// Mission 152 (Jean-Guy, 11/11) — « Voir l'annonce » ouvre l'annonce sur son portail ; la copie
// enregistrée seulement si l'annonce n'est plus en ligne. Rien avant la révélation du prix.
describe('« Voir l’annonce » au Live', () => {
  it('avant la révélation du prix : rien, ni lien ni copie, rien lu en base', async () => {
    state.revealed = false;
    expect(await openLiveListing('p-1', 'c-1')).toEqual({ ok: false, error: 'not_revealed' });
    expect(server.calls.some((call) => call.method === 'from')).toBe(false);
  });

  it('un concurrent qui n’est pas au Live : refusé', async () => {
    expect(await openLiveListing('p-1', 'autre')).toEqual({ ok: false, error: 'unavailable' });
  });

  it('prix dévoilé, annonce en ligne : son adresse, pour un nouvel onglet', async () => {
    expect(await openLiveListing('p-1', 'c-1')).toEqual({ ok: true, kind: 'online', url: URL });
    expect(server.writes()).toEqual([]);
  });

  it('annonce retirée : la copie, sans le lien ni le titre', async () => {
    state.competitor = { ...state.competitor, listing_gone_at: '2026-11-08T09:00:00Z' };
    const result = await openLiveListing('p-1', 'c-1');
    expect(result).toMatchObject({
      ok: true,
      kind: 'copy',
      copy: {
        goneSince: '2026-11-08',
        portal: 'SeLoger',
        recordedOn: '2026-10-21',
        price: 740_000,
      },
    });
    const shown = JSON.stringify(result);
    expect(shown).not.toContain('seloger.com');
    expect(shown).not.toContain('Dupont');
    expect(server.writes()).toEqual([]);
  });

  it('dans l’agence de démonstration : la copie, jamais un portail', async () => {
    state.demo = true;
    expect(await openLiveListing('p-1', 'c-1')).toMatchObject({
      ok: true,
      kind: 'copy',
      copy: { goneSince: null },
    });
  });

  it('un concurrent saisi à la main, sans annonce : pas de bouton à servir', async () => {
    state.competitor = { ...state.competitor, listing_url: null };
    expect(await openLiveListing('p-1', 'c-1')).toEqual({ ok: false, error: 'no_listing' });
  });
});
