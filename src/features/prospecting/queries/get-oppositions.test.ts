import { describe, expect, it, vi } from 'vitest';

import { fakeSupabase } from '@/test-fixtures/fake-supabase';

vi.mock('server-only', () => ({}));

// Mission 108 — la liste « Ne plus solliciter » ne dépend plus d'une lecture plafonnée à 1 000
// lignes : elle se lit par pages, jusqu'à la dernière.
describe('getOppositions', () => {
  it('lit toutes les pages : une opposition au-delà de la millième tient toujours', async () => {
    const { getOppositions, OPPOSITIONS_PAGE_SIZE } =
      await import('@/features/prospecting/queries/get-oppositions');
    const row = (index: number) => ({
      address_key: `${index} rue du test antibes`,
      listing_key: null,
      requested_at: '2026-10-19T09:00:00.000Z',
    });
    let page = 0;
    const supabase = fakeSupabase(() => {
      page += 1;
      return page === 1
        ? { data: Array.from({ length: OPPOSITIONS_PAGE_SIZE }, (_, index) => row(index + 1)) }
        : { data: [row(1001)] };
    });
    const oppositions = await getOppositions(supabase.client as never, 'agency');
    expect(page).toBe(2);
    expect(oppositions.addresses.size).toBe(1001);
    expect(
      supabase.calls.filter((call) => call.method === 'range').map((call) => call.args),
    ).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });

  it('une page en échec n’est jamais une liste vide', async () => {
    const { getOppositions } = await import('@/features/prospecting/queries/get-oppositions');
    const supabase = fakeSupabase(() => ({ error: { message: 'down' } }));
    await expect(getOppositions(supabase.client as never, 'agency')).rejects.toThrow();
  });
});
