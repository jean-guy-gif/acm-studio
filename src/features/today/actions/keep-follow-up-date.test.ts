import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeSupabase } from '@/test-fixtures/fake-supabase';

// Mission 145 (partie B) — « Garder la date » : relu au serveur, dans l'agence de l'appelant, sur un
// vendeur à relancer que veulent encore des acquéreurs prêts ; le nombre est recalculé ici.
const state: {
  profile: { agency_id: string; removed_at: string | null } | null;
  project: { status: string; is_example: boolean } | null;
  outcome: string | null;
  ready: number | null;
} = {
  profile: { agency_id: 'agence-1', removed_at: null },
  project: { status: 'meeting_completed', is_example: false },
  outcome: 'follow_up',
  ready: 2,
};
const service = fakeSupabase((calls) =>
  calls.some((call) => call.method === 'update')
    ? {}
    : { data: state.outcome ? { outcome: state.outcome } : null },
);
vi.mock('@/lib/auth/get-profile', () => ({ getProfile: async () => state.profile }));
vi.mock('@/features/projects/queries/get-project', () => ({
  getProject: async () => state.project,
}));
vi.mock('@/features/buyers/queries/get-property-buyers', () => ({
  getPropertyBuyers: async () =>
    state.ready == null ? null : { ready: Array.from({ length: state.ready }), others: [] },
}));
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: () => service.client }));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));

const { keepFollowUpDate } = await import('@/features/today/actions/keep-follow-up-date');

const ID = '0b6f0a8e-2a52-4c1a-9a4f-1c2d3e4f5a6b';

describe('« Garder la date »', () => {
  beforeEach(() => {
    service.reset();
    state.profile = { agency_id: 'agence-1', removed_at: null };
    state.project = { status: 'meeting_completed', is_example: false };
    state.outcome = 'follow_up';
    state.ready = 2;
  });

  it('note le moment et le nombre d’acquéreurs prêts, recalculé au serveur, dans l’agence', async () => {
    expect(await keepFollowUpDate(ID)).toEqual({ ok: true });
    expect(service.writes()).toEqual(['update project_meeting_conclusions']);
    const update = service.calls.find((call) => call.method === 'update');
    expect(update?.args[0]).toEqual({
      early_follow_up_kept_at: expect.any(String),
      early_follow_up_kept_ready: 2,
    });
    const eqs = service.calls.filter((call) => call.method === 'eq').map((call) => call.args);
    expect(eqs).toContainEqual(['agency_id', 'agence-1']);
    expect(eqs).toContainEqual(['project_id', ID]);
  });

  it('refuse sans rien écrire : identifiant, membre retiré, hors Suivi, exemple, plus à relancer, aucun prêt, lecture en échec', async () => {
    const refused = [await keepFollowUpDate('pas-un-uuid')];
    state.profile = { agency_id: 'agence-1', removed_at: '2026-11-01' };
    refused.push(await keepFollowUpDate(ID));
    state.profile = { agency_id: 'agence-1', removed_at: null };
    state.project = { status: 'ready_for_meeting', is_example: false };
    refused.push(await keepFollowUpDate(ID));
    state.project = { status: 'meeting_completed', is_example: true };
    refused.push(await keepFollowUpDate(ID));
    state.project = { status: 'meeting_completed', is_example: false };
    state.outcome = 'signed';
    refused.push(await keepFollowUpDate(ID));
    state.outcome = 'follow_up';
    state.ready = 0;
    refused.push(await keepFollowUpDate(ID));
    state.ready = null;
    refused.push(await keepFollowUpDate(ID));
    for (const result of refused) expect(result.ok).toBe(false);
    expect(service.writes()).toEqual([]);
  });
});
