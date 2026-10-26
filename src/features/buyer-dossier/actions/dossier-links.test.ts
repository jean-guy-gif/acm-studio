import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeSupabase } from '@/test-fixtures/fake-supabase';

// Mission 119 (partie B) — le lien du dossier : créé par un membre de l'agence sur une fiche qui a
// une sélection, le condensat seul en base, retiré dans l'agence ; « Sans photo » sur un bien de la
// fiche seulement.
const state = vi.hoisted(() => ({
  profile: null as null | { id: string; agency_id: string; removed_at: string | null },
  dossier: null as null | { selectionId: string },
  respond: (() => ({ data: null })) as (table: string) => { data?: unknown; error?: unknown },
}));
const service = fakeSupabase((calls) => {
  const table = [...calls].reverse().find((call) => call.method === 'from')?.args[0];
  return state.respond(String(table));
});
vi.mock('@/lib/auth/get-profile', () => ({ getProfile: async () => state.profile }));
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: () => service.client }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({}) }));
vi.mock('@/features/buyer-dossier/queries/load-buyer-dossier', () => ({
  loadBuyerDossier: async () => state.dossier,
}));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));

const { createDossierLink, removeDossierLink, setDossierPhoto } =
  await import('@/features/buyer-dossier/actions/dossier-links');
const BUYER = '11111111-1111-4111-8111-111111111111';
const LINK = '22222222-2222-4222-8222-222222222222';
const ITEM = '33333333-3333-4333-8333-333333333333';

describe('le lien du dossier acquéreur', () => {
  beforeEach(() => {
    service.reset();
    state.profile = { id: 'advisor-1', agency_id: 'agency-a', removed_at: null };
    state.dossier = { selectionId: 'sel-1' };
    state.respond = () => ({ data: null });
  });

  it('sans profil, retiré, ou sans sélection : rien n’est écrit', async () => {
    state.profile = null;
    expect((await createDossierLink(BUYER)).ok).toBe(false);
    state.profile = { id: 'advisor-1', agency_id: 'agency-a', removed_at: '2026-10-01' };
    expect((await removeDossierLink(BUYER, LINK)).ok).toBe(false);
    expect((await setDossierPhoto(BUYER, ITEM, true)).ok).toBe(false);
    state.profile = { id: 'advisor-1', agency_id: 'agency-a', removed_at: null };
    state.dossier = null;
    expect(await createDossierLink(BUYER)).toEqual({
      ok: false,
      error: 'Pas de dossier sans sélection retenue.',
    });
    expect(service.writes()).toEqual([]);
  });

  it('crée le lien : le condensat sha256 en base, jamais le jeton ; l’adresse « /dossier/<43> » rendue une fois', async () => {
    state.respond = () => ({ data: { id: LINK, expires_at: '2026-11-23T10:00:00Z' } });
    const result = await createDossierLink(BUYER);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.url).toMatch(/\/dossier\/[A-Za-z0-9_-]{43}$/);
    const insert = service.calls.find((call) => call.method === 'insert')?.args[0] as Record<
      string,
      string
    >;
    expect(insert).toMatchObject({
      agency_id: 'agency-a',
      buyer_id: BUYER,
      selection_id: 'sel-1',
      created_by: 'advisor-1',
    });
    expect(insert.token_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.url).not.toContain(insert.token_hash);
  });

  it('« Créer un nouveau lien » retire les liens précédents de la fiche, dans l’agence, jamais le nouveau', async () => {
    state.respond = () => ({ data: { id: LINK, expires_at: '2026-11-23T10:00:00Z' } });
    expect((await createDossierLink(BUYER, true)).ok).toBe(true);
    expect(service.writes()).toEqual(['insert buyer_dossier_links', 'delete buyer_dossier_links']);
    const afterDelete = service.calls.slice(
      service.calls.findIndex((call) => call.method === 'delete'),
    );
    expect(afterDelete.filter((call) => call.method === 'eq').map((call) => call.args)).toEqual([
      ['buyer_id', BUYER],
      ['agency_id', 'agency-a'],
    ]);
    expect(afterDelete.find((call) => call.method === 'neq')?.args).toEqual(['id', LINK]);
  });

  it('« Créer un nouveau lien » dont l’ancien ne se retire pas : le nouveau est retiré, rien ne change', async () => {
    const answers = [
      { data: { id: LINK, expires_at: '2026-11-23T10:00:00Z' } },
      { error: { message: 'refusé' } },
      { data: null },
    ];
    state.respond = () => answers.shift() ?? { data: null };
    expect(await createDossierLink(BUYER, true)).toEqual({
      ok: false,
      error: 'Le lien n’a pas pu être remplacé. Réessayez.',
    });
    expect(service.writes()).toEqual([
      'insert buyer_dossier_links',
      'delete buyer_dossier_links',
      'delete buyer_dossier_links',
    ]);
    const lastDelete = service.calls.slice(
      service.calls.map((call) => call.method).lastIndexOf('delete'),
    );
    expect(lastDelete.filter((call) => call.method === 'eq').map((call) => call.args)).toEqual([
      ['id', LINK],
    ]);
  });

  it('« nouveau lien » ne se lit que s’il vaut exactement vrai', async () => {
    state.respond = () => ({ data: { id: LINK, expires_at: '2026-11-23T10:00:00Z' } });
    expect((await createDossierLink(BUYER, 'true')).ok).toBe(true);
    expect(service.writes()).toEqual(['insert buyer_dossier_links']);
  });

  it('un lien créé sans « nouveau lien » ne retire rien', async () => {
    state.respond = () => ({ data: { id: LINK, expires_at: '2026-11-23T10:00:00Z' } });
    expect((await createDossierLink(BUYER)).ok).toBe(true);
    expect(service.writes()).toEqual(['insert buyer_dossier_links']);
  });

  it('retire le lien dans l’agence seulement', async () => {
    state.respond = () => ({ data: [{ id: LINK }] });
    expect(await removeDossierLink(BUYER, LINK)).toEqual({ ok: true });
    expect(service.writes()).toEqual(['delete buyer_dossier_links']);
    const filters = service.calls
      .filter((call) => call.method === 'eq')
      .map((call) => call.args[0]);
    expect(filters).toEqual(['id', 'buyer_id', 'agency_id']);
  });

  it('« Sans photo » : sur un bien de la fiche, dans l’agence ; une valeur douteuse est refusée', async () => {
    expect((await setDossierPhoto(BUYER, ITEM, 'oui')).ok).toBe(false);
    state.respond = () => ({ data: { id: ITEM, buyer_selections: { buyer_id: 'autre' } } });
    expect((await setDossierPhoto(BUYER, ITEM, true)).ok).toBe(false);
    expect(service.writes()).toEqual([]);
    state.respond = () => ({ data: { id: ITEM, buyer_selections: { buyer_id: BUYER } } });
    expect(await setDossierPhoto(BUYER, ITEM, true)).toEqual({ ok: true });
    expect(service.writes()).toEqual(['update buyer_selection_items']);
    expect(service.calls.find((call) => call.method === 'update')?.args[0]).toEqual({
      dossier_hide_photo: true,
    });
  });
});
