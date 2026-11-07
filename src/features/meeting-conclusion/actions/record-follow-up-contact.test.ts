import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeSupabase } from '@/test-fixtures/fake-supabase';

// Mission 145 (partie B) — une relance notée vaut « Garder la date » pour les acquéreurs prêts
// qu'elle compte : « Relancer plus tôt ? » ne revient pas le jour même (bloquant du relecteur).
const CONTACTED_AT = '2026-11-08T10:12:00+00:00';
const state = { ready: 1, serviceError: null as unknown };
const server = fakeSupabase(() => ({ data: { contacted_at: CONTACTED_AT } }));
const service = fakeSupabase(() => ({ error: state.serviceError }));
const reported: string[] = [];
vi.mock('@/lib/auth/get-profile', () => ({
  getProfile: async () => ({ id: 'u1', agency_id: 'agence-1', removed_at: null }),
}));
vi.mock('@/features/projects/queries/get-project', () => ({
  getProject: async () => ({ status: 'meeting_completed' }),
}));
vi.mock('@/features/meeting-conclusion/queries/get-conclusion', () => ({
  getConclusion: async () => ({ outcome: 'follow_up', followUpMotive: 'thinking_price' }),
}));
vi.mock('@/features/buyers/queries/get-property-buyers', () => ({
  getPropertyBuyers: async () => ({ ready: Array.from({ length: state.ready }), others: [] }),
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => server.client }));
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: () => service.client }));
vi.mock('@/lib/app-errors/report-server-error', () => ({
  reportServerError: async (scope: string) => {
    reported.push(scope);
  },
}));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));

const { recordFollowUpContact } =
  await import('@/features/meeting-conclusion/actions/record-follow-up-contact');

describe('une relance notée garde la date pour les acquéreurs prêts', () => {
  beforeEach(() => {
    server.reset();
    service.reset();
    reported.length = 0;
    state.ready = 1;
    state.serviceError = null;
  });

  it('pose la date gardée à l’heure de la relance, avec le nombre recalculé, dans l’agence', async () => {
    expect(await recordFollowUpContact('p1', new FormData())).toEqual({ ok: true });
    expect(server.writes()).toEqual(['insert follow_up_contacts']);
    expect(service.writes()).toEqual(['update project_meeting_conclusions']);
    const update = service.calls.find((call) => call.method === 'update');
    expect(update?.args[0]).toEqual({
      early_follow_up_kept_at: CONTACTED_AT,
      early_follow_up_kept_ready: 1,
    });
    const eqs = service.calls.filter((call) => call.method === 'eq').map((call) => call.args);
    expect(eqs).toEqual([
      ['project_id', 'p1'],
      ['agency_id', 'agence-1'],
    ]);
  });

  it('sans acquéreur prêt, rien de plus ; un échec ne défait pas la relance et entre au journal', async () => {
    state.ready = 0;
    expect(await recordFollowUpContact('p1', new FormData())).toEqual({ ok: true });
    expect(service.writes()).toEqual([]);
    state.ready = 2;
    state.serviceError = { message: 'boom' };
    expect(await recordFollowUpContact('p1', new FormData())).toEqual({ ok: true });
    expect(reported).toEqual(['record-follow-up-contact: garder la date']);
  });
});
