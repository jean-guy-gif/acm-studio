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

const { requestVisit, cancelVisitRequest, finishPresentation, recordVisitDone } =
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
    expect((await requestVisit('i1', 'presentation')).ok).toBe(false);
    state.profile = { id: 'advisor-1', agency_id: 'agency-a', removed_at: '2026-10-01' };
    expect((await cancelVisitRequest('r1')).ok).toBe(false);
    expect((await finishPresentation('b1', 's1')).ok).toBe(false);
    expect((await recordVisitDone('r1', 'x', 'visited')).ok).toBe(false);
    expect(service.writes()).toEqual([]);
  });

  it('demander : le bien relu dans l’agence, la demande datée « pendant la présentation »', async () => {
    state.respond = (table) =>
      table === 'buyer_selection_items' ? { data: itemRow(null) } : { data: requestRow };
    const result = await requestVisit('i1', 'presentation');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.request).toMatchObject({
      itemId: 'i1',
      requestedDuring: 'presentation',
      outcome: 'to_plan',
    });
    expect(service.writes()).toEqual(['insert buyer_visit_requests']);
    expect(service.calls.find((call) => call.method === 'insert')?.args[0]).toEqual({
      agency_id: 'agency-a',
      buyer_id: 'b1',
      buyer_selection_item_id: 'i1',
      requested_during: 'presentation',
    });
  });

  it('un « pendant quoi » inconnu vaut « par le conseiller » ; un acquéreur archivé ou une présentation terminée refusent', async () => {
    state.respond = (table) =>
      table === 'buyer_selection_items'
        ? { data: itemRow(null) }
        : { data: { ...requestRow, requested_during: 'conseiller' } };
    const loose = await requestVisit('i1', 'live');
    expect(loose.ok && loose.request.requestedDuring).toBe('conseiller');
    service.reset();
    state.respond = (table) =>
      table === 'buyer_selection_items'
        ? { data: itemRow('2026-10-24T11:00:00Z') }
        : { data: requestRow };
    expect(await requestVisit('i1', 'presentation')).toEqual({
      ok: false,
      error: 'La présentation est terminée : elle se relit sans se modifier.',
    });
    expect(service.writes()).toEqual([]);
    state.respond = (table) =>
      table === 'buyer_selection_items'
        ? { data: itemRow(null, '2026-10-20') }
        : { data: requestRow };
    expect((await requestVisit('i1', 'presentation')).ok).toBe(false);
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

  it('terminer : pose presented_at une fois, sur la sélection présentée', async () => {
    state.respond = () => ({ data: { id: 's1', presented_at: null } });
    expect(await finishPresentation('b1', 's1')).toEqual({ ok: true });
    expect(service.writes()).toEqual(['update buyer_selections']);
    expect(
      service.calls.some(
        (call) => call.method === 'eq' && call.args[0] === 'id' && call.args[1] === 's1',
      ),
    ).toBe(true);
    service.reset();
    state.respond = () => ({ data: { id: 's1', presented_at: '2026-10-24T11:00:00Z' } });
    expect(await finishPresentation('b1', 's1')).toEqual({ ok: true });
    expect(service.writes()).toEqual([]);
  });

  it('« depuis le dossier » est réservé au lien public : d’un conseiller, c’est « par le conseiller »', async () => {
    state.respond = (table) =>
      table === 'buyer_selection_items'
        ? { data: itemRow(null) }
        : { data: { ...requestRow, requested_during: 'conseiller' } };
    const result = await requestVisit('i1', 'dossier');
    expect(result.ok && result.request.requestedDuring).toBe('conseiller');
    expect(service.calls.find((call) => call.method === 'insert')?.args[0]).toMatchObject({
      requested_during: 'conseiller',
    });
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

  it('« Visite faite » : datée, retour tronqué, issue dans la liste ; « à planifier » refusé', async () => {
    expect(await recordVisitDone('r1', 'x', 'to_plan')).toEqual({
      ok: false,
      error: 'Choisissez l’issue de la visite.',
    });
    expect(await recordVisitDone('r1', 'x', 'signed')).toEqual({
      ok: false,
      error: 'Choisissez l’issue de la visite.',
    });
    expect(service.writes()).toEqual([]);
    state.respond = () => ({
      data: {
        ...requestRow,
        visited_at: '2026-10-25T10:00:00Z',
        feedback: 'Trop sombre',
        outcome: 'declined',
      },
    });
    const result = await recordVisitDone('r1', '  Trop sombre  ', 'declined');
    expect(result.ok && result.request.outcome).toBe('declined');
    const update = service.calls.find((call) => call.method === 'update')?.args[0] as Record<
      string,
      unknown
    >;
    expect(update).toMatchObject({ feedback: 'Trop sombre', outcome: 'declined' });
    expect(typeof update.visited_at).toBe('string');
    // Une visite faite ne se redate pas : l'écriture ne vise que les demandes non visitées.
    expect(
      service.calls.filter((call) => call.method === 'is').map((call) => call.args[0]),
    ).toEqual(['cancelled_at', 'visited_at']);
  });
});
