import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeSupabase } from '@/test-fixtures/fake-supabase';

// Mission 119 — demander, annuler, terminer, « Visite faite » : chaque geste est un fait daté, écrit
// par le serveur dans l'agence de l'appelant ; un appel refusé n'écrit rien.
const state = vi.hoisted(() => ({
  profile: null as null | { id: string; agency_id: string; removed_at: string | null },
  respond: (() => ({ data: null })) as (
    table: string,
    calls: { method: string; args: unknown[] }[],
  ) => { data?: unknown; error?: unknown },
}));
const service = fakeSupabase((calls) => {
  const table = [...calls].reverse().find((call) => call.method === 'from')?.args[0];
  return state.respond(String(table), calls);
});
vi.mock('@/lib/auth/get-profile', () => ({ getProfile: async () => state.profile }));
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: () => service.client }));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('@/lib/app-errors/report-server-error', () => ({ reportServerError: async () => {} }));

const { requestVisit, cancelVisitRequest, recordVisitDone } =
  await import('@/features/buyer-presentation/actions/visit-requests');

const requestRow = {
  id: 'r1',
  agency_id: 'agency-a',
  buyer_id: 'b1',
  buyer_selection_item_id: 'i1',
  requested_at: '2026-10-24T10:00:00Z',
  requested_during: 'presentation',
  cancelled_at: null,
  visited_at: null,
  feedback: null,
  outcome: 'to_plan',
  created_at: '2026-10-24T10:00:00Z',
  opinion: null,
  liked: [],
  disliked: [],
  next_step: null,
};
// Mission 139 — le compte rendu de « Visite faite ».
const REPORT = {
  opinion: 'not_for_me',
  liked: ['light'],
  disliked: ['light', 'noise', 'noise'],
  nextStep: 'keep_searching',
  note: '  Trop sombre  ',
};
const itemRow = (presentedAt: string | null, archivedAt: string | null = null) => ({
  id: 'i1',
  buyer_selections: {
    buyer_id: 'b1',
    presented_at: presentedAt,
    buyers: { archived_at: archivedAt },
  },
});

describe('les demandes de visite', () => {
  beforeEach(() => {
    service.reset();
    state.profile = { id: 'advisor-1', agency_id: 'agency-a', removed_at: null };
    state.respond = () => ({ data: null });
  });

  it('sans profil, ou retiré : rien n’est écrit', async () => {
    state.profile = null;
    expect((await requestVisit('i1')).ok).toBe(false);
    state.profile = { id: 'advisor-1', agency_id: 'agency-a', removed_at: '2026-10-01' };
    expect((await cancelVisitRequest('r1')).ok).toBe(false);
    expect((await recordVisitDone('r1', REPORT)).ok).toBe(false);
    expect(service.writes()).toEqual([]);
  });

  it('demander : le bien relu dans l’agence, la demande datée « par le conseiller » (M122)', async () => {
    state.respond = (table) =>
      table === 'buyer_selection_items'
        ? { data: itemRow(null) }
        : { data: { ...requestRow, requested_during: 'conseiller' } };
    const result = await requestVisit('i1');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.request).toMatchObject({ itemId: 'i1', requestedDuring: 'conseiller' });
    expect(service.writes()).toEqual(['insert buyer_visit_requests']);
    expect(service.calls.find((call) => call.method === 'insert')?.args[0]).toEqual({
      agency_id: 'agency-a',
      buyer_id: 'b1',
      buyer_selection_item_id: 'i1',
      requested_during: 'conseiller',
    });
    // Un bien retiré de la sélection (retrait doux) ne se demande plus.
    expect(
      service.calls.some((call) => call.method === 'is' && call.args[0] === 'removed_at'),
    ).toBe(true);
  });

  it('un acquéreur archivé refuse ; rien n’est écrit', async () => {
    state.respond = (table) =>
      table === 'buyer_selection_items'
        ? { data: itemRow(null, '2026-10-20') }
        : { data: requestRow };
    expect((await requestVisit('i1')).ok).toBe(false);
    expect(service.writes()).toEqual([]);
  });

  it('annuler : datée, sur une demande ni visitée ni déjà annulée', async () => {
    state.respond = (_table, calls) =>
      calls.some((call) => call.method === 'update')
        ? { data: { ...requestRow, cancelled_at: '2026-10-24T10:05:00Z' } }
        : {
            data: {
              requested_during: 'presentation',
              buyer_selection_items: { buyer_selections: { presented_at: null } },
            },
          };
    const result = await cancelVisitRequest('r1');
    expect(result.ok && result.request.cancelledAt).toBe('2026-10-24T10:05:00Z');
    expect(service.writes()).toEqual(['update buyer_visit_requests']);
    const filters = service.calls
      .filter((call) => call.method === 'is')
      .map((call) => call.args[0]);
    expect(filters).toEqual(['visited_at', 'cancelled_at']);
  });

  it('annuler après « Terminer » : refusé, rien n’est écrit', async () => {
    state.respond = () => ({
      data: {
        requested_during: 'presentation',
        buyer_selection_items: { buyer_selections: { presented_at: '2026-10-24T11:00:00Z' } },
      },
    });
    expect(await cancelVisitRequest('r1')).toEqual({
      ok: false,
      error: 'La présentation est terminée : elle se relit sans se modifier.',
    });
    expect(service.writes()).toEqual([]);
  });

  it('« Visite faite » : le compte rendu relu, l’issue déduite, daté ; une seule fois', async () => {
    expect(await recordVisitDone('r1', { ...REPORT, opinion: 'bof' })).toEqual({
      ok: false,
      error: 'Choisissez son avis et la suite de la visite.',
    });
    expect(await recordVisitDone('r1', { ...REPORT, nextStep: 'offer' })).toEqual({
      ok: false,
      error: 'Choisissez son avis et la suite de la visite.',
    });
    expect(service.writes()).toEqual([]);
    state.respond = () => ({
      data: {
        ...requestRow,
        visited_at: '2026-10-25T10:00:00Z',
        feedback: 'Trop sombre',
        outcome: 'declined',
        opinion: 'not_for_me',
        liked: ['light'],
        disliked: ['light', 'noise'],
        next_step: 'keep_searching',
      },
    });
    const result = await recordVisitDone('r1', REPORT);
    expect(result.ok && result.request.outcome).toBe('declined');
    expect(result.ok && result.request.report).toEqual({
      opinion: 'not_for_me',
      liked: ['light'],
      disliked: ['light', 'noise'],
      nextStep: 'keep_searching',
    });
    const update = service.calls.find((call) => call.method === 'update')?.args[0] as Record<
      string,
      unknown
    >;
    expect(update).toMatchObject({
      feedback: 'Trop sombre',
      outcome: 'declined',
      opinion: 'not_for_me',
      liked: ['light'],
      disliked: ['light', 'noise'],
      next_step: 'keep_searching',
    });
    expect(typeof update.visited_at).toBe('string');
    // Une visite faite ne se redate pas : l'écriture ne vise que les demandes non visitées.
    expect(
      service.calls.filter((call) => call.method === 'is').map((call) => call.args[0]),
    ).toEqual(['cancelled_at', 'visited_at']);
    // « On continue à chercher » : aucune deuxième visite demandée.
    expect(service.calls.filter((call) => call.method === 'insert')).toEqual([]);
  });

  it('« Offre envisagée » : l’issue offre ; « Deuxième visite » : une nouvelle demande', async () => {
    state.respond = () => ({
      data: { ...requestRow, visited_at: '2026-10-25T10:00:00Z', outcome: 'offer' },
    });
    await recordVisitDone('r1', { ...REPORT, opinion: 'love', nextStep: 'offer' });
    expect(service.calls.find((call) => call.method === 'update')?.args[0]).toMatchObject({
      outcome: 'offer',
      next_step: 'offer',
    });
    service.reset();
    // Aucune demande encore vivante sur ce bien : la deuxième visite est demandée.
    state.respond = (_table, calls) =>
      calls.some((call) => call.method === 'limit')
        ? { data: [] }
        : { data: { ...requestRow, visited_at: '2026-10-25T10:00:00Z', outcome: 'visited' } };
    await recordVisitDone('r1', { ...REPORT, opinion: 'mixed', nextStep: 'second_visit' });
    expect(service.calls.find((call) => call.method === 'insert')?.args[0]).toEqual({
      agency_id: 'agency-a',
      buyer_id: 'b1',
      buyer_selection_item_id: 'i1',
      requested_during: 'conseiller',
    });
  });

  it('« Deuxième visite » ne redouble pas une demande encore vivante sur ce bien', async () => {
    state.respond = (_table, calls) =>
      calls.some((call) => call.method === 'limit')
        ? { data: [{ id: 'r2' }] }
        : { data: { ...requestRow, visited_at: '2026-10-25T10:00:00Z', outcome: 'visited' } };
    await recordVisitDone('r1', { ...REPORT, opinion: 'mixed', nextStep: 'second_visit' });
    expect(service.calls.filter((call) => call.method === 'insert')).toEqual([]);
  });
});
