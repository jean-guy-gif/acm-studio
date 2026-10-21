import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeSupabase } from '@/test-fixtures/fake-supabase';

// Mission 104 — « Non » à « Un sérieux concurrent ? » n'enregistre jamais de prix : la base
// figerait la devinette et le prix révélé (M92, M96) d'un concurrent écarté par le vendeur.

// Mission 112 — un concurrent retenu et montré au Live.
const server = fakeSupabase(() => ({
  data: { id: 'x', is_selected: true, excluded_from_live: false },
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/auth/get-profile', () => ({
  getProfile: async () => ({ id: 'u-1', agency_id: 'a-1', removed_at: null }),
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => server.client }));

import { writeLiveComparableResponse } from '@/features/live-seller/services/write-live-comparable-response';

const form = (fields: Record<string, string>): FormData => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};
const written = () =>
  server.calls.find((call) => call.method === 'update')?.args[0] as Record<string, unknown>;

beforeEach(() => server.reset());

describe('« Non » avec un prix tapé', () => {
  it('n’enregistre ni la devinette de prix ni celle de durée', async () => {
    const result = await writeLiveComparableResponse(
      'p-1',
      'c-1',
      form({
        seller_serious_competitor: 'no',
        seller_estimated_listing_price: '320000',
        seller_estimated_days_on_market: '45',
      }),
    );
    expect(result).toEqual({ ok: true });
    const patch = written();
    expect(patch.seller_serious_competitor).toBe('no');
    expect(patch).not.toHaveProperty('seller_estimated_listing_price');
    expect(patch).not.toHaveProperty('seller_estimated_days_on_market');
  });

  it('« Oui » avec un prix : la devinette est enregistrée, comme avant', async () => {
    await writeLiveComparableResponse(
      'p-1',
      'c-1',
      form({ seller_serious_competitor: 'yes', seller_estimated_listing_price: '320000' }),
    );
    expect(written()).toMatchObject({
      seller_serious_competitor: 'yes',
      seller_estimated_listing_price: 320000,
    });
  });
});
