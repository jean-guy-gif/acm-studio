import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeSupabase } from '@/test-fixtures/fake-supabase';
import { FAKE_ACADEMIA_ID, FAKE_LINK, fakeAcademia } from '@/test-fixtures/fake-academia';

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
  request: null as Row,
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
  if (table === 'project_academia_requests') return { data: state.request };
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
  state.request = null;
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
      `POST /api/v1/dossiers/${FAKE_ACADEMIA_ID}/liens-client`,
    ]);
    expect(written('project_academia_requests')).toMatchObject({
      agency_id: 'agency-a',
      project_id: PROJECT,
      academia_id: FAKE_ACADEMIA_ID,
      state: 'pret',
      property_address: ADDRESS,
      address_sent: ADDRESS,
      requested_by: 'u1',
    });
    expect(written('project_academia_requests', 'update')).toEqual({
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
      createRequest: [{ status: 202, body: { id: FAKE_ACADEMIA_ID, etat: 'en_cours' } }],
    });
    vi.stubGlobal('fetch', server.fetch);
    expect(await createLivingHereLink(PROJECT)).toEqual({ state: 'waiting' });
    expect(written('project_academia_requests')).toMatchObject({ state: 'en_cours' });
    expect(written('projects', 'update')).toBeNull();
  });

  it('la suite : le dossier devenu prêt, sans nouvelle demande de dossier', async () => {
    state.request = {
      academia_id: FAKE_ACADEMIA_ID,
      state: 'en_cours',
      property_address: ADDRESS,
      link_url: null,
      link_expires_at: null,
    };
    expect(await refreshLivingHereLink(PROJECT)).toMatchObject({ state: 'ready', url: FAKE_LINK });
    expect(server.calls.map((call) => `${call.method} ${call.path}`)).toEqual([
      `GET /api/v1/dossiers/${FAKE_ACADEMIA_ID}`,
      `POST /api/v1/dossiers/${FAKE_ACADEMIA_ID}/liens-client`,
    ]);
  });

  it('la suite, sans dossier demandé : rien ne part', async () => {
    expect(await refreshLivingHereLink(PROJECT)).toEqual({ state: 'idle' });
    expect(server.calls).toEqual([]);
  });

  it('un lien valable déjà rangé : rendu tel quel, sans appel', async () => {
    state.project = { ...state.project, academia_living_here_url: FAKE_LINK };
    state.request = {
      academia_id: FAKE_ACADEMIA_ID,
      state: 'pret',
      property_address: ADDRESS,
      link_url: FAKE_LINK,
      link_expires_at: new Date(Date.now() + 10 * 86_400_000).toISOString(),
    };
    expect((await createLivingHereLink(PROJECT)).state).toBe('ready');
    expect(server.calls).toEqual([]);
  });

  it('un lien expiré : un lien neuf sur le même dossier, sans nouveau dossier (il ne compte pas)', async () => {
    state.project = { ...state.project, academia_living_here_url: FAKE_LINK };
    state.request = {
      academia_id: FAKE_ACADEMIA_ID,
      state: 'pret',
      property_address: ADDRESS,
      link_url: FAKE_LINK,
      link_expires_at: new Date(Date.now() - 86_400_000).toISOString(),
    };
    expect((await createLivingHereLink(PROJECT)).state).toBe('ready');
    expect(server.calls.map((call) => call.path)).toEqual([
      `/api/v1/dossiers/${FAKE_ACADEMIA_ID}/liens-client`,
    ]);
  });

  it('l’adresse du bien a changé : un nouveau dossier', async () => {
    state.request = {
      academia_id: 'dos_ancien',
      state: 'pret',
      property_address: '2 rue Ancienne, 06140 Vence',
      link_url: null,
      link_expires_at: null,
    };
    await createLivingHereLink(PROJECT);
    expect(server.calls[0].path).toBe('/api/v1/dossiers');
    expect((server.calls[0].body as { adresse: string }).adresse).toBe(ADDRESS);
  });

  it('adresse ambiguë (422) : les propositions ; le choix du conseiller, revérifié, part ; la fiche ne change pas', async () => {
    const CHOSEN = '4 chemin des Restanques, 06140 Vence';
    server = fakeAcademia({
      createRequest: [
        { status: 422, body: { propositions: [CHOSEN] } },
        { status: 422, body: { propositions: [CHOSEN] } },
        { status: 200, body: { id: FAKE_ACADEMIA_ID, etat: 'pret' } },
      ],
    });
    vi.stubGlobal('fetch', server.fetch);
    expect(await createLivingHereLink(PROJECT)).toEqual({
      state: 'ambiguous',
      propositions: [CHOSEN],
    });
    expect(writes()).toEqual([]);
    await createLivingHereLink(PROJECT, CHOSEN);
    // L'adresse du bien d'abord (Academia redit ses propositions), puis l'adresse choisie.
    expect(
      server.calls.slice(1, 3).map((call) => (call.body as { adresse: string }).adresse),
    ).toEqual([ADDRESS, CHOSEN]);
    expect(written('project_academia_requests')).toMatchObject({
      property_address: ADDRESS,
      address_sent: CHOSEN,
    });
    expect(writes()).not.toContain('update subject_properties');
  });

  it('une adresse « choisie » qu’Academia n’a pas proposée ne part jamais (ni un nom, ni une autre adresse)', async () => {
    server = fakeAcademia({
      createRequest: [
        { status: 422, body: { propositions: ['4 chemin des Restanques, 06140 Vence'] } },
      ],
    });
    vi.stubGlobal('fetch', server.fetch);
    for (const chosen of ['M. et Mme Lopez', '12 rue de Paris, 75001 Paris']) {
      expect(await createLivingHereLink(PROJECT, chosen)).toMatchObject({ state: 'ambiguous' });
    }
    expect(server.calls.map((call) => (call.body as { adresse: string }).adresse)).toEqual([
      ADDRESS,
      ADDRESS,
    ]);
    expect(writes()).toEqual([]);
  });

  it('après une adresse choisie et un dossier en préparation, la suite reconnaît le dossier du bien', async () => {
    state.request = {
      academia_id: FAKE_ACADEMIA_ID,
      state: 'en_cours',
      property_address: ADDRESS,
      link_url: null,
      link_expires_at: null,
    };
    expect(await refreshLivingHereLink(PROJECT)).toMatchObject({ state: 'ready', url: FAKE_LINK });
  });

  it('un dossier qu’Academia n’a plus (404) : le dire, et le geste suivant en redemande un', async () => {
    state.request = {
      academia_id: FAKE_ACADEMIA_ID,
      state: 'en_cours',
      property_address: ADDRESS,
      link_url: null,
      link_expires_at: null,
    };
    server = fakeAcademia({ readRequest: [{ status: 404, body: { erreur: 'x' } }] });
    vi.stubGlobal('fetch', server.fetch);
    expect((await refreshLivingHereLink(PROJECT)).state).toBe('failed');
    expect(written('project_academia_requests', 'update')).toEqual({ state: 'erreur' });
  });

  it('Academia en panne, au plafond, ou qui refuse : le message, rien de rangé sur le mandat', async () => {
    const { reportServerError } = await import('@/lib/app-errors/report-server-error');
    const cases: [number, string, boolean][] = [
      [
        503,
        'Academia ne répond pas pour l’instant. Réessayez dans un moment, ou collez le lien vous-même.',
        true,
      ],
      // Au plafond du jour : « réessayez demain », sans « Réessayer » (Retry-After, contrat §3).
      [
        429,
        'Academia a atteint sa limite du jour : réessayez demain, ou collez le lien vous-même.',
        false,
      ],
      [
        401,
        'Academia refuse la demande pour l’instant : l’équipe ACM Studio est prévenue. Collez le lien vous-même.',
        true,
      ],
    ];
    for (const [status, message, retry] of cases) {
      db.reset();
      vi.mocked(reportServerError).mockClear();
      server = fakeAcademia({ createRequest: [{ status }, { status }] });
      vi.stubGlobal('fetch', server.fetch);
      expect(await createLivingHereLink(PROJECT)).toEqual({ state: 'failed', message, retry });
      expect(writes()).toEqual([]);
      // Chaque échec d'Academia part au journal (M100).
      expect(reportServerError).toHaveBeenCalled();
    }
  });

  it('le dossier en erreur chez Academia : le dire, et une nouvelle demande au geste suivant', async () => {
    state.request = {
      academia_id: FAKE_ACADEMIA_ID,
      state: 'en_cours',
      property_address: ADDRESS,
      link_url: null,
      link_expires_at: null,
    };
    server = fakeAcademia({
      readRequest: [{ status: 200, body: { id: FAKE_ACADEMIA_ID, etat: 'erreur' } }],
    });
    vi.stubGlobal('fetch', server.fetch);
    expect(await refreshLivingHereLink(PROJECT)).toEqual({
      state: 'failed',
      message:
        'Academia n’a pas pu préparer le dossier de cette adresse. Vérifiez l’adresse du bien, ou collez le lien vous-même.',
      retry: true,
    });
    expect(written('project_academia_requests', 'update')).toEqual({ state: 'erreur' });
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
    expect(server.calls[0].body).toEqual({
      adresse: '1 place de la Démonstration, 06000 Nice',
      idempotence: expect.any(String),
    });
    // Ni l'adresse ni les caractéristiques du bien de la démo.
    expect(JSON.stringify(server.calls)).not.toContain('Restanques');
    expect(JSON.stringify(server.calls)).not.toContain('maison');
    expect(server.calls[0].authorization).toBe('Bearer msk_demo');
  });

  it('une adresse de plus de 300 caractères : refusée avant tout appel, la cause dite', async () => {
    state.subject = { ...state.subject, address: `${'1 chemin '.repeat(40)}Vence` };
    expect(await createLivingHereLink(PROJECT)).toEqual({
      state: 'failed',
      message:
        'L’adresse du bien est trop longue pour Academia (300 caractères au plus) : raccourcissez-la sur la fiche.',
      retry: false,
    });
    expect(server.calls).toEqual([]);
    expect(writes()).toEqual([]);
  });

  it('la clé n’est jamais dans ce que rend l’action', async () => {
    const result = await createLivingHereLink(PROJECT);
    expect(JSON.stringify(result)).not.toContain('msk_');
  });
});
