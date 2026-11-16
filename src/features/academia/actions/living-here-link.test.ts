import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeSupabase } from '@/test-fixtures/fake-supabase';
import { FAKE_DOSSIER_ID, FAKE_LINK, fakeAcademia } from '@/test-fixtures/fake-academia';

// Mission 157 — « Créer le lien « Vivre ici » », sur le bien vendeur seulement : l'action appelée POUR
// DE VRAI, contre un faux serveur Academia et un faux Supabase. Tout est relu au serveur (le
// conseiller, le dossier de l'agence, l'accès à l'API, l'adresse enregistrée du bien) ; seul le bien
// vendeur part, jamais un nom ; le lien et son expiration sont rangés sur le mandat ; un refus
// n'écrit rien.
const PROJECT = '0ccccccc-0000-4000-8000-000000000001';
const ADDRESS = '4 chemin des Restanques Hautes, 06140 Vence';

type Row = Record<string, unknown> | null;
const state = vi.hoisted(() => ({
  profile: { id: 'u1', agency_id: 'agency-a', removed_at: null as string | null },
  demo: false,
  access: { key: 'msk_essai', demoAddress: null as string | null } as {
    key: string;
    demoAddress: string | null;
  } | null,
  project: {
    id: '0ccccccc-0000-4000-8000-000000000001',
    status: 'meeting_completed',
    seller_name: 'M. et Mme Lopez',
  } as Row,
  subject: {
    address: '4 chemin des Restanques Hautes',
    postal_code: '06140',
    city: 'Vence',
    property_type: 'Maison',
    rooms_count: 5,
    surface_area: 135,
  } as Row,
  dossier: null as Row,
  writeError: null as unknown,
}));
const db = fakeSupabase((calls) => {
  const last = calls.map((call) => call.method).lastIndexOf('from');
  const table = String(calls[last]?.args[0] ?? '');
  const tail = calls.slice(last);
  const writing = tail.some((call) => ['upsert', 'update', 'insert'].includes(call.method));
  if (writing) return state.writeError ? { error: state.writeError } : { data: [{ id: 'x' }] };
  if (table === 'projects') return { data: state.project };
  if (table === 'subject_properties') return { data: state.subject };
  if (table === 'project_academia_dossiers') return { data: state.dossier };
  return { data: null };
});
vi.mock('@/lib/auth/get-profile', () => ({ getProfile: async () => state.profile }));
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: () => db.client }));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('@/lib/app-errors/report-server-error', () => ({
  reportServerError: vi.fn(async () => {}),
}));
vi.mock('@/features/demo/services/is-demo-agency', () => ({
  isDemoAgency: async () => state.demo,
}));
vi.mock('@/features/academia/services/academia-api-access', () => ({
  academiaApiAccess: () => state.access,
}));

const { createLivingHereLink, refreshLivingHereLink } =
  await import('@/features/academia/actions/living-here-link');

const writes = () => db.writes();
const written = (table: string, method = 'upsert') => {
  let current = '';
  for (const call of db.calls) {
    if (call.method === 'from') current = String(call.args[0]);
    if (current === table && call.method === method) return call.args[0] as Record<string, unknown>;
  }
  return null;
};

let server = fakeAcademia();
beforeEach(() => {
  db.reset();
  server = fakeAcademia();
  vi.stubGlobal('fetch', server.fetch);
  state.profile.removed_at = null;
  state.demo = false;
  state.access = { key: 'msk_essai', demoAddress: null };
  state.project = { id: PROJECT, status: 'meeting_completed', seller_name: 'M. et Mme Lopez' };
  state.subject = {
    address: '4 chemin des Restanques Hautes',
    postal_code: '06140',
    city: 'Vence',
    property_type: 'Maison',
    rooms_count: 5,
    surface_area: 135,
  };
  state.dossier = null;
  state.writeError = null;
});

describe('« Créer le lien « Vivre ici » »', () => {
  it('le dossier prêt : le lien et son expiration, rangés sur le mandat', async () => {
    expect(await createLivingHereLink(PROJECT)).toEqual({
      state: 'ready',
      url: FAKE_LINK,
      expiresAt: '2026-12-16T00:00:00.000Z',
    });
    expect(server.calls.map((call) => `${call.method} ${call.path}`)).toEqual([
      'POST /api/v1/dossiers',
      `POST /api/v1/dossiers/${FAKE_DOSSIER_ID}/liens-client`,
    ]);
    expect(written('project_academia_dossiers')).toMatchObject({
      agency_id: 'agency-a',
      project_id: PROJECT,
      academia_dossier_id: FAKE_DOSSIER_ID,
      state: 'pret',
      address_sent: ADDRESS,
      requested_by: 'u1',
    });
    expect(written('project_academia_dossiers', 'update')).toEqual({
      link_url: FAKE_LINK,
      link_expires_at: '2026-12-16T00:00:00.000Z',
    });
    expect(written('projects', 'update')).toEqual({ academia_living_here_url: FAKE_LINK });
  });

  it('seul le bien vendeur part : son adresse enregistrée, son type, ses pièces, sa surface ; jamais un nom', async () => {
    await createLivingHereLink(PROJECT);
    const body = server.calls[0].body as Record<string, unknown>;
    expect(body).toEqual({
      adresse: ADDRESS,
      bien: { type: 'maison', pieces: 5, surface: 135 },
      idempotence: expect.stringMatching(/^acm-[0-9a-f-]{36}-[0-9a-f]{16}$/),
    });
    expect(JSON.stringify(server.calls)).not.toContain('Lopez');
    expect(server.calls[0].authorization).toBe('Bearer msk_essai');
  });

  it('en préparation (202) : « en attente », rien de rangé sur le mandat', async () => {
    server = fakeAcademia({
      createDossier: [{ status: 202, body: { id: FAKE_DOSSIER_ID, etat: 'en_cours' } }],
    });
    vi.stubGlobal('fetch', server.fetch);
    expect(await createLivingHereLink(PROJECT)).toEqual({ state: 'waiting' });
    expect(written('project_academia_dossiers')).toMatchObject({ state: 'en_cours' });
    expect(written('projects', 'update')).toBeNull();
  });

  it('la suite : le dossier devenu prêt, sans nouvelle demande de dossier', async () => {
    state.dossier = {
      academia_dossier_id: FAKE_DOSSIER_ID,
      state: 'en_cours',
      address_sent: ADDRESS,
      link_url: null,
      link_expires_at: null,
    };
    expect(await refreshLivingHereLink(PROJECT)).toMatchObject({ state: 'ready', url: FAKE_LINK });
    expect(server.calls.map((call) => `${call.method} ${call.path}`)).toEqual([
      `GET /api/v1/dossiers/${FAKE_DOSSIER_ID}`,
      `POST /api/v1/dossiers/${FAKE_DOSSIER_ID}/liens-client`,
    ]);
  });

  it('la suite, sans dossier demandé : rien ne part', async () => {
    expect(await refreshLivingHereLink(PROJECT)).toEqual({ state: 'idle' });
    expect(server.calls).toEqual([]);
  });

  it('un lien valable déjà rangé : rendu tel quel, sans appel', async () => {
    state.project = { ...state.project, academia_living_here_url: FAKE_LINK };
    state.dossier = {
      academia_dossier_id: FAKE_DOSSIER_ID,
      state: 'pret',
      address_sent: ADDRESS,
      link_url: FAKE_LINK,
      link_expires_at: new Date(Date.now() + 10 * 86_400_000).toISOString(),
    };
    expect((await createLivingHereLink(PROJECT)).state).toBe('ready');
    expect(server.calls).toEqual([]);
  });

  it('un lien expiré : un lien neuf sur le même dossier, sans nouveau dossier (il ne compte pas)', async () => {
    state.project = { ...state.project, academia_living_here_url: FAKE_LINK };
    state.dossier = {
      academia_dossier_id: FAKE_DOSSIER_ID,
      state: 'pret',
      address_sent: ADDRESS,
      link_url: FAKE_LINK,
      link_expires_at: new Date(Date.now() - 86_400_000).toISOString(),
    };
    expect((await createLivingHereLink(PROJECT)).state).toBe('ready');
    expect(server.calls.map((call) => call.path)).toEqual([
      `/api/v1/dossiers/${FAKE_DOSSIER_ID}/liens-client`,
    ]);
  });

  it('l’adresse du bien a changé : un nouveau dossier', async () => {
    state.dossier = {
      academia_dossier_id: 'dos_ancien',
      state: 'pret',
      address_sent: '2 rue Ancienne, 06140 Vence',
      link_url: null,
      link_expires_at: null,
    };
    await createLivingHereLink(PROJECT);
    expect(server.calls[0].path).toBe('/api/v1/dossiers');
    expect((server.calls[0].body as { adresse: string }).adresse).toBe(ADDRESS);
  });

  it('adresse ambiguë (422) : les propositions ; le choix du conseiller part, la fiche ne change pas', async () => {
    server = fakeAcademia({
      createDossier: [
        { status: 422, body: { propositions: ['4 chemin des Restanques, 06140 Vence'] } },
        { status: 200, body: { id: FAKE_DOSSIER_ID, etat: 'pret' } },
      ],
    });
    vi.stubGlobal('fetch', server.fetch);
    expect(await createLivingHereLink(PROJECT)).toEqual({
      state: 'ambiguous',
      propositions: ['4 chemin des Restanques, 06140 Vence'],
    });
    expect(writes()).toEqual([]);
    await createLivingHereLink(PROJECT, '4 chemin des Restanques, 06140 Vence');
    expect((server.calls[1].body as { adresse: string }).adresse).toBe(
      '4 chemin des Restanques, 06140 Vence',
    );
    expect(writes()).not.toContain('update subject_properties');
  });

  it('Academia en panne, au plafond, ou qui refuse : le message, rien de rangé sur le mandat', async () => {
    const cases: [number, string][] = [
      [
        503,
        'Academia ne répond pas pour l’instant. Réessayez dans un moment, ou collez le lien vous-même.',
      ],
      [
        429,
        'Academia a atteint sa limite du jour : réessayez demain, ou collez le lien vous-même.',
      ],
      [
        401,
        'Academia refuse la demande pour l’instant : l’équipe ACM Studio est prévenue. Collez le lien vous-même.',
      ],
    ];
    for (const [status, message] of cases) {
      db.reset();
      server = fakeAcademia({ createDossier: [{ status }, { status }] });
      vi.stubGlobal('fetch', server.fetch);
      expect(await createLivingHereLink(PROJECT)).toEqual({ state: 'failed', message });
      expect(writes()).toEqual([]);
    }
  });

  it('le dossier en erreur chez Academia : le dire, et une nouvelle demande au geste suivant', async () => {
    state.dossier = {
      academia_dossier_id: FAKE_DOSSIER_ID,
      state: 'en_cours',
      address_sent: ADDRESS,
      link_url: null,
      link_expires_at: null,
    };
    server = fakeAcademia({
      readDossier: [{ status: 200, body: { id: FAKE_DOSSIER_ID, etat: 'erreur' } }],
    });
    vi.stubGlobal('fetch', server.fetch);
    expect(await refreshLivingHereLink(PROJECT)).toEqual({
      state: 'failed',
      message:
        'Academia n’a pas pu préparer le dossier de cette adresse. Vérifiez l’adresse du bien, ou collez le lien vous-même.',
    });
    expect(written('project_academia_dossiers', 'update')).toEqual({ state: 'erreur' });
  });

  it('refusé sans appel ni écriture : membre retiré, dossier d’une autre agence ou archivé, accès fermé, sans adresse', async () => {
    state.profile.removed_at = '2026-11-01T00:00:00Z';
    expect((await createLivingHereLink(PROJECT)).state).toBe('failed');
    state.profile.removed_at = null;

    state.project = null;
    expect((await createLivingHereLink(PROJECT)).state).toBe('failed');
    state.project = { id: PROJECT, status: 'archived' };
    expect((await createLivingHereLink(PROJECT)).state).toBe('failed');
    state.project = { id: PROJECT, status: 'draft' };

    state.access = null;
    expect(await createLivingHereLink(PROJECT)).toEqual({ state: 'closed' });
    state.access = { key: 'msk_essai', demoAddress: null };

    state.subject = { ...state.subject, address: null };
    expect(await createLivingHereLink(PROJECT)).toEqual({ state: 'no_address' });

    expect(await createLivingHereLink('pas-un-id')).toMatchObject({ state: 'failed' });
    expect(server.calls).toEqual([]);
    expect(writes()).toEqual([]);
  });

  it('la démo : seulement l’adresse fictive du dossier de démonstration d’Academia, jamais celle du bien', async () => {
    state.demo = true;
    state.access = { key: 'msk_demo', demoAddress: '1 place de la Démonstration, 06000 Nice' };
    await createLivingHereLink(PROJECT);
    expect((server.calls[0].body as { adresse: string }).adresse).toBe(
      '1 place de la Démonstration, 06000 Nice',
    );
    expect(JSON.stringify(server.calls)).not.toContain('Restanques');
    expect(server.calls[0].authorization).toBe('Bearer msk_demo');
  });

  it('la clé n’est jamais dans ce que rend l’action', async () => {
    const result = await createLivingHereLink(PROJECT);
    expect(JSON.stringify(result)).not.toContain('msk_');
  });
});
