import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeAcademia, FAKE_ACADEMIA_ID } from '@/test-fixtures/fake-academia';
import { fakeSupabase } from '@/test-fixtures/fake-supabase';
import realView from '@/test-fixtures/academia-vue-bien.json';

// Mission 158 — le dossier d'adresse lu pour « Avant le rendez-vous » : seulement une demande
// prête, faite pour l'adresse du jour, avec le type, les pièces et la surface du bien ; une lecture
// en échec est dite et part au journal ; contre le faux serveur, jamais le vrai.
const reported = vi.hoisted(() => [] as string[]);
vi.mock('@/lib/app-errors/report-server-error', () => ({
  reportServerError: async (_scope: string, error: unknown) => {
    reported.push(error instanceof Error ? error.message : String(error));
  },
}));
const { readAddressView } = await import('@/features/academia/queries/read-address-view');

const ADDRESS = '5 impasse du Moulin à Huile, 06140 Vence';
const ACCESS = { key: 'msk_essai', demoAddress: null };
const state = vi.hoisted(() => ({
  request: null as Record<string, unknown> | null,
  fail: false,
}));
const db = fakeSupabase(() =>
  state.fail ? { error: { message: 'lecture impossible' } } : { data: state.request },
);
const property = { address: ADDRESS, propertyType: 'Maison', rooms: 5, surface: 135.4 };

const read = (
  overrides: Partial<Parameters<typeof readAddressView>[0]> = {},
  server = fakeAcademia({ readView: [{ status: 200, body: realView }] }),
) =>
  readAddressView({
    admin: db.client as never,
    agencyId: 'agence-1',
    projectId: 'p1',
    property,
    access: ACCESS,
    fetchImpl: server.fetch,
    ...overrides,
  });

beforeEach(() => {
  db.reset();
  reported.length = 0;
  state.fail = false;
  state.request = { academia_id: FAKE_ACADEMIA_ID, state: 'pret', property_address: ADDRESS };
});

describe('readAddressView', () => {
  it('prête : la vue « bien » lue pour le type, les pièces et la surface arrondie du bien', async () => {
    const server = fakeAcademia({ readView: [{ status: 200, body: realView }] });
    const result = await read({}, server);
    expect(result.kind).toBe('ready');
    expect(result.kind === 'ready' && result.view.indicative?.low).toBe(955000);
    expect(result.kind === 'ready' && result.facts).toEqual({
      type: 'maison',
      rooms: 5,
      surface: 135,
    });
    expect(server.calls[0]).toMatchObject({
      path: `/api/v1/dossiers/${FAKE_ACADEMIA_ID}/bien`,
      query: '?type=maison&pieces=5&surface=135',
    });
  });

  it('sans accès, sans demande, une demande en erreur ou faite pour une autre adresse : rien n’est appelé', async () => {
    const server = fakeAcademia();
    expect(await read({ access: null }, server)).toEqual({ kind: 'closed' });
    state.request = null;
    expect(await read({}, server)).toEqual({ kind: 'none' });
    state.request = { academia_id: FAKE_ACADEMIA_ID, state: 'erreur', property_address: ADDRESS };
    expect(await read({}, server)).toEqual({ kind: 'request_failed' });
    state.request = {
      academia_id: FAKE_ACADEMIA_ID,
      state: 'pret',
      property_address: '12 rue Ancienne, 06140 Vence',
    };
    expect(await read({}, server)).toEqual({ kind: 'none' });
    expect(server.calls).toHaveLength(0);
  });

  // Mission 161 — l'API réelle (Laurent, 18/11).
  it('161 · en préparation : Academia est interrogé ; encore en cours, prêt, en échec ou effacé', async () => {
    state.request = { academia_id: FAKE_ACADEMIA_ID, state: 'en_cours', property_address: ADDRESS };
    const still = fakeAcademia({
      readRequest: [{ status: 200, body: { id: FAKE_ACADEMIA_ID, statut: 'en_cours' } }],
    });
    expect(await read({}, still)).toEqual({ kind: 'waiting' });
    expect(still.calls.map((call) => call.path)).toEqual([`/api/v1/dossiers/${FAKE_ACADEMIA_ID}`]);
    const ready = fakeAcademia({
      readRequest: [{ status: 200, body: { id: FAKE_ACADEMIA_ID, statut: 'pret' } }],
      readView: [{ status: 200, body: realView }],
    });
    expect((await read({}, ready)).kind).toBe('ready');
    const failedPrep = fakeAcademia({
      readRequest: [{ status: 200, body: { id: FAKE_ACADEMIA_ID, statut: 'echec' } }],
    });
    expect(await read({}, failedPrep)).toEqual({ kind: 'request_failed' });
    const gone = fakeAcademia({ readRequest: [{ status: 404, body: {} }] });
    expect(await read({}, gone)).toEqual({ kind: 'request_failed' });
  });

  it('161 · la vue sur un dossier pas prêt (409) : l’attente ; effacé (404) : à recréer, sans journal d’erreur', async () => {
    state.request = { academia_id: FAKE_ACADEMIA_ID, state: 'pret', property_address: ADDRESS };
    const notReady = fakeAcademia({
      readView: [{ status: 409, body: { code: 'pas_pret', erreur: 'Dossier pas prêt' } }],
    });
    expect(await read({}, notReady)).toEqual({ kind: 'waiting' });
    const gone = fakeAcademia({ readView: [{ status: 404, body: {} }] });
    expect(await read({}, gone)).toEqual({ kind: 'request_failed' });
  });

  it('sans type reconnu, pièces ou surface : dit ce qui manque, rien n’est appelé', async () => {
    const server = fakeAcademia();
    expect(
      await read(
        { property: { ...property, propertyType: 'Terrain', rooms: null, surface: 0 } },
        server,
      ),
    ).toEqual({ kind: 'missing_facts', missing: ['type', 'rooms', 'surface'] });
    expect(server.calls).toHaveLength(0);
  });

  it('une erreur d’Academia, une réponse hors contrat ou une lecture de la base en échec : dites, au journal', async () => {
    expect(
      await read(
        {},
        fakeAcademia({
          readView: [{ status: 400, body: { erreur: 'Demande invalide', code: 'demande' } }],
        }),
      ),
    ).toEqual({ kind: 'failed' });
    expect(reported.at(-1)).toBe('Academia : unavailable — HTTP 400 · demande · Demande invalide');
    expect(
      await read({}, fakeAcademia({ readView: [{ status: 200, body: { autre: 1 } }] })),
    ).toEqual({
      kind: 'failed',
    });
    state.fail = true;
    expect(await read()).toEqual({ kind: 'failed' });
    expect(reported).toHaveLength(3);
  });
});
