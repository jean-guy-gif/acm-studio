import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeSupabase } from '@/test-fixtures/fake-supabase';

// Mission 119 (partie B) — les coches du lien public : le jeton est relu, seuls les biens de la
// sélection du lien comptent, une demande vivante ne se redouble pas, chaque coche crée une demande
// « depuis le dossier » ; sans compte ni e-mail.
const state = vi.hoisted(() => ({
  // Les réponses, dans l'ordre où l'action attend ses requêtes : lien, biens, demandes, insertion.
  queue: [] as { data?: unknown; error?: unknown }[],
}));
const service = fakeSupabase(() => state.queue.shift() ?? { data: null });
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: () => service.client }));

const { requestVisitsFromDossier } =
  await import('@/features/buyer-dossier/actions/request-visits-from-dossier');
const { DOSSIER_NO_CHOICE } = await import('@/features/buyer-dossier/types');

const TOKEN = 'A'.repeat(43);
const ITEM_A = '11111111-1111-4111-8111-111111111111';
const ITEM_B = '22222222-2222-4222-8222-222222222222';
const ITEM_OUT = '33333333-3333-4333-8333-333333333333';
const link = { agency_id: 'agency-a', buyer_id: 'b1', selection_id: 's1' };
const pending = (itemId: string) => ({
  id: 'r',
  agency_id: 'agency-a',
  buyer_id: 'b1',
  buyer_selection_item_id: itemId,
  requested_at: 'x',
  requested_during: 'dossier',
  cancelled_at: null,
  visited_at: null,
  feedback: null,
  outcome: 'to_plan',
  created_at: 'x',
});

describe('requestVisitsFromDossier', () => {
  beforeEach(() => {
    service.reset();
    state.queue = [];
  });

  it('jeton mal formé, aucune coche, ou identifiants douteux : rien n’est écrit', async () => {
    expect((await requestVisitsFromDossier('court', [ITEM_A])).ok).toBe(false);
    expect(await requestVisitsFromDossier(TOKEN, [])).toEqual({
      ok: false,
      error: DOSSIER_NO_CHOICE,
    });
    expect((await requestVisitsFromDossier(TOKEN, ['pas-un-uuid'])).ok).toBe(false);
    expect(
      (await requestVisitsFromDossier(TOKEN, [ITEM_A, ITEM_A, ITEM_B, ITEM_OUT, ITEM_A])).ok,
    ).toBe(false);
    expect(service.writes()).toEqual([]);
  });

  it('jeton inconnu ou expiré : « Ce lien n’est plus valable », rien n’est écrit', async () => {
    expect(await requestVisitsFromDossier(TOKEN, [ITEM_A])).toEqual({
      ok: false,
      error: 'Ce lien n’est plus valable.',
    });
    expect(
      service.calls.some((call) => call.method === 'gt' && call.args[0] === 'expires_at'),
    ).toBe(true);
    expect(service.writes()).toEqual([]);
  });

  it('crée une demande « depuis le dossier » par bien coché de la sélection ; un bien d’une autre sélection est ignoré ; une demande vivante ne se redouble pas', async () => {
    state.queue = [
      { data: link },
      { data: [{ id: ITEM_A }, { id: ITEM_B }] },
      { data: [pending(ITEM_B)] },
      { data: null },
    ];
    const result = await requestVisitsFromDossier(TOKEN, [ITEM_A, ITEM_B, ITEM_OUT]);
    expect(result).toEqual({ ok: true, requested: 1 });
    expect(service.writes()).toEqual(['insert buyer_visit_requests']);
    expect(service.calls.find((call) => call.method === 'insert')?.args[0]).toEqual([
      {
        agency_id: 'agency-a',
        buyer_id: 'b1',
        buyer_selection_item_id: ITEM_A,
        requested_during: 'dossier',
      },
    ]);
  });
});
