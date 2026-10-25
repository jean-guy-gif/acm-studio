import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeSupabase, type FakeCall } from '@/test-fixtures/fake-supabase';

// Mission 122 — les gestes du dossier qui fait agir : écrits par le serveur dans l'agence de
// l'appelant ; une présentation terminée ou un acquéreur archivé ne se modifient plus ; un appel
// refusé n'écrit rien.
const state = vi.hoisted(() => ({
  profile: null as null | { id: string; agency_id: string; removed_at: string | null },
  respond: (() => ({ data: null })) as (
    table: string,
    methods: string[],
  ) => { data?: unknown; error?: unknown },
}));
// La réponse d'un appel dépend de sa table et de ses méthodes (celles qui suivent le dernier `from`).
const service = fakeSupabase((calls: FakeCall[]) => {
  const start = calls.map((call) => call.method).lastIndexOf('from');
  const table = String(calls[start]?.args[0]);
  return state.respond(
    table,
    calls.slice(start).map((call) => call.method),
  );
});
vi.mock('@/lib/auth/get-profile', () => ({ getProfile: async () => state.profile }));
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: () => service.client }));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('@/features/buyer-deck/queries/get-buyer-answers', () => ({
  getBuyerAnswers: async () => ({
    lines: [],
    forSuggestions: [
      {
        bienKey: 'listing:a',
        answer: 'no',
        reasons: ['surface'],
        answeredAt: '2026-10-25T10:00:00Z',
        surfaceArea: 65,
        price: 420_000,
      },
      {
        bienKey: 'listing:b',
        answer: 'no',
        reasons: ['surface'],
        answeredAt: '2026-10-25T10:00:00Z',
        surfaceArea: 68,
        price: 420_000,
      },
    ],
  }),
}));

const {
  answerItem,
  saveItemPitch,
  saveBuyerWords,
  removeSelectionItem,
  applySuggestion,
  ignoreSuggestion,
} = await import('@/features/buyer-deck/actions/deck-actions');

const ITEM = '11111111-1111-4111-8111-111111111111';
const SELECTION = '22222222-2222-4222-8222-222222222222';
const BUYER = '33333333-3333-4333-8333-333333333333';

const itemRow = (presentedAt: string | null = null, archivedAt: string | null = null) => ({
  id: ITEM,
  selection_id: SELECTION,
  buyer_selections: {
    buyer_id: BUYER,
    presented_at: presentedAt,
    buyers: { archived_at: archivedAt },
  },
});
const responseRow = (answer: string, reasons: string[] = []) => ({
  id: 'r1',
  agency_id: 'agency-a',
  buyer_id: BUYER,
  selection_item_id: ITEM,
  answer,
  reasons,
  answered_during: 'presentation',
  answered_at: '2026-10-25T10:00:00Z',
  created_at: '2026-10-25T10:00:00Z',
});
const requestRow = {
  id: 'v1',
  agency_id: 'agency-a',
  buyer_id: BUYER,
  buyer_selection_item_id: ITEM,
  requested_at: '2026-10-25T10:00:00Z',
  requested_during: 'presentation',
  cancelled_at: null,
  visited_at: null,
  feedback: null,
  outcome: 'to_plan',
  availability: [],
  created_at: '2026-10-25T10:00:00Z',
};
const buyerRow = {
  id: BUYER,
  agency_id: 'agency-a',
  advisor_id: 'advisor-1',
  name: 'M. et Mme Rossi',
  cities: ['Antibes'],
  property_types: ['apartment'],
  must_have: ['cities'],
  surface_min: 60,
  status: 'searching',
  ignored_suggestions: [],
  demo: false,
};

const upsertArgs = (): Record<string, unknown> | undefined =>
  service.calls.find((call) => call.method === 'upsert')?.args[0] as
    Record<string, unknown> | undefined;

describe('les gestes du dossier qui fait agir', () => {
  beforeEach(() => {
    service.reset();
    state.profile = { id: 'advisor-1', agency_id: 'agency-a', removed_at: null };
    state.respond = () => ({ data: null });
  });

  it('sans profil, ou retiré : rien n’est écrit', async () => {
    state.profile = null;
    expect((await answerItem(ITEM, 'visit', [])).ok).toBe(false);
    state.profile = { id: 'advisor-1', agency_id: 'agency-a', removed_at: '2026-10-01' };
    expect((await saveItemPitch(ITEM, 'Il coche tout.')).ok).toBe(false);
    expect((await saveBuyerWords(SELECTION, 'Un 3 pièces.')).ok).toBe(false);
    expect((await removeSelectionItem(ITEM)).ok).toBe(false);
    expect((await applySuggestion(BUYER, 'surface')).ok).toBe(false);
    expect((await ignoreSuggestion(BUYER, 'surface')).ok).toBe(false);
    expect(service.writes()).toEqual([]);
  });

  it('« Je veux le visiter » : la réponse datée et la demande de visite de M119', async () => {
    state.respond = (table, methods) => {
      if (table === 'buyer_selection_items') return { data: itemRow() };
      if (table === 'buyer_item_responses') return { data: responseRow('visit') };
      if (table === 'buyer_visit_requests' && methods.includes('insert')) return { data: null };
      if (table === 'buyer_visit_requests' && methods.includes('order'))
        return { data: [requestRow] };
      return { data: [] };
    };
    const result = await answerItem(ITEM, 'visit', ['surface']);
    expect(result.ok).toBe(true);
    expect(service.writes()).toEqual([
      'upsert buyer_item_responses',
      'insert buyer_visit_requests',
    ]);
    // Des raisons ne se donnent qu'à « Pas pour moi » ; le moment est la présentation.
    expect(upsertArgs()).toMatchObject({
      answer: 'visit',
      reasons: [],
      answered_during: 'presentation',
      agency_id: 'agency-a',
    });
    expect(service.calls.find((call) => call.method === 'insert')?.args[0]).toMatchObject({
      requested_during: 'presentation',
      buyer_selection_item_id: ITEM,
    });
  });

  it('« Pas pour moi » : ses raisons relues, la demande de la présentation annulée', async () => {
    state.respond = (table, methods) => {
      if (table === 'buyer_selection_items') return { data: itemRow() };
      if (table === 'buyer_item_responses') return { data: responseRow('no', ['surface']) };
      if (table === 'buyer_visit_requests' && methods.includes('update')) return { data: null };
      if (table === 'buyer_visit_requests' && methods.includes('order')) return { data: [] };
      return { data: [requestRow] };
    };
    const result = await answerItem(ITEM, 'no', ['surface', 'le voisin', 'surface']);
    expect(result.ok).toBe(true);
    expect(upsertArgs()).toMatchObject({ answer: 'no', reasons: ['surface'] });
    expect(service.writes()).toEqual([
      'upsert buyer_item_responses',
      'update buyer_visit_requests',
    ]);
  });

  it('présentation terminée, acquéreur archivé, réponse hors liste : rien n’est écrit', async () => {
    state.respond = (table) =>
      table === 'buyer_selection_items' ? { data: itemRow('2026-10-25T11:00:00Z') } : { data: [] };
    expect(await answerItem(ITEM, 'visit', [])).toEqual({
      ok: false,
      error: 'La présentation est terminée : elle se relit sans se modifier.',
    });
    expect((await saveItemPitch(ITEM, 'Une phrase.')).ok).toBe(false);
    expect((await removeSelectionItem(ITEM)).ok).toBe(false);
    state.respond = (table) =>
      table === 'buyer_selection_items' ? { data: itemRow(null, '2026-10-20') } : { data: [] };
    expect(await answerItem(ITEM, 'visit', [])).toEqual({
      ok: false,
      error: 'Cet acquéreur est archivé.',
    });
    expect((await answerItem(ITEM, 'oui', [])).ok).toBe(false);
    expect((await answerItem('pas-un-uuid', 'visit', [])).ok).toBe(false);
    expect(service.writes()).toEqual([]);
  });

  it('« Pourquoi » : 140 caractères au plus ; vide, la phrase proposée revient', async () => {
    state.respond = (table) =>
      table === 'buyer_selection_items' ? { data: itemRow() } : { data: null };
    expect((await saveItemPitch(ITEM, 'x'.repeat(141))).ok).toBe(false);
    expect(service.writes()).toEqual([]);
    expect((await saveItemPitch(ITEM, '   ')).ok).toBe(true);
    expect(service.calls.find((call) => call.method === 'update')?.args[0]).toEqual({
      pitch: null,
    });
  });

  it('« Vous m’avez dit » : refusé une fois la sélection présentée', async () => {
    state.respond = () => ({
      data: {
        id: SELECTION,
        buyer_id: BUYER,
        presented_at: '2026-10-25',
        buyers: { archived_at: null },
      },
    });
    expect((await saveBuyerWords(SELECTION, 'Un 3 pièces au calme.')).ok).toBe(false);
    expect(service.writes()).toEqual([]);
  });

  it('une suggestion acceptée est relue au serveur, puis appliquée ; ignorée, elle est retenue', async () => {
    state.respond = (table) => (table === 'buyers' ? { data: buyerRow } : { data: null });
    expect((await applySuggestion(BUYER, 'surface')).ok).toBe(true);
    expect(service.calls.find((call) => call.method === 'update')?.args[0]).toMatchObject({
      surface_min: 70,
    });
    service.reset();
    expect((await applySuggestion(BUYER, 'parking')).ok).toBe(false);
    expect(service.writes()).toEqual([]);
    expect((await ignoreSuggestion(BUYER, 'surface')).ok).toBe(true);
    expect(service.calls.find((call) => call.method === 'update')?.args[0]).toEqual({
      ignored_suggestions: ['surface'],
    });
    expect((await ignoreSuggestion(BUYER, 'voisin')).ok).toBe(false);
  });
});
