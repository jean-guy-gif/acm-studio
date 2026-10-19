import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeSupabase, type FakeResponse } from '@/test-fixtures/fake-supabase';

// Mission 100 — prouver les gestes sensibles : chaque action serveur est appelée POUR DE VRAI,
// avec un client Supabase factice. On vérifie ce que les gardes laissent passer — et surtout
// qu'un appel refusé n'écrit rien. Les règles de la base, elles, sont prouvées dans la base
// (supabase/tests/sensitive_gestures.sql, agency_isolation_all_tables.sql).

const state = vi.hoisted(() => ({
  profile: null as Record<string, unknown> | null,
  user: null as Record<string, unknown> | null,
  project: null as Record<string, unknown> | null,
  conclusion: null as Record<string, unknown> | null,
  card: null as Record<string, unknown> | null,
  // Ce que rend le référentiel des communes (geo.api.gouv.fr) ; null : il ne répond pas.
  communes: [] as { nom: string; code: string }[] | null,
  respond: (() => ({})) as (table: string, method: string) => FakeResponse,
}));

const server = fakeSupabase((calls) => state.respond(tableOf(calls), lastWrite(calls)));
const service = fakeSupabase((calls) => state.respond(tableOf(calls), lastWrite(calls)));

function tableOf(calls: { method: string; args: unknown[] }[]): string {
  const from = [...calls].reverse().find((call) => call.method === 'from' || call.method === 'rpc');
  return from ? String(from.args[0]) : '';
}
function lastWrite(calls: { method: string; args: unknown[] }[]): string {
  const methods = ['insert', 'update', 'upsert', 'delete', 'rpc', 'select'];
  const from = calls.map((call) => call.method).lastIndexOf('from');
  const chain = calls.slice(Math.max(from, 0)).map((call) => call.method);
  return methods.find((method) => chain.includes(method)) ?? '';
}

vi.mock('@/lib/auth/get-profile', () => ({ getProfile: async () => state.profile }));
vi.mock('@/lib/auth/get-user', () => ({ getUser: async () => state.user }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => server.client }));
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: () => service.client }));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('next/headers', () => ({ headers: async () => new Map<string, string>() }));
vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT ${path}`);
  },
}));
vi.mock('@/features/projects/queries/get-project', () => ({
  getProject: async () => state.project,
}));
vi.mock('@/features/meeting-conclusion/queries/get-conclusion', () => ({
  getConclusion: async () => state.conclusion,
}));
vi.mock('@/features/prospecting/queries/prospecting-card-store', () => ({
  getProspectingCards: async () => [],
  findCard: () => state.card,
}));
vi.mock('@/features/competitor-search/services/fetch-geo', () => ({
  fetchCommunes: async () => state.communes,
}));
vi.mock('@/features/team/services/deliver-invitation', () => ({
  deliverInvitation: async () => ({ ok: true, authUserId: 'auth-1' }),
}));

const AGENCY = '11111111-1111-4111-8111-111111111111';
const OTHER_AGENCY = '22222222-2222-4222-8222-222222222222';
const PROJECT = '33333333-3333-4333-8333-333333333333';
const COMPETITOR = '44444444-4444-4444-8444-444444444444';
const advisor = { id: 'u-advisor', agency_id: AGENCY, role: 'advisor', removed_at: null };
const manager = { id: 'u-manager', agency_id: AGENCY, role: 'manager', removed_at: null };
const removed = { ...advisor, removed_at: '2026-10-01T00:00:00Z' };

const form = (fields: Record<string, string>): FormData => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};
const noWrite = () => expect([...server.writes(), ...service.writes()]).toEqual([]);

beforeEach(() => {
  server.reset();
  service.reset();
  state.profile = advisor;
  state.user = null;
  state.project = null;
  state.conclusion = null;
  state.card = null;
  state.communes = [{ nom: 'Antibes', code: '06004' }];
  state.respond = () => ({});
  delete process.env.ACM_OPERATOR_EMAILS;
});

describe('conclure un rendez-vous', () => {
  const signed = {
    outcome: 'signed',
    mandate_type: 'exclusive',
    commercialization_price: '315000',
  };

  it('refuse sans session, sans rien écrire', async () => {
    const { concludeMeeting } =
      await import('@/features/meeting-conclusion/actions/conclude-meeting');
    state.profile = null;
    expect(await concludeMeeting(PROJECT, form(signed))).toEqual({
      ok: false,
      error: 'Vous devez être connecté.',
    });
    noWrite();
  });

  it('refuse le dossier d’une autre agence (introuvable pour la sienne)', async () => {
    const { concludeMeeting } =
      await import('@/features/meeting-conclusion/actions/conclude-meeting');
    state.project = null;
    const result = await concludeMeeting(PROJECT, form(signed));
    expect(result).toEqual({ ok: false, error: 'Dossier introuvable pour votre agence.' });
    noWrite();
  });

  it('refuse une issue hors liste et un mandat signé sans type', async () => {
    const { concludeMeeting } =
      await import('@/features/meeting-conclusion/actions/conclude-meeting');
    state.project = { id: PROJECT, status: 'ready_for_meeting' };
    expect((await concludeMeeting(PROJECT, form({ outcome: 'gagné' }))).ok).toBe(false);
    expect(
      (
        await concludeMeeting(
          PROJECT,
          form({ outcome: 'signed', commercialization_price: '315000' }),
        )
      ).ok,
    ).toBe(false);
    noWrite();
  });

  it('conclut par la fonction de la base, avec l’agence de la SESSION, puis mène au Suivi', async () => {
    const { concludeMeeting } =
      await import('@/features/meeting-conclusion/actions/conclude-meeting');
    state.project = { id: PROJECT, status: 'ready_for_meeting' };
    // La base n'a PAS fait entrer le dossier dans le Suivi : l'action le dit, sans rediriger.
    const stuck = await concludeMeeting(PROJECT, form(signed));
    expect(stuck.ok).toBe(false);
    expect(stuck.error).toContain('n’est pas passé dans le Suivi');
    service.reset();
    state.respond = (table) => (table === 'conclude_meeting' ? { data: true } : {});
    await expect(concludeMeeting(PROJECT, form(signed))).rejects.toThrow(/REDIRECT \/suivi/);
    expect(server.writes()).toEqual([]);
    expect(service.writes()).toEqual(['rpc conclude_meeting']);
    const args = service.calls.find((call) => call.method === 'rpc')?.args[1];
    expect(args).toMatchObject({ p_project_id: PROJECT, p_agency_id: AGENCY, p_outcome: 'signed' });
  });
});

describe('changer l’issue', () => {
  it('refuse sans session, et hors du Suivi', async () => {
    const { changeMeetingOutcome } =
      await import('@/features/meeting-conclusion/actions/change-meeting-outcome');
    state.profile = null;
    expect((await changeMeetingOutcome(PROJECT, form({ outcome: 'withdrawn' }))).ok).toBe(false);
    state.profile = advisor;
    state.project = { id: PROJECT, status: 'ready_for_meeting' };
    expect(await changeMeetingOutcome(PROJECT, form({ outcome: 'withdrawn' }))).toEqual({
      ok: false,
      error: 'Ce dossier n’est pas encore dans le Suivi.',
    });
    noWrite();
  });

  it('change l’issue d’un dossier en Suivi, cadré sur l’agence de la session', async () => {
    const { changeMeetingOutcome } =
      await import('@/features/meeting-conclusion/actions/change-meeting-outcome');
    state.project = { id: PROJECT, status: 'meeting_completed' };
    const result = await changeMeetingOutcome(PROJECT, form({ outcome: 'withdrawn' }));
    expect(result).toEqual({ ok: true });
    expect(service.writes()).toEqual(['rpc change_meeting_outcome']);
    expect(service.calls.find((call) => call.method === 'rpc')?.args[1]).toMatchObject({
      p_project_id: PROJECT,
      p_agency_id: AGENCY,
      p_outcome: 'withdrawn',
    });
  });
});

describe('archiver un dossier', () => {
  it('sans profil, renvoie vers l’ouverture d’agence sans rien écrire', async () => {
    const { archiveProjectAction } = await import('@/features/projects/actions/archive-project');
    state.profile = null;
    await expect(archiveProjectAction(form({ projectId: PROJECT }))).rejects.toThrow(
      /REDIRECT \/onboarding/,
    );
    noWrite();
  });

  it('archive (statut, jamais une suppression), dans l’agence de la session', async () => {
    const { archiveProjectAction } = await import('@/features/projects/actions/archive-project');
    await expect(archiveProjectAction(form({ projectId: PROJECT }))).rejects.toThrow(
      /REDIRECT \/builder$/,
    );
    expect(server.writes()).toEqual(['update projects']);
    expect(server.calls.find((call) => call.method === 'update')?.args[0]).toMatchObject({
      status: 'archived',
    });
    expect(server.calls).toContainEqual({ method: 'eq', args: ['agency_id', AGENCY] });
    expect(service.writes()).toEqual([]);
  });
});

describe('« Ne plus solliciter »', () => {
  const LISTING = 'seloger:26ZEJMLWB13Y';
  const card = (confirmed: boolean, opposedOn: string | null = null) => ({
    row: { confirmed, address: '8 avenue du Docteur Hochet, 06160 Antibes', opposedOn },
    sellers: [{ projectId: PROJECT }],
    copies: [
      { row: { id: 'c1', listingKey: LISTING } },
      { row: { id: 'c2', listingKey: LISTING } },
      { row: { id: 'c3', listingKey: null } },
    ],
  });
  const inserts = () =>
    server.calls.filter((call) => call.method === 'insert').map((call) => call.args[0]);
  // Mission 104 — la base relue après l'écriture : elle porte ce qui a été inséré.
  const stored = () =>
    (inserts() as { address_key?: string; listing_key?: string }[]).map((row) => ({
      address_key: row.address_key ?? null,
      listing_key: row.listing_key ?? null,
    }));
  const database = (table: string, method: string): FakeResponse =>
    table === 'prospecting_oppositions' && method === 'select' ? { data: stored() } : {};
  beforeEach(() => {
    state.respond = database;
  });

  it('refuse un membre retiré, un concurrent hors agence et une adresse non confirmée', async () => {
    const { addProspectingOpposition } =
      await import('@/features/prospecting/actions/add-prospecting-opposition');
    state.profile = removed;
    state.card = card(true);
    expect((await addProspectingOpposition(PROJECT, 'c1')).ok).toBe(false);
    state.profile = advisor;
    state.card = null;
    expect(await addProspectingOpposition(PROJECT, 'c1')).toEqual({
      ok: false,
      error: 'Concurrent introuvable pour votre agence.',
    });
    // Mission 107 — sans adresse confirmée ni annonce, il n'y a rien à inscrire.
    state.card = {
      ...card(false),
      copies: [{ row: { id: 'c1', listingKey: null } }],
    };
    expect((await addProspectingOpposition(PROJECT, 'c1')).ok).toBe(false);
    noWrite();
  });

  // Mission 107 — « Ne plus solliciter » avant l'adresse confirmée : l'opposition porte sur les
  // annonces de la carte, et la bloque partout où elles apparaissent.
  it('sans adresse confirmée : inscrit les annonces de la carte, sans clé d’adresse', async () => {
    const { addProspectingOpposition } =
      await import('@/features/prospecting/actions/add-prospecting-opposition');
    state.card = card(false);
    expect(await addProspectingOpposition(PROJECT, 'c1')).toEqual({ ok: true });
    expect(inserts()).toEqual([
      { agency_id: AGENCY, created_by: 'u-advisor', listing_key: LISTING },
    ]);
  });

  it('inscrit la clé de l’adresse RELUE en base, pour l’agence et l’auteur de la session', async () => {
    const { addProspectingOpposition } =
      await import('@/features/prospecting/actions/add-prospecting-opposition');
    state.card = card(true);
    expect(await addProspectingOpposition(PROJECT, 'c1')).toEqual({ ok: true });
    // Mission 102 — la clé de l'immeuble, et l'identité de l'annonce de la carte (une fois).
    expect(server.writes()).toEqual([
      'insert prospecting_oppositions',
      'insert prospecting_oppositions',
    ]);
    expect(inserts()).toEqual([
      {
        agency_id: AGENCY,
        created_by: 'u-advisor',
        address_key: '8 avenue du docteur hochet antibes',
      },
      { agency_id: AGENCY, created_by: 'u-advisor', listing_key: LISTING },
    ]);
  });

  // Mission 102 — une opposition inscrite à la main, pour une adresse qui n'est sur aucune carte.
  it('à la main : refuse un membre retiré et une adresse incomplète, sans rien écrire', async () => {
    const { addManualOpposition } =
      await import('@/features/prospecting/actions/add-prospecting-opposition');
    state.profile = removed;
    expect((await addManualOpposition('8 avenue Hochet, 06160 Antibes')).ok).toBe(false);
    state.profile = advisor;
    for (const address of [null, '', 'rue des Pins', 'Antibes', '8', 'x'.repeat(201)]) {
      expect(await addManualOpposition(address)).toEqual({
        ok: false,
        error: 'Saisissez l’adresse complète : numéro, rue, code postal, ville.',
      });
    }
    noWrite();
  });

  // Mission 103 — sans commune reconnue, la clé ne rejoindrait aucune carte : rien n'est inscrit.
  it('à la main : sans commune reconnue, rien n’est écrit', async () => {
    const { addManualOpposition, checkManualOpposition } =
      await import('@/features/prospecting/actions/add-prospecting-opposition');
    // Ni code postal ni commune.
    expect((await addManualOpposition('8 avenue Hochet')).ok).toBe(false);
    // Mission 104 — le référentiel ne répond pas, et seul le code postal est donné : la commune
    // doit être tapée. Une panne n'est jamais lue comme « aucune commune ».
    state.communes = null;
    expect(await addManualOpposition('8 avenue Hochet 06160')).toEqual({
      ok: false,
      error: 'Service des communes indisponible : tapez le nom de la commune.',
    });
    // Un code postal à plusieurs communes : il faut choisir, et un choix hors liste ne vaut rien.
    state.communes = [
      { nom: 'Cabris', code: '06026' },
      { nom: 'Peymeinade', code: '06095' },
    ];
    expect(await checkManualOpposition('3 route de Grasse 06530')).toEqual({
      ok: true,
      status: 'choose',
      communes: [
        { code: '06026', name: 'Cabris' },
        { code: '06095', name: 'Peymeinade' },
      ],
    });
    expect((await addManualOpposition('3 route de Grasse 06530')).ok).toBe(false);
    expect((await addManualOpposition('3 route de Grasse 06530', '06004')).ok).toBe(false);
    // Vérifier n'écrit jamais, et un membre retiré ne vérifie rien.
    expect(await checkManualOpposition('3 route de Grasse 06530', '06095')).toEqual({
      ok: true,
      status: 'ready',
      display: '3 route de Grasse, Peymeinade',
      verified: true,
    });
    state.profile = removed;
    expect((await checkManualOpposition('3 route de Grasse 06530', '06095')).ok).toBe(false);
    noWrite();
  });

  // Mission 104 — le référentiel ne répond pas, mais la commune est tapée : l'opposition est
  // inscrite, sa clé construite comme celle des cartes (alias compris), et marquée.
  it('à la main, service des communes en panne : la commune tapée suffit, ligne marquée', async () => {
    const { addManualOpposition, checkManualOpposition } =
      await import('@/features/prospecting/actions/add-prospecting-opposition');
    state.communes = null;
    expect(await checkManualOpposition('8 bis av. Hochet, 06160 Juan-les-Pins')).toEqual({
      ok: true,
      status: 'ready',
      display: '8 bis av. Hochet, Juan-les-Pins',
      verified: false,
    });
    expect(await addManualOpposition('8 bis av. Hochet, 06160 Juan-les-Pins')).toEqual({
      ok: true,
    });
    expect(inserts()).toEqual([
      {
        agency_id: AGENCY,
        created_by: 'u-advisor',
        address_key: '8 avenue hochet antibes',
        commune_unverified: true,
        // Mission 105 — la commune tapée, gardée pour la revérification de la nuit.
        commune_typed: 'Juan-les-Pins',
      },
    ]);
    // Paris sans arrondissement ne se devine pas, même en panne.
    expect((await addManualOpposition('12 rue Lecourbe, Paris')).ok).toBe(false);
  });

  it('à la main : la commune déduite du code postal entre dans la clé, comme sur une carte', async () => {
    const { addManualOpposition } =
      await import('@/features/prospecting/actions/add-prospecting-opposition');
    expect(await addManualOpposition('8 avenue Hochet 06160')).toEqual({ ok: true });
    state.communes = [
      { nom: 'Cabris', code: '06026' },
      { nom: 'Peymeinade', code: '06095' },
    ];
    expect(await addManualOpposition('3 route de Grasse 06530', '06095')).toEqual({ ok: true });
    expect(inserts()).toEqual([
      { agency_id: AGENCY, created_by: 'u-advisor', address_key: '8 avenue hochet antibes' },
      { agency_id: AGENCY, created_by: 'u-advisor', address_key: '3 route de grasse peymeinade' },
    ]);
  });

  it('à la main : inscrit la seule clé de l’adresse tapée, pour l’agence de la session', async () => {
    const { addManualOpposition } =
      await import('@/features/prospecting/actions/add-prospecting-opposition');
    expect(await addManualOpposition('8 bis av. Hochet, 2e étage — 06160 Juan-les-Pins')).toEqual({
      ok: true,
    });
    expect(inserts()).toEqual([
      { agency_id: AGENCY, created_by: 'u-advisor', address_key: '8 avenue hochet antibes' },
    ]);
  });

  // Mission 102 — l'adresse d'un bien opposé ne se confirme ni ne se corrige : l'action refuse,
  // que l'opposition soit sur la carte, sur l'adresse du concurrent ou sur son annonce.
  describe('corriger l’adresse d’un bien « Ne plus solliciter »', () => {
    const REFUSED = { ok: false, error: 'Ce propriétaire a demandé à ne plus être sollicité.' };
    const competitor = {
      locator_address: '8 avenue du Docteur Hochet, 06160 Antibes',
      locator_confirmed: true,
      locator_source: 'dpe',
      listing_url: 'https://www.seloger.com/annonces/achat/maison/antibes-06/26ZEJMLWB13Y',
    };
    const typed = { mode: 'typed', address: '10 avenue Foch, 06160 Juan-les-Pins' };
    const withList = (rows: Record<string, unknown>[]) => {
      state.respond = (table) => (table === 'comparables' ? { data: competitor } : { data: rows });
    };

    it('refusé quand la carte est opposée', async () => {
      const { confirmCompetitorAddress } =
        await import('@/features/competitor-locator/actions/confirm-competitor-address');
      state.card = card(true, '2026-10-11T09:00:00.000Z');
      withList([]);
      expect(await confirmCompetitorAddress(PROJECT, 'c1', typed)).toEqual(REFUSED);
      expect(await confirmCompetitorAddress(PROJECT, 'c1', { mode: 'accept' })).toEqual(REFUSED);
      noWrite();
    });

    it('refusé hors carte : par l’adresse du concurrent, écrite autrement', async () => {
      const { confirmCompetitorAddress } =
        await import('@/features/competitor-locator/actions/confirm-competitor-address');
      withList([
        {
          address_key: '8 avenue du docteur hochet 2e etage 06160 juan les pins',
          listing_key: null,
          requested_at: '2026-10-11T09:00:00.000Z',
        },
      ]);
      expect(await confirmCompetitorAddress(PROJECT, 'c1', typed)).toEqual(REFUSED);
      noWrite();
    });

    it('refusé hors carte : par l’annonce du concurrent', async () => {
      const { confirmCompetitorAddress } =
        await import('@/features/competitor-locator/actions/confirm-competitor-address');
      withList([
        { address_key: null, listing_key: LISTING, requested_at: '2026-10-11T09:00:00.000Z' },
      ]);
      expect(await confirmCompetitorAddress(PROJECT, 'c1', typed)).toEqual(REFUSED);
      noWrite();
    });

    it('une liste illisible n’est pas une liste vide : rien n’est écrit', async () => {
      const { confirmCompetitorAddress } =
        await import('@/features/competitor-locator/actions/confirm-competitor-address');
      state.respond = (table) =>
        table === 'comparables' ? { data: competitor } : { data: null, error: { code: 'X' } };
      await expect(confirmCompetitorAddress(PROJECT, 'c1', typed)).rejects.toThrow();
      noWrite();
    });

    it('un bien libre se corrige toujours', async () => {
      const { confirmCompetitorAddress } =
        await import('@/features/competitor-locator/actions/confirm-competitor-address');
      state.respond = (table, method) =>
        table === 'comparables'
          ? method === 'update'
            ? { data: [{ id: 'c1' }] }
            : { data: competitor }
          : { data: [] };
      expect(await confirmCompetitorAddress(PROJECT, 'c1', typed)).toEqual({ ok: true });
      expect(server.writes()).toEqual(['update comparables']);
    });
  });

  it('une adresse déjà inscrite est une demande tenue, pas une erreur', async () => {
    const { addProspectingOpposition } =
      await import('@/features/prospecting/actions/add-prospecting-opposition');
    const { addressKey } = await import('@/features/prospecting/services/address-key');
    state.card = card(true);
    // Déjà inscrite : l'insertion bute sur la clé, la relecture la trouve.
    state.respond = (_table, method) =>
      method === 'insert'
        ? { error: { code: '23505' } }
        : {
            data: [
              {
                address_key: addressKey('8 avenue du Docteur Hochet, 06160 Antibes'),
                listing_key: 'seloger:26ZEJMLWB13Y',
              },
            ],
          };
    expect(await addProspectingOpposition(PROJECT, 'c1')).toEqual({ ok: true });
    state.respond = () => ({ error: { code: '42501' } });
    expect((await addProspectingOpposition(PROJECT, 'c1')).ok).toBe(false);
  });

  // Mission 104 — « Inscrit » seulement sur une écriture confirmée en base.
  it('une écriture que la relecture ne retrouve pas n’est pas « inscrite »', async () => {
    const { addProspectingOpposition, addManualOpposition } =
      await import('@/features/prospecting/actions/add-prospecting-opposition');
    state.card = card(true);
    state.respond = () => ({ data: [] });
    const refused = await addProspectingOpposition(PROJECT, 'c1');
    expect(refused).toEqual({
      ok: false,
      error:
        'L’inscription n’a pas été confirmée : l’adresse n’est pas sur la liste « Ne plus solliciter ». Réessayez.',
    });
    expect((await addManualOpposition('8 avenue Hochet 06160')).ok).toBe(false);
    // La relecture qui échoue elle-même ne vaut pas confirmation.
    state.respond = (_table, method) => (method === 'select' ? { error: { code: 'X' } } : {});
    expect((await addProspectingOpposition(PROJECT, 'c1')).ok).toBe(false);
  });
});

describe('relance', () => {
  it('ne s’enregistre que sur un dossier en Suivi encore « à relancer »', async () => {
    const { recordFollowUpContact } =
      await import('@/features/meeting-conclusion/actions/record-follow-up-contact');
    state.profile = null;
    expect((await recordFollowUpContact(PROJECT, form({}))).ok).toBe(false);
    state.profile = advisor;
    expect((await recordFollowUpContact(PROJECT, form({}))).ok).toBe(false); // dossier introuvable
    state.project = { id: PROJECT, status: 'ready_for_meeting' };
    expect((await recordFollowUpContact(PROJECT, form({}))).ok).toBe(false);
    state.project = { id: PROJECT, status: 'meeting_completed' };
    state.conclusion = { outcome: 'signed' };
    expect(await recordFollowUpContact(PROJECT, form({}))).toEqual({
      ok: false,
      error: 'Ce dossier n’est plus « à relancer ».',
    });
    state.conclusion = { outcome: 'follow_up' };
    expect((await recordFollowUpContact(PROJECT, form({ note: 'a'.repeat(201) }))).ok).toBe(false);
    noWrite();
  });

  it('écrit une ligne : note d’une ligne, auteur et agence de la session, sans date', async () => {
    const { recordFollowUpContact } =
      await import('@/features/meeting-conclusion/actions/record-follow-up-contact');
    state.project = { id: PROJECT, status: 'meeting_completed' };
    state.conclusion = { outcome: 'follow_up' };
    expect(
      await recordFollowUpContact(PROJECT, form({ note: ' Rappelé :\n  il réfléchit ' })),
    ).toEqual({ ok: true });
    expect(server.calls.find((call) => call.method === 'insert')?.args[0]).toEqual({
      project_id: PROJECT,
      agency_id: AGENCY,
      author_id: 'u-advisor',
      note: 'Rappelé : il réfléchit',
      // Mission 105 — sans date choisie : celle proposée (7 jours, sans motif « réfléchit »).
      next_follow_up_on: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });
  });

  // Mission 105 — la date de prochaine relance : celle de l'écran, relue ; jamais dans le passé.
  it('la date de prochaine relance se relit : passée ou au-delà d’un an, rien n’est écrit', async () => {
    const { recordFollowUpContact } =
      await import('@/features/meeting-conclusion/actions/record-follow-up-contact');
    state.project = { id: PROJECT, status: 'meeting_completed' };
    state.conclusion = { outcome: 'follow_up', followUpMotive: 'thinking_price' };
    for (const day of ['2020-01-01', '2099-01-01', 'demain']) {
      expect((await recordFollowUpContact(PROJECT, form({ next_follow_up_on: day }))).ok).toBe(
        false,
      );
    }
    noWrite();
  });
});

describe('invitations', () => {
  const invite = form({ email: 'nouveau@agence.fr', role: 'advisor' });

  it('un conseiller, un membre retiré ou un visiteur n’invite, ne relance ni n’annule', async () => {
    const { inviteMember } = await import('@/features/team/actions/invite-member');
    const { resendInvitation } = await import('@/features/team/actions/resend-invitation');
    const { cancelInvitation } = await import('@/features/team/actions/cancel-invitation');
    for (const profile of [advisor, { ...manager, removed_at: '2026-10-01T00:00:00Z' }, null]) {
      state.profile = profile;
      expect((await inviteMember(invite)).ok).toBe(false);
      expect((await resendInvitation('inv-1')).ok).toBe(false);
      expect((await cancelInvitation('inv-1')).ok).toBe(false);
    }
    noWrite();
  });

  it('un manager invite dans SON agence, sous son nom', async () => {
    const { inviteMember } = await import('@/features/team/actions/invite-member');
    state.profile = manager;
    state.respond = (table, method) =>
      table === 'agency_invitations' && method === 'insert' ? { data: { id: 'inv-1' } } : {};
    expect((await inviteMember(invite)).ok).toBe(true);
    expect(service.calls.find((call) => call.method === 'insert')?.args[0]).toEqual({
      agency_id: AGENCY,
      email: 'nouveau@agence.fr',
      role: 'advisor',
      invited_by: 'u-manager',
    });
  });

  it('une adresse qui a déjà un compte n’est pas invitée', async () => {
    const { inviteMember } = await import('@/features/team/actions/invite-member');
    state.profile = manager;
    state.respond = (table) =>
      table === 'profiles'
        ? {
            data: [
              {
                id: 'déjà-là',
                agency_id: OTHER_AGENCY,
                removed_at: null,
                email: 'Nouveau@Agence.fr',
              },
            ],
          }
        : {};
    expect(await inviteMember(invite)).toEqual({
      ok: false,
      error: 'Cette adresse a déjà un compte dans une agence.',
    });
    expect(service.writes()).toEqual([]);
  });

  // Mission 108 — l'adresse se compare à l'identique, sans joker ; un membre retiré de l'agence se
  // réintègre ; une lecture en échec n'invite pas.
  it('une adresse voisine (joker « _ ») n’est pas une adresse déjà inscrite', async () => {
    const { inviteMember } = await import('@/features/team/actions/invite-member');
    state.profile = manager;
    state.respond = (table) =>
      table === 'profiles'
        ? {
            data: [
              {
                id: 'autre',
                agency_id: OTHER_AGENCY,
                removed_at: null,
                email: 'nouveauxagence@agence.fr',
              },
            ],
          }
        : table === 'agency_invitations'
          ? { data: { id: 'inv-9' } }
          : {};
    await inviteMember(form({ email: 'nouveau_agence@agence.fr', role: 'advisor' }));
    expect(service.writes()).toContain('insert agency_invitations');
    const filter = service.calls.find((call) => call.method === 'ilike');
    expect(filter?.args[1]).toBe('nouveau\\_agence@agence.fr');
  });

  it('un membre retiré de l’agence : « Réintégrer » est proposé, rien n’est écrit', async () => {
    const { inviteMember } = await import('@/features/team/actions/invite-member');
    state.profile = manager;
    state.respond = (table) =>
      table === 'profiles'
        ? {
            data: [
              {
                id: 'ancien',
                agency_id: AGENCY,
                removed_at: '2026-10-01',
                email: 'nouveau@agence.fr',
              },
            ],
          }
        : {};
    expect(await inviteMember(invite)).toEqual({
      ok: false,
      error: 'Cette personne a été retirée de votre agence : vous pouvez la réintégrer.',
      reinstateMemberId: 'ancien',
    });
    expect(service.writes()).toEqual([]);
  });

  it('une lecture en échec n’invite pas', async () => {
    const { inviteMember } = await import('@/features/team/actions/invite-member');
    state.profile = manager;
    state.respond = (table) => (table === 'profiles' ? { error: { message: 'down' } } : {});
    expect((await inviteMember(invite)).ok).toBe(false);
    expect(service.writes()).toEqual([]);
  });

  it('réintégrer : manager seulement, membre retiré de SON agence seulement', async () => {
    const { reinstateMember } = await import('@/features/team/actions/reinstate-member');
    state.profile = { ...manager, role: 'advisor' };
    expect((await reinstateMember('ancien')).ok).toBe(false);
    expect(service.writes()).toEqual([]);

    state.profile = manager;
    state.respond = (table) => (table === 'profiles' ? { data: [{ id: 'ancien' }] } : {});
    expect(await reinstateMember('ancien')).toEqual({ ok: true });
    const scoped = service.calls.filter((call) => call.method === 'eq').map((call) => call.args);
    expect(scoped).toContainEqual(['agency_id', AGENCY]);
    expect(service.calls.some((call) => call.method === 'not')).toBe(true);
  });

  it('un manager ne relance ni n’annule l’invitation d’une AUTRE agence, ni une invitation acceptée', async () => {
    const { resendInvitation } = await import('@/features/team/actions/resend-invitation');
    const { cancelInvitation } = await import('@/features/team/actions/cancel-invitation');
    state.profile = manager;
    for (const invitation of [
      {
        id: 'inv-1',
        email: 'x@y.fr',
        agency_id: OTHER_AGENCY,
        accepted_at: null,
        auth_user_id: 'a',
      },
      {
        id: 'inv-1',
        email: 'x@y.fr',
        agency_id: AGENCY,
        accepted_at: '2026-10-02',
        auth_user_id: 'a',
      },
    ]) {
      state.respond = () => ({ data: invitation });
      expect(await resendInvitation('inv-1')).toEqual({
        ok: false,
        error: 'Invitation introuvable.',
      });
      expect(await cancelInvitation('inv-1')).toEqual({
        ok: false,
        error: 'Invitation introuvable.',
      });
    }
    expect(service.writes()).toEqual([]);
  });

  it('un manager annule une invitation en attente de son agence', async () => {
    const { cancelInvitation } = await import('@/features/team/actions/cancel-invitation');
    state.profile = manager;
    state.respond = (_table, method) =>
      method === 'delete'
        ? {}
        : { data: { id: 'inv-1', agency_id: AGENCY, accepted_at: null, auth_user_id: null } };
    expect(await cancelInvitation('inv-1')).toEqual({ ok: true });
    expect(service.writes()).toEqual(['delete agency_invitations']);
  });
});

describe('réglages de la recherche', () => {
  const automatic = {
    sector: 'auto',
    priceMin: '',
    priceMax: '',
    roomsMin: '',
    roomsMax: '',
    surfaceMin: '',
    surfaceMax: '',
    autoWiden: true,
  } as const;

  it('refuse sans session, et une borne seule, sans rien écrire', async () => {
    const { saveSearchSettings } =
      await import('@/features/competitor-search/actions/save-search-settings');
    state.profile = null;
    expect((await saveSearchSettings(PROJECT, automatic)).ok).toBe(false);
    state.profile = advisor;
    expect((await saveSearchSettings(PROJECT, { ...automatic, priceMin: '300000' })).ok).toBe(
      false,
    );
    noWrite();
  });

  it('écrit sur le dossier de l’agence de la session, jamais sur un dossier archivé', async () => {
    const { saveSearchSettings } =
      await import('@/features/competitor-search/actions/save-search-settings');
    state.respond = () => ({ data: { id: PROJECT } });
    expect((await saveSearchSettings(PROJECT, automatic)).ok).toBe(true);
    expect(server.writes()).toEqual(['update projects']);
    expect(server.calls).toContainEqual({ method: 'eq', args: ['agency_id', AGENCY] });
    expect(server.calls).toContainEqual({ method: 'neq', args: ['status', 'archived'] });
    // Aucune ligne touchée (autre agence, dossier archivé) : c'est un échec, et il se dit.
    state.respond = () => ({ data: null });
    expect((await saveSearchSettings(PROJECT, automatic)).ok).toBe(false);
  });
});

describe('plafond de recherche d’une agence', () => {
  const laurent = { id: 'u-op', email: 'laurent@start-academy.fr' };

  it('refuse tout compte hors de la liste — manager compris — sans rien écrire', async () => {
    const { setAgencySearchCap } =
      await import('@/features/operations/actions/set-agency-search-cap');
    process.env.ACM_OPERATOR_EMAILS = 'laurent@start-academy.fr';
    for (const user of [null, { id: 'u-manager', email: 'manager@agence.fr' }]) {
      state.user = user;
      state.profile = manager;
      expect(await setAgencySearchCap(AGENCY, form({ cap: '500' }))).toEqual({
        ok: false,
        error: 'Réservé aux comptes autorisés.',
      });
    }
    // Sans variable d'environnement, personne — pas même l'adresse attendue.
    delete process.env.ACM_OPERATOR_EMAILS;
    state.user = laurent;
    expect((await setAgencySearchCap(AGENCY, form({ cap: '500' }))).ok).toBe(false);
    // Un compte autorisé mais retiré de son agence n'y a plus droit.
    process.env.ACM_OPERATOR_EMAILS = 'laurent@start-academy.fr';
    state.profile = removed;
    expect((await setAgencySearchCap(AGENCY, form({ cap: '500' }))).ok).toBe(false);
    noWrite();
  });

  it('refuse un plafond mal formé et une agence inconnue', async () => {
    const { setAgencySearchCap } =
      await import('@/features/operations/actions/set-agency-search-cap');
    process.env.ACM_OPERATOR_EMAILS = 'laurent@start-academy.fr';
    state.user = laurent;
    for (const cap of ['', '-1', '12,5', '1001']) {
      expect((await setAgencySearchCap(AGENCY, form({ cap }))).ok).toBe(false);
    }
    expect((await setAgencySearchCap('pas-un-id', form({ cap: '30' }))).ok).toBe(false);
    state.respond = () => ({ data: null }); // l'agence n'existe pas
    expect(await setAgencySearchCap(AGENCY, form({ cap: '30' }))).toEqual({
      ok: false,
      error: 'Agence introuvable.',
    });
    expect(service.writes()).toEqual([]);
  });

  it('un compte autorisé règle le plafond, en centimes, sous son nom', async () => {
    const { setAgencySearchCap } =
      await import('@/features/operations/actions/set-agency-search-cap');
    process.env.ACM_OPERATOR_EMAILS = 'laurent@start-academy.fr';
    state.user = laurent;
    state.respond = (table) => (table === 'agencies' ? { data: { id: AGENCY } } : {});
    expect(await setAgencySearchCap(AGENCY, form({ cap: '0' }))).toEqual({ ok: true });
    expect(service.writes()).toEqual(['upsert agency_search_budgets']);
    expect(service.calls.find((call) => call.method === 'upsert')?.args[0]).toMatchObject({
      agency_id: AGENCY,
      monthly_cap_cents: 0,
      updated_by: 'u-op',
    });
  });
});

// Mission 104 — rouvrir un Live figé par erreur : les seuls opérateurs, avec un motif ; la base
// trace qui, quand, motif et les réponses effacées (supabase/tests/live_reopening.sql).
describe('rouvrir un Live figé par erreur', () => {
  const laurent = { id: 'u-op', email: 'laurent@start-academy.fr' };
  const MOTIF = 'Essai fait sur un vrai dossier, sans le vendeur';

  it('refusé à un manager, à un conseiller et sans motif — sans rien écrire', async () => {
    const { reopenLive } = await import('@/features/live-reopening/actions/reopen-live');
    process.env.ACM_OPERATOR_EMAILS = 'laurent@start-academy.fr';
    for (const [user, profile] of [
      [{ id: 'u-manager', email: 'manager@agence.fr' }, manager],
      [{ id: 'u-advisor', email: 'conseiller@agence.fr' }, advisor],
      [null, manager],
    ] as const) {
      state.user = user;
      state.profile = profile;
      expect(await reopenLive(PROJECT, MOTIF)).toEqual({
        ok: false,
        error: 'Réservé aux comptes autorisés.',
      });
    }
    state.user = laurent;
    state.profile = advisor;
    for (const reason of [undefined, '', '   ', 'oups', 'x'.repeat(501)]) {
      expect((await reopenLive(PROJECT, reason)).ok).toBe(false);
    }
    expect((await reopenLive('pas-un-dossier', MOTIF)).ok).toBe(false);
    noWrite();
  });

  it('un opérateur rouvre : un seul appel au serveur, avec son identité et son motif', async () => {
    const { reopenLive } = await import('@/features/live-reopening/actions/reopen-live');
    process.env.ACM_OPERATOR_EMAILS = 'laurent@start-academy.fr';
    state.user = laurent;
    state.profile = advisor;
    state.respond = () => ({ data: { responses: 4, summary: true } });
    expect(await reopenLive(PROJECT, `  ${MOTIF}  `)).toEqual({ ok: true, responses: 4 });
    expect(server.writes()).toEqual([]);
    expect(service.writes()).toEqual(['rpc reopen_live']);
    expect(service.calls.find((call) => call.method === 'rpc')?.args[1]).toEqual({
      p_project_id: PROJECT,
      p_operator_id: 'u-op',
      p_operator_email: 'laurent@start-academy.fr',
      p_reason: MOTIF,
    });
  });

  it('un dossier conclu ou archivé ne se rouvre pas : la base refuse, l’écran le dit', async () => {
    const { reopenLive } = await import('@/features/live-reopening/actions/reopen-live');
    process.env.ACM_OPERATOR_EMAILS = 'laurent@start-academy.fr';
    state.user = laurent;
    state.profile = advisor;
    state.respond = () => ({ error: { code: 'P0001' } });
    const result = await reopenLive(PROJECT, MOTIF);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(/ne se rouvre pas/);
  });
});

// Mission 107 — une opposition « commune inconnue » se corrige, par un manager seulement ; rien
// n'est retiré : une ligne s'ajoute, l'alerte de l'ancienne est levée.
describe('corriger une alerte « commune inconnue »', () => {
  const ALERT = '55555555-5555-4555-8555-555555555555';
  const row = {
    id: ALERT,
    address_key: '14 chemin des oliviers cagnes sur mere',
    commune_typed: 'Cagnes sur Mère',
  };

  it('refusé à un conseiller et à un membre retiré, sans rien écrire', async () => {
    const { correctOppositionCommune, markOppositionAlertTreated } =
      await import('@/features/prospecting/actions/resolve-unknown-commune');
    state.respond = () => ({ data: row });
    for (const profile of [advisor, { ...manager, removed_at: '2026-10-01T00:00:00Z' }]) {
      state.profile = profile;
      expect((await correctOppositionCommune(ALERT, 'Cagnes-sur-Mer')).ok).toBe(false);
      expect((await markOppositionAlertTreated(ALERT)).ok).toBe(false);
    }
    noWrite();
  });

  it('un manager corrige : la clé de la carte s’ajoute, l’alerte est levée, rien n’est retiré', async () => {
    const { correctOppositionCommune } =
      await import('@/features/prospecting/actions/resolve-unknown-commune');
    state.profile = manager;
    state.communes = [{ nom: 'Cagnes-sur-Mer', code: '06027' }];
    state.respond = (_table, method) => (method === 'select' ? { data: row } : {});
    expect(await correctOppositionCommune(ALERT, 'Cagnes-sur-Mer')).toEqual({ ok: true });
    expect(service.writes()).toEqual([
      'insert prospecting_oppositions',
      'update prospecting_oppositions',
    ]);
    expect(service.calls.find((call) => call.method === 'insert')?.args[0]).toEqual({
      agency_id: AGENCY,
      created_by: 'u-manager',
      address_key: '14 chemin des oliviers cagnes sur mer',
    });
    expect(service.calls.find((call) => call.method === 'update')?.args[0]).toMatchObject({
      commune_unknown: false,
      commune_unverified: false,
    });
    expect(service.writes()).not.toContain('delete prospecting_oppositions');
  });
});

// Mission 108 — les finitions de l'audit n°5, éprouvées sur les actions elles-mêmes.
describe('Mission 108', () => {
  it('conclure « à relancer » pose la date de première relance (un mois pour « Réfléchit au prix »)', async () => {
    const { concludeMeeting } =
      await import('@/features/meeting-conclusion/actions/conclude-meeting');
    const { defaultNextFollowUpOn } =
      await import('@/features/meeting-conclusion/services/follow-up-contacts');
    state.project = { id: PROJECT, status: 'ready_for_meeting' };
    state.respond = (table) => (table === 'conclude_meeting' ? { data: true } : {});
    const followUp = { outcome: 'follow_up', follow_up_motive: 'thinking_price' };
    await expect(concludeMeeting(PROJECT, form(followUp))).rejects.toThrow(/REDIRECT/);
    const args = service.calls.find((call) => call.method === 'rpc')?.args[1];
    expect(args).toMatchObject({
      p_next_follow_up_on: defaultNextFollowUpOn('thinking_price', new Date()),
    });

    // Une date impossible est refusée, rien n'est écrit.
    service.reset();
    expect(
      await concludeMeeting(PROJECT, form({ ...followUp, next_follow_up_on: '2001-01-01' })),
    ).toMatchObject({ ok: false });
    expect(service.writes()).toEqual([]);
  });

  describe('l’adresse saisie par le conseiller exige une commune reconnue', () => {
    const competitor = {
      locator_address: null,
      locator_confirmed: false,
      locator_source: null,
      listing_url: null,
    };
    const respond = () => {
      state.respond = (table, method) =>
        table === 'comparables'
          ? method === 'update'
            ? { data: [{ id: 'c1' }] }
            : { data: competitor }
          : { data: [] };
    };
    const written = () =>
      server.calls.find((call) => call.method === 'update')?.args[0] as
        { locator_address?: string } | undefined;

    it('sans commune : refusée, rien n’est écrit', async () => {
      const { confirmCompetitorAddress } =
        await import('@/features/competitor-locator/actions/confirm-competitor-address');
      respond();
      const result = await confirmCompetitorAddress(PROJECT, 'c1', {
        mode: 'typed',
        address: '14 chemin des Oliviers',
      });
      expect(result.ok).toBe(false);
      expect(server.writes()).toEqual([]);
    });

    it('commune reconnue par le code postal : écrite « rue, code postal commune »', async () => {
      const { confirmCompetitorAddress } =
        await import('@/features/competitor-locator/actions/confirm-competitor-address');
      const { addressKey } = await import('@/features/prospecting/services/address-key');
      respond();
      expect(
        await confirmCompetitorAddress(PROJECT, 'c1', {
          mode: 'typed',
          address: '14 chemin des Oliviers 06600',
        }),
      ).toEqual({ ok: true });
      expect(written()?.locator_address).toBe('14 chemin des Oliviers, 06600 Antibes');
      // Sa clé est celle d'une opposition inscrite à la main pour la même adresse.
      expect(addressKey(written()?.locator_address ?? '')).toBe(
        addressKey('14 chemin des Oliviers, Antibes'),
      );
    });

    it('la commune tapée, reconnue, reste écrite telle quelle (nom d’usage compris)', async () => {
      const { confirmCompetitorAddress } =
        await import('@/features/competitor-locator/actions/confirm-competitor-address');
      const { addressKey } = await import('@/features/prospecting/services/address-key');
      respond();
      expect(
        await confirmCompetitorAddress(PROJECT, 'c1', {
          mode: 'typed',
          address: '12 boulevard de la Tournée, 06160 Juan-les-Pins',
        }),
      ).toEqual({ ok: true });
      expect(written()?.locator_address).toBe('12 boulevard de la Tournée, 06160 Juan-les-Pins');
      expect(addressKey(written()?.locator_address ?? '')).toBe(
        addressKey('12 boulevard de la Tournée, Antibes'),
      );
    });

    it('service des communes en panne : la commune tapée suffit, et le journal le note', async () => {
      const { confirmCompetitorAddress } =
        await import('@/features/competitor-locator/actions/confirm-competitor-address');
      respond();
      state.communes = null;
      expect(
        await confirmCompetitorAddress(PROJECT, 'c1', {
          mode: 'typed',
          address: '14 chemin des Oliviers, Cagnes-sur-Mer',
        }),
      ).toEqual({ ok: true });
      expect(written()?.locator_address).toBe('14 chemin des Oliviers, Cagnes-sur-Mer');
      const logged = service.calls.find((call) => call.method === 'insert')?.args[0] as {
        message: string;
      };
      expect(service.writes()).toContain('insert app_errors');
      expect(logged.message).toContain('commune non vérifiée');
      expect(logged.message).toContain('Cagnes-sur-Mer');
      // Jamais l'adresse elle-même (M100).
      expect(logged.message).not.toContain('Oliviers');
    });
  });

  it('relecture des prix : une écriture refusée compte « illisible » et part au journal', async () => {
    const { refreshCompetitorPrice } =
      await import('@/features/competitor-refresh/actions/refresh-competitor-price');
    const { listingPayload } =
      await import('@/features/competitor-search/services/listing-payload');
    const url = 'https://www.seloger.com/annonces/achat/maison/antibes-06/26ZEJMLWB13Y.htm';
    state.respond = (table, method) =>
      table === 'projects'
        ? { data: { id: PROJECT, status: 'meeting_completed' } }
        : table === 'comparables'
          ? method === 'update'
            ? { error: { message: 'refusé' } }
            : { data: { id: COMPETITOR, price: 300_000, listing_url: url, listing_gone_at: null } }
          : {};
    const payload = listingPayload(url, '<html><body>Annonce retirée</body></html>', null);
    payload.set('gone', 'redirect');
    expect(await refreshCompetitorPrice(PROJECT, COMPETITOR, payload)).toEqual({
      status: 'unreadable',
    });
    expect(service.writes()).toContain('insert app_errors');
  });

  it('« Garder comme mes réglages par défaut » : sur son profil seulement, relu par le serveur', async () => {
    const { saveSearchDefaults } =
      await import('@/features/competitor-search/actions/save-search-defaults');
    const { DEFAULT_SEARCH_SETTINGS, settingsToInput } =
      await import('@/features/competitor-search/services/search-settings');
    const input = settingsToInput({
      ...DEFAULT_SEARCH_SETTINGS,
      sector: { kind: 'radius', km: 2 },
    });
    state.profile = removed;
    expect((await saveSearchDefaults(input)).ok).toBe(false);
    noWrite();

    state.profile = advisor;
    state.respond = (table) => (table === 'profiles' ? { data: { id: advisor.id } } : {});
    const saved = await saveSearchDefaults(input);
    expect(saved.ok).toBe(true);
    expect(service.writes()).toEqual(['update profiles']);
    const eqs = service.calls.filter((call) => call.method === 'eq').map((call) => call.args);
    expect(eqs).toContainEqual(['id', advisor.id]);
    const patch = service.calls.find((call) => call.method === 'update')?.args[0];
    expect(patch).toEqual({
      search_defaults: {
        sector: { kind: 'radius', km: 2 },
        price: null,
        rooms: null,
        surface: null,
        autoWiden: true,
      },
    });
  });

  it('un nouveau dossier reprend les réglages par défaut du conseiller', async () => {
    const { createProject } = await import('@/features/projects/actions/create-project');
    state.profile = {
      ...advisor,
      search_defaults: {
        sector: { kind: 'radius', km: 2 },
        price: null,
        rooms: null,
        surface: null,
        autoWiden: true,
      },
    };
    state.respond = (table) => (table === 'projects' ? { data: { id: PROJECT } } : {});
    await expect(createProject(form({ sellerName: 'TEST Vendeur' }))).rejects.toThrow(/REDIRECT/);
    const row = server.calls.find((call) => call.method === 'insert')?.args[0] as {
      search_settings: unknown;
    };
    expect(row.search_settings).toEqual({
      sector: { kind: 'radius', km: 2 },
      price: null,
      rooms: null,
      surface: null,
      autoWiden: true,
    });
  });
});

// Mission 109 — cinq corrections avant l'invitation.
describe('Mission 109', () => {
  it('les réglages par défaut ne gardent ni prix, ni pièces, ni surface', async () => {
    const { saveSearchDefaults } =
      await import('@/features/competitor-search/actions/save-search-defaults');
    const { DEFAULT_SEARCH_SETTINGS, settingsToInput } =
      await import('@/features/competitor-search/services/search-settings');
    state.respond = (table) => (table === 'profiles' ? { data: { id: advisor.id } } : {});
    await saveSearchDefaults(
      settingsToInput({
        ...DEFAULT_SEARCH_SETTINGS,
        sector: { kind: 'radius', km: 2 },
        price: { min: 300_000, max: 380_000 },
        rooms: { min: 3, max: 4 },
        surface: { min: 60, max: 80 },
        autoWiden: false,
      }),
    );
    const patch = service.calls.find((call) => call.method === 'update')?.args[0];
    expect(patch).toEqual({
      search_defaults: {
        sector: { kind: 'radius', km: 2 },
        price: null,
        rooms: null,
        surface: null,
        autoWiden: false,
      },
    });
  });

  it('un nouveau dossier ne reprend jamais prix, pièces ni surface, même gardés en base', async () => {
    const { createProject } = await import('@/features/projects/actions/create-project');
    state.profile = {
      ...advisor,
      search_defaults: {
        sector: { kind: 'radius', km: 2 },
        price: { min: 300_000, max: 380_000 },
        rooms: { min: 3, max: 4 },
        surface: { min: 60, max: 80 },
        autoWiden: true,
      },
    };
    state.respond = (table) => (table === 'projects' ? { data: { id: PROJECT } } : {});
    await expect(createProject(form({ sellerName: 'TEST Vendeur' }))).rejects.toThrow(/REDIRECT/);
    const row = server.calls.find((call) => call.method === 'insert')?.args[0] as {
      search_settings: unknown;
    };
    expect(row.search_settings).toEqual({
      sector: { kind: 'radius', km: 2 },
      price: null,
      rooms: null,
      surface: null,
      autoWiden: true,
    });
  });

  it.each(['meeting_completed', 'archived'])(
    'une réponse du Live est refusée sur un dossier %s, rien n’est écrit',
    async (status) => {
      const { writeLiveComparableResponse } =
        await import('@/features/live-seller/services/write-live-comparable-response');
      const { writeLiveSellerSummary } =
        await import('@/features/live-seller/services/write-live-seller-summary');
      state.respond = (table) =>
        table === 'projects' ? { data: { id: PROJECT, status } } : { data: { id: COMPETITOR } };
      const serious = form({ seller_serious_competitor: 'no' });
      expect(await writeLiveComparableResponse(PROJECT, COMPETITOR, serious)).toEqual({
        ok: false,
        error: 'Rendez-vous terminé : la réponse n’est pas enregistrée.',
      });
      expect(
        (
          await writeLiveSellerSummary(
            PROJECT,
            form({ seller_most_dangerous_comparable_id: COMPETITOR }),
          )
        ).ok,
      ).toBe(false);
      noWrite();
    },
  );

  it('« Ne plus solliciter » sur une carte regroupée : la clé de chaque adresse confirmée', async () => {
    const { addProspectingOpposition } =
      await import('@/features/prospecting/actions/add-prospecting-opposition');
    const { addressKey } = await import('@/features/prospecting/services/address-key');
    const first = '8 avenue du Docteur Hochet, 06160 Antibes';
    const second = '10 avenue du Docteur Hochet, 06160 Antibes';
    state.card = {
      row: { confirmed: true, address: first, opposedOn: null },
      sellers: [{ projectId: PROJECT }],
      copies: [
        { row: { id: 'c1', confirmed: true, address: first, listingKey: null } },
        { row: { id: 'c2', confirmed: true, address: second, listingKey: null } },
        {
          row: {
            id: 'c3',
            confirmed: false,
            address: '12 rue proposée, Antibes',
            listingKey: null,
          },
        },
      ],
    };
    const keys = [addressKey(first), addressKey(second)];
    state.respond = (table, method) =>
      table === 'prospecting_oppositions' && method === 'select'
        ? { data: keys.map((address_key) => ({ address_key, listing_key: null })) }
        : {};
    expect(await addProspectingOpposition(PROJECT, 'c1')).toEqual({ ok: true });
    const inserted = server.calls
      .filter((call) => call.method === 'insert')
      .map((call) => (call.args[0] as { address_key?: string }).address_key);
    expect(inserted).toEqual(keys);
  });

  it('« 12 bd X, Juan-les-Pins », sans code postal : le courrier garde Juan-les-Pins, la clé vaut Antibes', async () => {
    const { confirmCompetitorAddress } =
      await import('@/features/competitor-locator/actions/confirm-competitor-address');
    const { addressKey } = await import('@/features/prospecting/services/address-key');
    state.respond = (table, method) =>
      table === 'comparables'
        ? method === 'update'
          ? { data: [{ id: 'c1' }] }
          : {
              data: {
                locator_address: null,
                locator_confirmed: false,
                locator_source: null,
                listing_url: null,
              },
            }
        : { data: [] };
    expect(
      await confirmCompetitorAddress(PROJECT, 'c1', {
        mode: 'typed',
        address: '12 boulevard Wilson, Juan-les-Pins',
      }),
    ).toEqual({ ok: true });
    const patch = server.calls.find((call) => call.method === 'update')?.args[0] as {
      locator_address: string;
    };
    expect(patch.locator_address).toBe('12 boulevard Wilson, Juan-les-Pins');
    expect(addressKey(patch.locator_address)).toBe(addressKey('12 boulevard Wilson, Antibes'));
  });
});

// Mission 110 — les objections partent avec la conclusion, relues par le serveur.
describe('Mission 110 — les objections à la conclusion', () => {
  it('« à relancer » : les objections cochées, le motif reste obligatoire', async () => {
    const { concludeMeeting } =
      await import('@/features/meeting-conclusion/actions/conclude-meeting');
    state.project = { id: PROJECT, status: 'ready_for_meeting' };
    state.respond = (table) => (table === 'conclude_meeting' ? { data: true } : {});
    // Sans motif : refusé, rien n'est écrit, objections ou pas.
    const noMotive = form({ outcome: 'follow_up' });
    noMotive.append('objections', 'price');
    expect((await concludeMeeting(PROJECT, noMotive)).ok).toBe(false);
    expect(service.writes()).toEqual([]);

    const followUp = form({
      outcome: 'follow_up',
      follow_up_motive: 'thinking_price',
      objection_note: 'Attend la vente de sa mère',
    });
    for (const value of ['timing', 'price', 'pirate']) followUp.append('objections', value);
    await expect(concludeMeeting(PROJECT, followUp)).rejects.toThrow(/REDIRECT/);
    const args = service.calls.find((call) => call.method === 'rpc')?.args[1];
    expect(args).toMatchObject({
      p_objections: ['price', 'timing'],
      p_objection_note: 'Attend la vente de sa mère',
    });
  });
});

describe('Mission 110 — « Retirer le lien » de la synthèse', () => {
  const LINK = '55555555-5555-4555-8555-555555555555';
  it('refusé à un membre retiré ou sur un lien hors de son agence, sans rien écrire de faux', async () => {
    const { removeSynthesisLink } =
      await import('@/features/seller-synthesis/actions/remove-synthesis-link');
    state.profile = removed;
    expect((await removeSynthesisLink(PROJECT, LINK)).ok).toBe(false);
    noWrite();
    state.profile = advisor;
    // Rien de supprimé (lien d'une autre agence, ou déjà retiré) : refus.
    state.respond = () => ({ data: [] });
    expect((await removeSynthesisLink(PROJECT, LINK)).ok).toBe(false);
  });

  it('supprime le lien, cadré sur le dossier et l’agence de la session', async () => {
    const { removeSynthesisLink } =
      await import('@/features/seller-synthesis/actions/remove-synthesis-link');
    state.respond = (table) => (table === 'seller_synthesis_links' ? { data: [{ id: LINK }] } : {});
    expect(await removeSynthesisLink(PROJECT, LINK)).toEqual({ ok: true });
    expect(service.writes()).toEqual(['delete seller_synthesis_links']);
    const scoped = service.calls.filter((call) => call.method === 'eq').map((call) => call.args);
    expect(scoped).toEqual([
      ['id', LINK],
      ['project_id', PROJECT],
      ['agency_id', AGENCY],
    ]);
  });
});

// Mission 110, partie B.
describe('Mission 110 — les concurrents montrés au Live', () => {
  const A = '66666666-6666-4666-8666-666666666661';
  const B = '66666666-6666-4666-8666-666666666662';
  const OTHER = '66666666-6666-4666-8666-666666666669';
  const respondWith = (live: { started: string | null; answers: number }) => {
    state.respond = (table, method) => {
      if (table === 'projects' && method === 'select')
        return { data: { id: PROJECT, live_started_at: live.started } };
      if (table === 'live_seller_responses' || table === 'live_seller_summary')
        return { count: live.answers };
      if (table === 'comparables' && method === 'select') return { data: [{ id: A }, { id: B }] };
      return {};
    };
  };

  it('refusé une fois le Live commencé, sans rien écrire', async () => {
    const { saveLiveShortlist } =
      await import('@/features/live-seller/actions/save-live-shortlist');
    respondWith({ started: '2026-10-19T10:00:00.000Z', answers: 0 });
    expect(await saveLiveShortlist(PROJECT, [A])).toEqual({
      ok: false,
      error: 'Le Live a commencé : les concurrents montrés ne se modifient plus.',
    });
    noWrite();
  });

  it('ne garde que des concurrents retenus du dossier, au moins un', async () => {
    const { saveLiveShortlist } =
      await import('@/features/live-seller/actions/save-live-shortlist');
    respondWith({ started: null, answers: 0 });
    expect((await saveLiveShortlist(PROJECT, [OTHER])).ok).toBe(false);
    noWrite();
    expect(await saveLiveShortlist(PROJECT, [A, OTHER])).toEqual({ ok: true });
    const updates = server.calls
      .filter((call) => call.method === 'update')
      .map((call) => call.args[0]);
    expect(updates).toEqual([
      { excluded_from_live: false },
      { excluded_from_live: true },
      expect.objectContaining({ live_shortlist_at: expect.any(String) }),
    ]);
    const ins = server.calls.filter((call) => call.method === 'in').map((call) => call.args);
    expect(ins).toContainEqual(['id', [A]]);
    expect(ins).toContainEqual(['id', [B]]);
  });
});

// Mission 110, partie C — les experts.
describe('les experts (mission 110)', () => {
  const SEARCH = '55555555-5555-4555-8555-555555555555';

  it('une recherche nommée ne s’écrit jamais avec un prix, des pièces ni une surface', async () => {
    const { saveNamedSearch } = await import('@/features/competitor-search/actions/saved-searches');
    const { DEFAULT_SEARCH_SETTINGS, settingsToInput } =
      await import('@/features/competitor-search/services/search-settings');
    const input = settingsToInput({
      ...DEFAULT_SEARCH_SETTINGS,
      sector: { kind: 'radius', km: 5 },
      price: { min: 800_000, max: 1_200_000 },
      rooms: { min: 5, max: 7 },
      surface: { min: 140, max: 220 },
      filters: { dpe: ['A', 'B'], minFloor: null, outdoor: null, minLand: 1000, pool: true },
    });

    state.profile = removed;
    expect((await saveNamedSearch('Villas Vence', input)).ok).toBe(false);
    noWrite();

    state.profile = advisor;
    expect((await saveNamedSearch('   ', input)).ok).toBe(false);
    noWrite();

    state.respond = (table, method) =>
      table === 'saved_searches' && method === 'select' ? { data: [] } : {};
    expect((await saveNamedSearch('Villas Vence', input)).ok).toBe(true);
    expect(service.writes()).toEqual(['insert saved_searches']);
    const row = service.calls.find((call) => call.method === 'insert')?.args[0] as Record<
      string,
      unknown
    >;
    expect(row).toMatchObject({ agency_id: AGENCY, owner_id: advisor.id, name: 'Villas Vence' });
    expect(Object.keys(row.settings as object).sort()).toEqual(['autoWiden', 'filters', 'sector']);
    expect(JSON.stringify(row.settings)).not.toMatch(/price|rooms|surface|800000|140/);
  });

  it('rappeler une recherche : celle de l’appelant, sur un dossier de son agence', async () => {
    const { applyNamedSearch } =
      await import('@/features/competitor-search/actions/saved-searches');
    state.profile = advisor;
    state.respond = (table) =>
      table === 'saved_searches'
        ? { data: null }
        : table === 'projects'
          ? { data: { search_settings: null } }
          : {};
    expect((await applyNamedSearch(PROJECT, SEARCH)).ok).toBe(false);
    noWrite();

    state.respond = (table, method) =>
      table === 'saved_searches'
        ? {
            data: {
              settings: {
                sector: { kind: 'commune' },
                autoWiden: false,
                filters: { dpe: null, minFloor: 2, outdoor: null, minLand: null, pool: false },
              },
            },
          }
        : table === 'projects' && method === 'select'
          ? {
              data: {
                search_settings: {
                  sector: null,
                  price: { min: 300_000, max: 380_000 },
                  rooms: null,
                  surface: null,
                  autoWiden: true,
                },
              },
            }
          : { data: { id: PROJECT } };
    const applied = await applyNamedSearch(PROJECT, SEARCH);
    expect(applied.ok).toBe(true);
    const eqs = service.calls.filter((call) => call.method === 'eq').map((call) => call.args);
    expect(eqs).toContainEqual(['owner_id', advisor.id]);
    expect(eqs).toContainEqual(['agency_id', AGENCY]);
    const patch = service.calls.find((call) => call.method === 'update')?.args[0] as {
      search_settings: Record<string, unknown>;
    };
    // Le prix réglé sur CE dossier reste le sien.
    expect(patch.search_settings.price).toEqual({ min: 300_000, max: 380_000 });
    expect(patch.search_settings.sector).toEqual({ kind: 'commune' });
  });

  it('le mode expert : le profil de l’appelant, une vraie valeur, et rien pour un membre retiré', async () => {
    const { setExpertMode } = await import('@/features/expert-mode/actions/set-expert-mode');
    state.profile = advisor;
    expect((await setExpertMode('oui')).ok).toBe(false);
    noWrite();
    state.profile = removed;
    expect((await setExpertMode(true)).ok).toBe(false);
    noWrite();

    state.profile = advisor;
    state.respond = (table) => (table === 'profiles' ? { data: { expert_mode: true } } : {});
    expect(await setExpertMode(true)).toEqual({ ok: true, expert: true });
    expect(service.writes()).toEqual(['update profiles']);
    expect(service.calls.find((call) => call.method === 'update')?.args[0]).toEqual({
      expert_mode: true,
    });
    const eqs = service.calls.filter((call) => call.method === 'eq').map((call) => call.args);
    expect(eqs).toContainEqual(['id', advisor.id]);
  });

  it('l’ordre du Live : refusé une fois le Live commencé, sans autre écriture', async () => {
    const { reorderLiveCompetitors } =
      await import('@/features/live-seller/actions/reorder-live-competitors');
    const { LIVE_ORDER_FROZEN } = await import('@/features/live-seller/services/live-timing');
    state.profile = advisor;
    expect((await reorderLiveCompetitors(PROJECT, ['pas-un-identifiant'])).ok).toBe(false);
    noWrite();

    state.respond = (table) =>
      table === 'projects'
        ? { data: { id: PROJECT } }
        : table === 'reorder_retained_comparables'
          ? { error: { message: 'live_started' } }
          : {};
    expect(await reorderLiveCompetitors(PROJECT, [COMPETITOR])).toEqual({
      ok: false,
      error: LIVE_ORDER_FROZEN,
    });
    expect(server.writes()).toEqual(['rpc reorder_retained_comparables']);
  });
});

// Mission 110 — les flèches de la page Concurrents : refusées une fois le Live commencé.
describe('l’ordre figé une fois le Live commencé (mission 110)', () => {
  it('les flèches ne déplacent rien et disent « Ordre figé »', async () => {
    const { moveSelectedComparable } =
      await import('@/features/comparables/actions/move-selected-comparable');
    const { LIVE_ORDER_FROZEN } = await import('@/features/live-seller/services/live-timing');
    state.profile = advisor;
    state.respond = (table) =>
      table === 'projects'
        ? { data: { id: PROJECT, agency_id: AGENCY, live_started_at: '2026-10-19T10:00:00Z' } }
        : {};
    await expect(
      moveSelectedComparable(PROJECT, form({ comparableId: COMPETITOR, direction: 'down' })),
    ).rejects.toThrow(
      `REDIRECT /builder/${PROJECT}/comparables?error=${encodeURIComponent(LIVE_ORDER_FROZEN)}`,
    );
    noWrite();
  });

  it('une réponse du vendeur suffit à figer l’ordre', async () => {
    const { moveSelectedComparable } =
      await import('@/features/comparables/actions/move-selected-comparable');
    state.profile = advisor;
    state.respond = (table) =>
      table === 'projects'
        ? { data: { id: PROJECT, agency_id: AGENCY, live_started_at: null } }
        : table === 'live_seller_responses'
          ? { count: 1 }
          : {};
    await expect(
      moveSelectedComparable(PROJECT, form({ comparableId: COMPETITOR, direction: 'up' })),
    ).rejects.toThrow(/Ordre%20fig/);
    noWrite();
  });

  it('avant le Live, le déplacement part', async () => {
    const { moveSelectedComparable } =
      await import('@/features/comparables/actions/move-selected-comparable');
    state.profile = advisor;
    state.respond = (table) =>
      table === 'projects'
        ? { data: { id: PROJECT, agency_id: AGENCY, live_started_at: null } }
        : table === 'live_seller_responses'
          ? { count: 0 }
          : {};
    await expect(
      moveSelectedComparable(PROJECT, form({ comparableId: COMPETITOR, direction: 'up' })),
    ).rejects.toThrow(`REDIRECT /builder/${PROJECT}/comparables`);
    expect(server.writes()).toEqual(['rpc move_selected_comparable']);
  });
});
