import { meetingSlots } from '@/features/buyer-deck/services/meeting-slots';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeSupabase, type FakeCall } from '@/test-fixtures/fake-supabase';

// Mission 122 — les gestes du dossier qui fait agir : écrits par le serveur dans l'agence de
// l'appelant ; la réponse et « Terminer » passent chacun par UNE transaction en base ; un retrait
// est doux et réservé à un bien qui porte ✗ sur un indispensable ; un appel refusé n'écrit rien.
const state = vi.hoisted(() => ({
  profile: null as null | { id: string; agency_id: string; removed_at: string | null },
  respond: (() => ({ data: null })) as (
    target: string,
    methods: string[],
  ) => { data?: unknown; error?: unknown },
  blocked: true,
  // Sous Promise.all, la dernière table ouverte ne dit pas à quelle requête on répond : une file,
  // dans l'ordre où l'action attend ses requêtes, quand elle est remplie.
  queue: [] as { data?: unknown; error?: unknown }[],
}));
// La réponse d'un appel dépend de sa cible (table ou fonction) et des méthodes qui la suivent.
const service = fakeSupabase((calls: FakeCall[]) => {
  if (state.queue.length > 0) return state.queue.shift()!;
  const start = calls.map((call) => call.method).findLastIndex((m) => m === 'from' || m === 'rpc');
  const target = `${calls[start]?.method} ${String(calls[start]?.args[0])}`;
  return state.respond(
    target,
    calls.slice(start).map((call) => call.method),
  );
});
vi.mock('@/lib/auth/get-profile', () => ({ getProfile: async () => state.profile }));
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: () => service.client }));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
// Le déroulé recalculé par le serveur : un bien, bloqué ou non selon le test.
vi.mock('@/features/buyer-deck/queries/load-deck', () => ({
  computeDeck: async () => ({
    words: 'Un 3 pièces à Antibes.',
    criteria: [],
    items: [{ item: { itemId: ITEM }, blocked: state.blocked, blockedBy: [] }],
  }),
}));
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

const ITEM = '11111111-1111-4111-8111-111111111111';
const SELECTION = '22222222-2222-4222-8222-222222222222';
const BUYER = '33333333-3333-4333-8333-333333333333';

const {
  answerItem,
  finishPresentation,
  saveItemPitch,
  saveBuyerWords,
  removeSelectionItem,
  applySuggestion,
  ignoreSuggestion,
} = await import('@/features/buyer-deck/actions/deck-actions');

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
const selectionRow = (presentedAt: string | null = null) => ({
  id: SELECTION,
  agency_id: 'agency-a',
  buyer_id: BUYER,
  created_at: '2026-10-24T10:00:00Z',
  created_by: null,
  presented_at: presentedAt,
  buyer_words: null,
  presented_deck: null,
});

const rpcArgs = (name: string): Record<string, unknown> | undefined =>
  service.calls.find((call) => call.method === 'rpc' && call.args[0] === name)?.args[1] as
    Record<string, unknown> | undefined;

describe('les gestes du dossier qui fait agir', () => {
  beforeEach(() => {
    service.reset();
    state.profile = { id: 'advisor-1', agency_id: 'agency-a', removed_at: null };
    state.respond = () => ({ data: null });
    state.blocked = true;
    state.queue = [];
  });

  it('sans profil, ou retiré : rien n’est écrit', async () => {
    state.profile = null;
    expect((await answerItem(ITEM, 'visit', [])).ok).toBe(false);
    state.profile = { id: 'advisor-1', agency_id: 'agency-a', removed_at: '2026-10-01' };
    expect((await finishPresentation(BUYER, SELECTION, [])).ok).toBe(false);
    expect((await saveItemPitch(ITEM, 'Il coche tout.')).ok).toBe(false);
    expect((await saveBuyerWords(SELECTION, 'Un 3 pièces.')).ok).toBe(false);
    expect((await removeSelectionItem(ITEM)).ok).toBe(false);
    expect((await applySuggestion(BUYER, 'surface')).ok).toBe(false);
    expect((await ignoreSuggestion(BUYER, 'surface')).ok).toBe(false);
    expect(service.writes()).toEqual([]);
  });

  it('une réponse : UNE transaction en base, l’agence du profil, les raisons à « Pas pour moi » seulement', async () => {
    state.respond = (target) =>
      target === 'rpc answer_buyer_item' ? { data: responseRow('visit') } : { data: null };
    const result = await answerItem(ITEM, 'visit', ['surface']);
    expect(result.ok).toBe(true);
    expect(service.writes()).toEqual(['rpc answer_buyer_item']);
    expect(rpcArgs('answer_buyer_item')).toEqual({
      p_agency_id: 'agency-a',
      p_item_id: ITEM,
      p_answer: 'visit',
      p_reasons: [],
    });
    service.reset();
    state.respond = () => ({ data: responseRow('no', ['surface']) });
    await answerItem(ITEM, 'no', ['surface', 'le voisin', 'surface']);
    expect(rpcArgs('answer_buyer_item')).toMatchObject({ p_answer: 'no', p_reasons: ['surface'] });
  });

  it('les refus de la base deviennent des messages ; une réponse hors liste n’atteint pas la base', async () => {
    state.respond = () => ({ data: null, error: { message: 'presentation_finished' } });
    expect(await answerItem(ITEM, 'visit', [])).toEqual({
      ok: false,
      error: 'La présentation est terminée\u00a0: elle se relit sans se modifier.',
    });
    state.respond = () => ({ data: null, error: { message: 'buyer_archived' } });
    expect(await answerItem(ITEM, 'visit', [])).toEqual({
      ok: false,
      error: 'Cet acquéreur est archivé.',
    });
    service.reset();
    expect((await answerItem(ITEM, 'oui', [])).ok).toBe(false);
    expect((await answerItem('pas-un-uuid', 'visit', [])).ok).toBe(false);
    expect(service.writes()).toEqual([]);
  });

  it('« Terminer » : le déroulé recalculé par le serveur et ses créneaux, en UNE transaction', async () => {
    state.queue = [{ data: buyerRow }, { data: selectionRow() }, { data: [] }, { data: true }];
    expect(await finishPresentation(BUYER, SELECTION, ['sat_morning', 'minuit', 'sunday'])).toEqual(
      { ok: true },
    );
    expect(service.writes()).toEqual(['rpc finish_buyer_presentation']);
    expect(rpcArgs('finish_buyer_presentation')).toMatchObject({
      p_agency_id: 'agency-a',
      p_selection_id: SELECTION,
      p_availability: ['sat_morning', 'sunday'],
      p_deck: { words: 'Un 3 pièces à Antibes.' },
    });
    // Aucun bien à visiter relu en base : aucun créneau n'est figé comme donné en rendez-vous.
    expect(
      (rpcArgs('finish_buyer_presentation')?.p_deck as { meetingAvailability: string[] })
        .meetingAvailability,
    ).toEqual([]);
  });

  it('les créneaux figés : ceux choisis, s’il veut visiter au moins un bien ; sinon aucun', () => {
    expect(meetingSlots(['sat_morning', 'sunday'], true)).toEqual(['sat_morning', 'sunday']);
    expect(meetingSlots(['sat_morning', 'sunday'], false)).toEqual([]);
  });

  it('« Terminer » sur une présentation déjà terminée : rien ne se réécrit', async () => {
    state.queue = [
      { data: buyerRow },
      { data: selectionRow('2026-10-25T11:00:00Z') },
      { data: [] },
    ];
    expect(await finishPresentation(BUYER, SELECTION, ['sunday'])).toEqual({ ok: true });
    expect(service.writes()).toEqual([]);
  });

  it('« Retirer de la sélection » : doux, et seulement pour un bien bloqué sur un indispensable', async () => {
    const replies = () => [
      { data: itemRow() },
      { data: buyerRow },
      { data: selectionRow() },
      { data: [] },
      { data: null },
    ];
    state.queue = replies();
    state.blocked = false;
    expect((await removeSelectionItem(ITEM)).ok).toBe(false);
    expect(service.writes()).toEqual([]);
    state.queue = replies();
    state.blocked = true;
    expect((await removeSelectionItem(ITEM)).ok).toBe(true);
    // Un retrait doux : une date posée, jamais une suppression.
    expect(service.writes()).toEqual(['update buyer_selection_items']);
    expect(
      Object.keys(
        service.calls.find((call) => call.method === 'update')?.args[0] as Record<string, unknown>,
      ),
    ).toEqual(['removed_at']);
  });

  it('présentation terminée ou acquéreur archivé : ni phrase ni retrait', async () => {
    state.respond = (target) =>
      target === 'from buyer_selection_items'
        ? { data: itemRow('2026-10-25T11:00:00Z') }
        : { data: [] };
    expect((await saveItemPitch(ITEM, 'Une phrase.')).ok).toBe(false);
    expect((await removeSelectionItem(ITEM)).ok).toBe(false);
    state.respond = (target) =>
      target === 'from buyer_selection_items'
        ? { data: itemRow(null, '2026-10-20') }
        : { data: [] };
    expect((await saveItemPitch(ITEM, 'Une phrase.')).ok).toBe(false);
    expect(service.writes()).toEqual([]);
  });

  it('« Pourquoi » : 140 caractères au plus ; vide, la phrase proposée revient', async () => {
    state.respond = (target) =>
      target === 'from buyer_selection_items' ? { data: itemRow() } : { data: null };
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
    state.respond = (target) => (target === 'from buyers' ? { data: buyerRow } : { data: null });
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
