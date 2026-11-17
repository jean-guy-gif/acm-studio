import { beforeEach, describe, expect, it, vi } from 'vitest';

import advisorView from '@/test-fixtures/academia-vue-bien.json';
import clientView from '@/test-fixtures/academia-vue-bien-client.json';
import { FAKE_ACADEMIA_ID, fakeAcademia } from '@/test-fixtures/fake-academia';
import { fakeSupabase } from '@/test-fixtures/fake-supabase';

// Mission 159 — « Enregistrer le choix » du quartier montré au vendeur, l'action appelée POUR DE
// VRAI contre un faux serveur Academia et un faux Supabase (décisions de Jean-Guy, 17/11) : les
// seuls blocs cochés, relus au serveur dans la vue « bien-client » du jour, jamais ce qu'envoie le
// navigateur ; jamais la valeur indicative ni le DPE, même si la réponse les portait ; plus rien
// une fois le Live commencé ; seul le serveur écrit.
const PROJECT = '0ccccccc-0000-4000-8000-000000000159';

type Row = Record<string, unknown> | null;
const state = vi.hoisted(() => ({
  profile: { id: 'u1', agency_id: 'agency-a', removed_at: null as string | null },
  access: { key: 'msk_essai', demoAddress: null as string | null } as {
    key: string;
    demoAddress: string | null;
  } | null,
  project: null as Row,
  responses: 0,
  subject: null as Row,
  request: null as Row,
  writeError: null as unknown,
}));
const db = fakeSupabase((calls) => {
  const last = calls.map((call) => call.method).lastIndexOf('from');
  const table = String(calls[last]?.args[0] ?? '');
  const writing = calls.slice(last).some((call) => call.method === 'insert');
  if (writing) return state.writeError ? { error: state.writeError } : { data: null };
  if (table === 'projects') return { data: state.project };
  if (table === 'live_seller_responses') return { data: null, count: state.responses };
  if (table === 'subject_properties') return { data: state.subject };
  if (table === 'project_academia_requests') return { data: state.request };
  return { data: null };
});
vi.mock('@/lib/auth/get-profile', () => ({ getProfile: async () => state.profile }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => db.client }));
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: () => db.client }));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('@/lib/app-errors/report-server-error', () => ({
  reportServerError: vi.fn(async () => {}),
}));
vi.mock('@/features/demo/services/is-demo-agency', () => ({ isDemoAgency: async () => false }));
vi.mock('@/features/academia/services/academia-api-access', () => ({
  academiaApiAccess: () => state.access,
}));

const { saveNeighbourhoodChoice } =
  await import('@/features/academia/actions/save-neighbourhood-choice');

const inserted = () => {
  let current = '';
  for (const call of db.calls) {
    if (call.method === 'from') current = String(call.args[0]);
    if (current === 'project_neighbourhood_snapshots' && call.method === 'insert')
      return call.args[0] as Record<string, unknown>;
  }
  return null;
};

let server = fakeAcademia({ readClientView: [{ status: 200, body: clientView }] });
beforeEach(() => {
  db.reset();
  server = fakeAcademia({ readClientView: [{ status: 200, body: clientView }] });
  vi.stubGlobal('fetch', server.fetch);
  state.profile.removed_at = null;
  state.access = { key: 'msk_essai', demoAddress: null };
  state.project = { id: PROJECT, status: 'ready_for_meeting', live_started_at: null };
  state.responses = 0;
  state.subject = {
    address: '4 chemin des Restanques Hautes',
    postal_code: '06140',
    city: 'Vence',
    property_type: 'Maison',
    rooms_count: 5,
    surface_area: 135,
  };
  state.request = {
    academia_id: FAKE_ACADEMIA_ID,
    state: 'pret',
    property_address: '4 chemin des Restanques Hautes, 06140 Vence',
  };
  state.writeError = null;
});

describe('« Enregistrer le choix » du quartier', () => {
  it('garde les seuls blocs cochés, relus dans la vue « bien-client » du jour', async () => {
    expect(await saveNeighbourhoodChoice(PROJECT, ['risques', 'ventes'])).toEqual({
      ok: true,
      keys: ['risques', 'ventes'],
    });
    const row = inserted();
    expect(row).toMatchObject({
      project_id: PROJECT,
      agency_id: 'agency-a',
      property_address: '4 chemin des Restanques Hautes, 06140 Vence',
      property_type: 'maison',
      property_rooms: 5,
      property_surface: 135,
      created_by: 'u1',
    });
    expect(Object.keys(row!.blocks as object)).toEqual(['risques', 'ventes']);
    // La vue « bien-client » et elle seule, pour le bien du jour.
    const call = server.calls.find((c) => /bien-client/.test(c.path));
    expect(call?.path).toBe(`/api/v1/dossiers/${FAKE_ACADEMIA_ID}/bien-client`);
    expect(server.calls.some((c) => /\/bien$/.test(c.path))).toBe(false);
  });

  it('rien de coché : un instantané vide, aucun écran', async () => {
    expect(await saveNeighbourhoodChoice(PROJECT, [])).toEqual({ ok: true, keys: [] });
    expect(inserted()?.blocks).toEqual({});
  });

  it('piège : une réponse qui porte la valeur indicative et le DPE n’en laisse rien passer', async () => {
    const trap = structuredClone(clientView) as { blocs: Record<string, unknown> };
    trap.blocs.estimation = (advisorView as { blocs: Record<string, unknown> }).blocs.estimation;
    trap.blocs.dpe = (advisorView as { blocs: Record<string, unknown> }).blocs.dpe;
    server = fakeAcademia({ readClientView: [{ status: 200, body: trap }] });
    vi.stubGlobal('fetch', server.fetch);
    await saveNeighbourhoodChoice(PROJECT, [
      'urbanisme',
      'risques',
      'population',
      'copropriete',
      'permis',
      'ventes',
    ]);
    expect(JSON.stringify(inserted())).not.toMatch(
      /estimation|980000|955000|1060000|dpe|etiquette|fiabilite|Démonstration|AC1|UFb4|V37/,
    );
  });

  it('refuse une clé hors liste, un doublon déguisé ou une liste illisible, sans rien écrire', async () => {
    for (const keys of [['risques', 'estimation'], ['dpe'], 'risques', [1], null]) {
      expect(await saveNeighbourhoodChoice(PROJECT, keys)).toEqual({
        ok: false,
        error: 'Choix illisible : rechargez la page.',
      });
    }
    expect(inserted()).toBeNull();
    expect(server.calls).toEqual([]);
  });

  it('le Live commencé, conclu ou archivé : plus de nouveau choix, ni appel ni écriture', async () => {
    for (const setup of [
      () =>
        (state.project = {
          id: PROJECT,
          status: 'ready_for_meeting',
          live_started_at: '2026-11-17T10:00:00Z',
        }),
      () => (state.responses = 1),
      () => (state.project = { id: PROJECT, status: 'meeting_completed', live_started_at: null }),
    ]) {
      db.reset();
      state.project = { id: PROJECT, status: 'ready_for_meeting', live_started_at: null };
      state.responses = 0;
      setup();
      expect(await saveNeighbourhoodChoice(PROJECT, ['risques'])).toEqual({
        ok: false,
        error: 'Le Live a commencé : le quartier montré au vendeur ne se modifie plus.',
      });
      expect(inserted()).toBeNull();
    }
    state.project = { id: PROJECT, status: 'archived', live_started_at: null };
    state.responses = 0;
    expect(await saveNeighbourhoodChoice(PROJECT, ['risques'])).toMatchObject({ ok: false });
    expect(server.calls).toEqual([]);
  });

  it('la base refuse (le premier écran du Live au même instant) : le même message', async () => {
    state.writeError = { code: '42501', message: 'le Live a commencé' };
    expect(await saveNeighbourhoodChoice(PROJECT, ['risques'])).toEqual({
      ok: false,
      error: 'Le Live a commencé : le quartier montré au vendeur ne se modifie plus.',
    });
  });

  it('sans connexion, sans accès, sans dossier prêt ou une adresse changée : rien n’est écrit', async () => {
    state.profile.removed_at = '2026-11-01';
    expect(await saveNeighbourhoodChoice(PROJECT, ['risques'])).toMatchObject({ ok: false });
    state.profile.removed_at = null;
    state.access = null;
    expect(await saveNeighbourhoodChoice(PROJECT, ['risques'])).toMatchObject({ ok: false });
    state.access = { key: 'msk_essai', demoAddress: null };
    state.request = { ...state.request!, property_address: '1 autre rue, 06140 Vence' };
    expect(await saveNeighbourhoodChoice(PROJECT, ['risques'])).toMatchObject({ ok: false });
    expect(inserted()).toBeNull();
  });
});
