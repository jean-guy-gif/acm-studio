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
vi.mock('@/features/team/services/deliver-invitation', () => ({
  deliverInvitation: async () => ({ ok: true, authUserId: 'auth-1' }),
}));

const AGENCY = '11111111-1111-4111-8111-111111111111';
const OTHER_AGENCY = '22222222-2222-4222-8222-222222222222';
const PROJECT = '33333333-3333-4333-8333-333333333333';
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
    state.card = card(false);
    expect((await addProspectingOpposition(PROJECT, 'c1')).ok).toBe(false);
    noWrite();
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
    state.card = card(true);
    state.respond = () => ({ error: { code: '23505' } });
    expect(await addProspectingOpposition(PROJECT, 'c1')).toEqual({ ok: true });
    state.respond = () => ({ error: { code: '42501' } });
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
    });
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
    state.respond = (table) => (table === 'profiles' ? { data: { id: 'déjà-là' } } : {});
    expect(await inviteMember(invite)).toEqual({
      ok: false,
      error: 'Cette adresse a déjà un compte dans une agence.',
    });
    expect(service.writes()).toEqual([]);
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
