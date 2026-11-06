import { beforeEach, describe, expect, it, vi } from 'vitest';

import { oneMonthAgo } from '@/features/demo/services/demo-seed';
import { fakeSupabase } from '@/test-fixtures/fake-supabase';

// Mission 114 (partie B) — « Préparer ma démo » et « Remettre ma démo à zéro » : réservés à un
// closer de l'agence de démonstration, et la remise à zéro ne touche qu'à SES dossiers marqués.
// Les actions sont appelées pour de vrai ; la session, le repère et les clients sont remplacés.

const state = vi.hoisted(() => ({
  demo: true,
  profile: null as Record<string, unknown> | null,
  respond: (() => ({})) as (table: string) => { data?: unknown; error?: unknown },
}));
const service = fakeSupabase((calls) => {
  const from = [...calls].reverse().find((call) => call.method === 'from');
  return state.respond(from ? String(from.args[0]) : '');
});

vi.mock('@/features/demo/services/is-demo-agency', () => ({
  isDemoAgency: async () => state.demo,
}));
vi.mock('@/lib/auth/get-profile', () => ({ getProfile: async () => state.profile }));
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: () => service.client }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({}) }));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT ${path}`);
  },
}));

const AGENCY = '11111111-1111-4111-8111-111111111111';
const closer = { id: 'u-closer', agency_id: AGENCY, role: 'advisor', removed_at: null };

beforeEach(() => {
  service.reset();
  state.demo = true;
  state.profile = closer;
  state.respond = () => ({ data: [] });
});

describe('qui peut préparer ou remettre à zéro', () => {
  it('hors de l’agence de démonstration : renvoyé vers ses dossiers, sans rien écrire', async () => {
    const { prepareDemoDossiers, resetDemoDossiers } =
      await import('@/features/demo/actions/demo-dossiers');
    state.demo = false;
    await expect(prepareDemoDossiers()).rejects.toThrow('REDIRECT /builder');
    await expect(resetDemoDossiers()).rejects.toThrow('REDIRECT /builder');
    expect(service.writes()).toEqual([]);
  });

  it('sans session, ou membre retiré : vers l’ouverture d’agence, sans rien écrire', async () => {
    const { resetDemoDossiers } = await import('@/features/demo/actions/demo-dossiers');
    for (const profile of [null, { ...closer, removed_at: '2026-10-01T00:00:00Z' }]) {
      state.profile = profile;
      await expect(resetDemoDossiers()).rejects.toThrow('REDIRECT /onboarding');
    }
    expect(service.writes()).toEqual([]);
  });
});

describe('la remise à zéro ne touche qu’aux dossiers de démo du closer connecté', () => {
  it('lit ses dossiers marqués, dans son agence, et supprime ce qui en dépend', async () => {
    const { deleteDemoDossiers } = await import('@/features/demo/actions/demo-dossiers');
    state.respond = (table) =>
      table === 'projects'
        ? { data: [{ id: 'p1' }, { id: 'p2' }] }
        : table === 'subject_properties'
          ? { data: [{ id: 'sp1', photo_urls: [`${AGENCY}/p1/property/a.jpg`] }] }
          : { data: [] };
    const removed = await deleteDemoDossiers(service.client as never, {
      id: 'u-closer',
      agencyId: AGENCY,
    });
    expect(removed).toBe(2);
    // Le périmètre : SON identifiant, SON agence, la marque.
    const scoped = service.calls.filter(
      (call) =>
        call.method === 'eq' && call.args[0] === 'advisor_id' && call.args[1] === 'u-closer',
    );
    expect(scoped.length).toBeGreaterThanOrEqual(2);
    expect(
      service.calls.some(
        (call) => call.method === 'not' && call.args[0] === 'demo_stage' && call.args[2] === null,
      ),
    ).toBe(true);
    expect(
      service.calls.every(
        (call) => call.method !== 'eq' || call.args[0] !== 'agency_id' || call.args[1] === AGENCY,
      ),
    ).toBe(true);
    // Les photos déposées partent du stockage ; les dépendances puis les dossiers sont supprimés.
    expect(service.calls.find((call) => call.method === 'remove')?.args[0]).toEqual([
      `${AGENCY}/p1/property/a.jpg`,
    ]);
    const deleted = service.writes().filter((write) => write.startsWith('delete '));
    expect(deleted).toContain('delete comparables');
    expect(deleted).toContain('delete subject_properties');
    expect(deleted).toContain('delete project_meeting_conclusions');
    expect(deleted[deleted.length - 1]).toBe('delete projects');
    // Jamais une table hors de la liste (ni les oppositions de l'agence, communes à tous).
    expect(deleted).not.toContain('delete prospecting_oppositions');
  });

  it('sans dossier marqué, rien n’est supprimé', async () => {
    const { deleteDemoDossiers } = await import('@/features/demo/actions/demo-dossiers');
    expect(
      await deleteDemoDossiers(service.client as never, { id: 'u-closer', agencyId: AGENCY }),
    ).toBe(0);
    expect(service.writes()).toEqual([]);
  });
});

// Mission 117 — les deux acquéreurs de la démo vont et viennent avec les dossiers : semés par
// « Préparer ma démo », retirés par la remise à zéro, dans le seul périmètre du closer.
describe('les acquéreurs de la démo', () => {
  it('la remise à zéro ne retire que SES acquéreurs marqués, dans SON agence', async () => {
    const { deleteDemoBuyers } = await import('@/features/demo/actions/demo-dossiers');
    state.respond = (table) =>
      table === 'buyers' ? { data: [{ id: 'b1' }, { id: 'b2' }] } : { data: [] };
    const removed = await deleteDemoBuyers(service.client as never, {
      id: 'u-closer',
      agencyId: AGENCY,
    });
    expect(removed).toBe(2);
    expect(service.writes()).toEqual(['delete buyers']);
    // Les filtres de la suppression des fiches, avant celle des biens démarchés (M120).
    const secondFrom = service.calls.findIndex(
      (call, index) => index > 0 && call.method === 'from',
    );
    const filters = service.calls
      .slice(0, secondFrom < 0 ? undefined : secondFrom)
      .filter((call) => call.method === 'eq')
      .map((call) => `${String(call.args[0])}=${String(call.args[1])}`);
    expect(filters).toEqual([`agency_id=${AGENCY}`, 'advisor_id=u-closer', 'demo=true']);
  });

  it('la remise à zéro retire les biens démarchés du closer que plus aucune recherche ne vise (M120)', async () => {
    const { deleteDemoBuyers } = await import('@/features/demo/actions/demo-dossiers');
    state.respond = (table) =>
      table === 'buyer_prospects'
        ? { data: [{ id: 'p-orphelin' }, { id: 'p-vise' }] }
        : table === 'buyer_prospect_origins'
          ? { data: [{ prospect_id: 'p-vise' }] }
          : { data: [] };
    await deleteDemoBuyers(service.client as never, { id: 'u-closer', agencyId: AGENCY });
    expect(service.writes()).toEqual(['delete buyers', 'delete buyer_prospects']);
    const deletion = service.calls.slice(
      service.calls.map((call) => call.method).lastIndexOf('delete'),
    );
    expect(deletion.find((call) => call.method === 'in')?.args).toEqual(['id', ['p-orphelin']]);
    expect(deletion.find((call) => call.method === 'eq')?.args).toEqual(['agency_id', AGENCY]);
  });

  it('« Préparer ma démo » sème huit acquéreurs marqués, au closer, dans son agence', async () => {
    const { seedDemoBuyers } = await import('@/features/demo/actions/demo-dossiers');
    expect(
      await seedDemoBuyers(service.client as never, { id: 'u-closer', agencyId: AGENCY }),
    ).toBe(true);
    expect(service.writes()).toEqual(['insert buyers']);
    const rows = service.calls.find((call) => call.method === 'insert')?.args[0] as Record<
      string,
      unknown
    >[];
    expect(rows).toHaveLength(8);
    for (const row of rows) {
      expect(row).toMatchObject({ agency_id: AGENCY, advisor_id: 'u-closer', demo: true });
      expect(row).not.toHaveProperty('status');
    }
    expect(rows.slice(0, 2).map((row) => row.name)).toEqual(['M. et Mme Rossi', 'Famille Keller']);
    // Mission 132 — cinq financements validés, chacun avec son dernier contact.
    const validated = rows.filter((row) => row.financing === 'validated');
    expect(validated).toHaveLength(5);
    for (const row of validated) expect(row.contacted_at).toEqual(expect.any(String));
    // Mission 133 — chaque ligne porte ses deux dates (une colonne absente d'une seule ligne
    // vaudrait NULL dans l'insertion groupée) ; les fiches de Vence datent de 1 à 7 semaines.
    for (const row of rows) {
      expect(row.created_at).toEqual(expect.any(String));
      expect(row.status_changed_at).toBe(row.created_at);
    }
    const weeks = new Set(
      rows
        .slice(2)
        .map((row) =>
          Math.floor((Date.now() - Date.parse(row.created_at as string)) / 604_800_000),
        ),
    );
    expect(weeks.size).toBeGreaterThan(3);
  });
});

describe('le mandat signé de la démo, il y a un mois calendaire (mission 130)', () => {
  it('le même jour du mois précédent ; le dernier jour quand il n’existe pas', () => {
    expect(oneMonthAgo(new Date('2026-11-05T10:00:00Z'))).toBe('2026-10-05T10:00:00.000Z');
    expect(oneMonthAgo(new Date('2026-03-31T10:00:00Z'))).toBe('2026-02-28T10:00:00.000Z');
    expect(oneMonthAgo(new Date('2027-01-15T10:00:00Z'))).toBe('2026-12-15T10:00:00.000Z');
  });
});
