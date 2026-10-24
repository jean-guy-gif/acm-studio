import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeSupabase } from '@/test-fixtures/fake-supabase';

// Mission 118 — l'interrupteur écrit le mode du conseiller connecté, et de lui seul ; un appel
// refusé n'écrit rien.
const profile = vi.hoisted(() => ({
  current: null as null | { id: string; agency_id: string; removed_at: string | null },
}));
const service = vi.hoisted(() => ({ client: null as unknown }));

vi.mock('@/lib/auth/get-profile', () => ({ getProfile: async () => profile.current }));
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: () => service.client }));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));

const { setWorkspaceMode } = await import('@/features/workspace-mode/actions/set-workspace-mode');

describe('setWorkspaceMode', () => {
  beforeEach(() => {
    profile.current = { id: 'advisor-1', agency_id: 'agency-a', removed_at: null };
  });

  it('un mode inconnu, un profil absent ou retiré : rien n’est écrit', async () => {
    const fake = fakeSupabase();
    service.client = fake.client;
    expect(await setWorkspaceMode('landlord')).toEqual({ ok: false, error: 'Mode non reconnu.' });
    profile.current = null;
    expect((await setWorkspaceMode('buyer')).ok).toBe(false);
    profile.current = { id: 'advisor-1', agency_id: 'agency-a', removed_at: '2026-10-01' };
    expect((await setWorkspaceMode('buyer')).ok).toBe(false);
    expect(fake.writes()).toEqual([]);
  });

  it('écrit le mode sur son seul profil, dans son agence', async () => {
    const fake = fakeSupabase(() => ({ data: { workspace_mode: 'buyer' } }));
    service.client = fake.client;
    expect(await setWorkspaceMode('buyer')).toEqual({ ok: true, mode: 'buyer' });
    expect(fake.writes()).toEqual(['update profiles']);
    expect(fake.calls.find((call) => call.method === 'update')?.args[0]).toEqual({
      workspace_mode: 'buyer',
    });
    const filters = fake.calls
      .filter((call) => call.method === 'eq')
      .map((call) => `${String(call.args[0])}=${String(call.args[1])}`);
    expect(filters).toEqual(['id=advisor-1', 'agency_id=agency-a']);
  });
});
