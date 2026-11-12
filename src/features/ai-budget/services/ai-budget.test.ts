import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeSupabase, type FakeResponse } from '@/test-fixtures/fake-supabase';

// Mission 151 (partie B) — la veille de nuit ne prend que la moitié du budget d'IA de l'agence
// (Jean-Guy, 12/11).

const state = vi.hoisted(() => ({ response: {} as FakeResponse }));
let fake = fakeSupabase(() => state.response);

vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: () => fake.client }));
vi.mock('@/lib/app-errors/report-server-error', () => ({
  reportServerError: async () => undefined,
}));

const { nightRankingRoom } = await import('@/features/ai-budget/services/ai-budget');

beforeEach(() => {
  fake = fakeSupabase(() => state.response);
});

describe('nightRankingRoom', () => {
  // Plafond de 10 € : la moitié vaut 500 000 millièmes de centime.
  const room = (wantedMillicents: number) =>
    nightRankingRoom({ agencyId: 'agency-a', capCents: 1000, wantedMillicents });

  it('compte le seul classement de nuit (sans auteur) de l’agence, ce mois', async () => {
    state.response = { data: [{ cost_millicents: 300_000 }, { cost_millicents: 100_000 }] };
    expect(await room(100_000)).toBe(true);
    expect(await room(100_001)).toBe(false);
    const filters = fake.calls.map((call) => [call.method, ...call.args]);
    expect(filters).toContainEqual(['eq', 'agency_id', 'agency-a']);
    expect(filters).toContainEqual(['eq', 'purpose', 'ranking']);
    expect(filters).toContainEqual(['is', 'user_id', null]);
  });

  it('une lecture en échec ne laisse aucune place (M98)', async () => {
    state.response = { error: { message: 'panne' } };
    expect(await room(1)).toBe(false);
  });
});
