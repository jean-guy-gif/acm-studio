import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeSupabase, type FakeCall, type FakeResponse } from '@/test-fixtures/fake-supabase';

// Mission 141 — « Construire le dossier d'adresse », appelé POUR DE VRAI avec un client factice
// (modèle de `sensitive-actions.test.ts`, M100) : un appel refusé n'écrit rien ; dans l'agence de
// démonstration, aucun appel réseau (M114) ; l'écriture passe par la clé service, dans l'agence.

const state = vi.hoisted(() => ({
  profile: null as Record<string, unknown> | null,
  demo: true,
  project: { id: 'p', status: 'draft' } as Record<string, unknown> | null,
  property: {
    address: '4 chemin des Restanques Hautes',
    postal_code: '06140',
    city: 'Vence',
    property_type: 'Maison',
  } as Record<string, unknown> | null,
  upserts: [] as unknown[],
}));

const tableOf = (calls: FakeCall[]): string => {
  const from = [...calls].reverse().find((call) => call.method === 'from');
  return from ? String(from.args[0]) : '';
};
const respond = (calls: FakeCall[]): FakeResponse => {
  const table = tableOf(calls);
  const upsert = calls.find((call) => call.method === 'upsert');
  if (upsert) {
    state.upserts.push(upsert.args[0]);
    return {};
  }
  if (table === 'projects') return { data: state.project };
  if (table === 'subject_properties') return { data: state.property };
  return { data: null };
};
const server = fakeSupabase(respond);
const service = fakeSupabase(respond);

vi.mock('server-only', () => ({}));
vi.mock('@/lib/auth/get-profile', () => ({ getProfile: async () => state.profile }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => server.client }));
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: () => service.client }));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('@/features/demo/services/is-demo-agency', () => ({
  isDemoAgency: async () => state.demo,
}));
vi.mock('@/features/demo/services/demo-delay', () => ({ demoDelay: async () => undefined }));
vi.mock('@/lib/app-errors/report-server-error', () => ({
  reportServerError: async () => undefined,
}));

const AGENCY = '11111111-1111-4111-8111-111111111111';
const PROJECT = '33333333-3333-4333-8333-333333333333';
const advisor = { id: 'u-advisor', agency_id: AGENCY, role: 'advisor', removed_at: null };

const noWrite = () => expect([...server.writes(), ...service.writes()]).toEqual([]);

beforeEach(() => {
  server.reset();
  service.reset();
  state.profile = advisor;
  state.demo = true;
  state.project = { id: PROJECT, status: 'draft' };
  state.property = {
    address: '4 chemin des Restanques Hautes',
    postal_code: '06140',
    city: 'Vence',
    property_type: 'Maison',
  };
  state.upserts = [];
});

describe('construire le dossier d’adresse', () => {
  it('refusé sans session, à un membre retiré, sur un identifiant douteux, un dossier archivé ou sans adresse', async () => {
    const { buildAddressDossier } =
      await import('@/features/address-dossier/actions/build-address-dossier');
    state.profile = null;
    expect((await buildAddressDossier(PROJECT)).ok).toBe(false);
    state.profile = { ...advisor, removed_at: '2026-10-01T00:00:00Z' };
    expect((await buildAddressDossier(PROJECT)).ok).toBe(false);
    state.profile = advisor;
    expect((await buildAddressDossier('pas-un-uuid')).ok).toBe(false);
    state.project = { id: PROJECT, status: 'archived' };
    expect((await buildAddressDossier(PROJECT)).ok).toBe(false);
    state.project = null;
    expect((await buildAddressDossier(PROJECT)).ok).toBe(false);
    state.project = { id: PROJECT, status: 'meeting_completed' };
    state.property = { address: '', postal_code: null, city: 'Vence', property_type: 'Maison' };
    const missing = await buildAddressDossier(PROJECT);
    expect(missing).toEqual({
      ok: false,
      error: expect.stringContaining('Ajoutez l’adresse du bien'),
    });
    noWrite();
  });

  it('dans la démo, le jeu figé de Vence, sans aucun appel réseau, écrit dans l’agence', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { buildAddressDossier } =
      await import('@/features/address-dossier/actions/build-address-dossier');
    expect(await buildAddressDossier(PROJECT)).toEqual({ ok: true });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    expect(server.writes()).toEqual([]);
    expect(service.writes()).toEqual(['upsert address_dossiers']);
    const row = state.upserts[0] as {
      agency_id: string;
      project_id: string;
      built_by: string;
      blocks: Record<
        string,
        { state: string; data?: { count?: number; stats?: { median: number } } }
      >;
    };
    expect(row).toMatchObject({ agency_id: AGENCY, project_id: PROJECT, built_by: 'u-advisor' });
    expect(row).not.toHaveProperty('built_at');
    expect(row.blocks.sales?.state).toBe('ok');
    expect(row.blocks.sales?.data?.count).toBe(12);
    expect(row.blocks.sales?.data?.stats?.median).toBe(4896);
    expect(row.blocks.risks?.state).toBe('ok');
    expect(row.blocks.urbanism?.state).toBe('ok');
    // Une adresse inventée : ni DPE, ni parcelle, ni copropriété.
    expect(row.blocks.dpe?.state).toBe('empty');
    expect(row.blocks.parcel?.state).toBe('empty');
    expect(row.blocks.condo?.state).toBe('empty');
  });
});
