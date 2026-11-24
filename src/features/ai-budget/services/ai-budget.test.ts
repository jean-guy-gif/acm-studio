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

const { nightRankingRoom, settleAiBudget } =
  await import('@/features/ai-budget/services/ai-budget');

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

// Correctif du 24/11 : en production, le classement des annonces ne se reglait jamais. Sans le
// nombre de mentions personnelles, la cle partait `undefined`, donc absente de la requete, et la
// base ne trouvait plus sa fonction a cinq arguments (« Could not find the function ... in the
// schema cache ») : la reservation restait comptee au pire.
describe('settleAiBudget', () => {
  const sent = () => {
    const call = fake.calls.find((entry) => entry.args[0] === 'settle_ai_budget');
    // Ce qui part vraiment sur le reseau : une cle `undefined` disparait du JSON.
    return JSON.parse(JSON.stringify(call?.args[1] ?? {})) as Record<string, unknown>;
  };

  it('envoie toujours les cinq arguments de la fonction, meme sans mentions (le classement)', async () => {
    state.response = { data: null };
    await settleAiBudget({ usageId: 'usage-1', costMillicents: 4321.2, outcome: 'ranked' });
    expect(sent()).toEqual({
      p_usage_id: 'usage-1',
      p_cost_millicents: 4322,
      p_outcome: 'ranked',
      p_fields_proposed: [],
      p_personal_mentions_skipped: null,
    });
  });

  it('garde le nombre de mentions d’une lecture de notes', async () => {
    state.response = { data: null };
    await settleAiBudget({
      usageId: 'usage-2',
      costMillicents: 1968,
      outcome: 'pending',
      fieldsProposed: ['name'],
      personalMentionsSkipped: 2,
    });
    expect(sent()).toMatchObject({ p_fields_proposed: ['name'], p_personal_mentions_skipped: 2 });
  });
});
