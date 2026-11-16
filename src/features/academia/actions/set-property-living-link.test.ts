import { beforeEach, describe, expect, it, vi } from 'vitest';

import { dismissalKey } from '@/features/buyer-dismissals/services/dismissal-key';
import { ACADEMIA_LIVING_HERE_ERROR } from '@/lib/academia';
import { fakeSupabase } from '@/test-fixtures/fake-supabase';

// Mission 156 — le lien « Vivre ici » d'un bien hors mandat, collé sur le dossier acquéreur : tout
// est relu au serveur (le conseiller, l'interrupteur, la fiche de l'agence, le bien de SA sélection,
// non retiré, hors mandat ; la clé du bien recalculée ici ; seulement un lien d'Academia). Un refus
// n'écrit rien.
const BUYER = '0bbbbbbb-0000-4000-8000-000000000001';
const ITEM = '0ddddddd-0000-4000-8000-000000000001';
const SELECTION = '0eeeeeee-0000-4000-8000-000000000001';
const COMPETITOR = '0fffffff-0000-4000-8000-000000000001';
const SELOGER = 'https://www.seloger.com/annonces/achat/maison/vence-06/123456789.htm';
const LINK = 'https://app.myacademia.ai/l/k7Qx2mRv9a';
// La clé de la boucle pour cette annonce (M134, M139) : son identité publiée.
const KEY = dismissalKey({ source: 'listing', url: SELOGER });

type Item = {
  id: string;
  source: string;
  reference: string;
  removed_at: string | null;
  selection_id: string;
};
const state = vi.hoisted(() => ({
  open: true,
  profile: { id: 'u1', agency_id: 'agency-a', removed_at: null as string | null },
  buyer: { id: '0bbbbbbb-0000-4000-8000-000000000001' } as { id: string } | null,
  item: null as Item | null,
  selection: { id: '0eeeeeee-0000-4000-8000-000000000001' } as { id: string } | null,
  comparables: [] as { id: string; listing_url: string | null }[],
  writeError: null as unknown,
}));
const service = fakeSupabase((calls) => {
  const table = [...calls].reverse().find((call) => call.method === 'from')?.args[0];
  if (table === 'buyers') return { data: state.buyer };
  if (table === 'buyer_selection_items') return { data: state.item };
  if (table === 'buyer_selections') return { data: state.selection };
  if (table === 'comparables') return { data: state.comparables };
  if (table === 'property_living_here_links') {
    return state.writeError
      ? { error: state.writeError }
      : { data: { url: LINK, pasted_at: '2026-11-16T09:00:00Z' } };
  }
  return { data: null };
});
vi.mock('@/lib/auth/get-profile', () => ({ getProfile: async () => state.profile }));
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: () => service.client }));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('@/lib/app-errors/report-server-error', () => ({ reportServerError: async () => {} }));
vi.mock('@/features/academia/services/living-here-switch', () => ({
  livingHereEverywhereOpen: () => state.open,
}));

const { setPropertyLivingLink } =
  await import('@/features/academia/actions/set-property-living-link');

const writes = () =>
  service.calls.filter((call) => ['insert', 'upsert', 'update', 'delete'].includes(call.method));

describe('coller le lien « Vivre ici » d’un bien hors mandat', () => {
  beforeEach(() => {
    service.reset();
    state.open = true;
    state.profile.removed_at = null;
    state.buyer = { id: BUYER };
    state.selection = { id: SELECTION };
    state.item = {
      id: ITEM,
      source: 'listing',
      reference: SELOGER,
      removed_at: null,
      selection_id: SELECTION,
    };
    state.comparables = [];
    state.writeError = null;
  });

  it('une annonce du marché : la clé de son identité publiée, l’auteur, le lien relu', async () => {
    const result = await setPropertyLivingLink(BUYER, ITEM, `  ${LINK}  `);
    expect(result).toEqual({ ok: true, url: LINK, pastedAt: '2026-11-16T09:00:00Z' });
    const upsert = service.calls.find((call) => call.method === 'upsert');
    expect(upsert?.args[0]).toEqual({
      agency_id: 'agency-a',
      property_key: KEY,
      url: LINK,
      pasted_by: 'u1',
    });
    expect(upsert?.args[1]).toEqual({ onConflict: 'agency_id,property_key' });
  });

  it('un concurrent avec annonce : la même clé que son annonce (un lien par bien)', async () => {
    state.item = {
      id: ITEM,
      source: 'competitor',
      reference: COMPETITOR,
      removed_at: null,
      selection_id: SELECTION,
    };
    state.comparables = [{ id: COMPETITOR, listing_url: SELOGER }];
    expect((await setPropertyLivingLink(BUYER, ITEM, LINK)).ok).toBe(true);
    expect(
      (service.calls.find((call) => call.method === 'upsert')?.args[0] as { property_key: string })
        .property_key,
    ).toBe(KEY);
  });

  it('un concurrent sans annonce reconnue : sa propre clé', async () => {
    state.item = {
      id: ITEM,
      source: 'competitor',
      reference: COMPETITOR,
      removed_at: null,
      selection_id: SELECTION,
    };
    state.comparables = [{ id: COMPETITOR, listing_url: null }];
    expect((await setPropertyLivingLink(BUYER, ITEM, LINK)).ok).toBe(true);
    expect(
      (service.calls.find((call) => call.method === 'upsert')?.args[0] as { property_key: string })
        .property_key,
    ).toBe(`competitor:${COMPETITOR}`);
  });

  it('un lien vide le retire : supprimé par sa clé, dans l’agence', async () => {
    expect(await setPropertyLivingLink(BUYER, ITEM, '   ')).toEqual({
      ok: true,
      url: null,
      pastedAt: null,
    });
    const del = service.calls.findIndex((call) => call.method === 'delete');
    expect(del).toBeGreaterThan(-1);
    const after = service.calls.slice(del);
    expect(after).toContainEqual({ method: 'eq', args: ['agency_id', 'agency-a'] });
    expect(after).toContainEqual({ method: 'eq', args: ['property_key', KEY] });
  });

  it('seulement un lien d’Academia : le message de M147 A, rien d’écrit', async () => {
    expect(await setPropertyLivingLink(BUYER, ITEM, 'https://exemple.fr/l/x')).toEqual({
      ok: false,
      error: ACADEMIA_LIVING_HERE_ERROR,
    });
    expect(writes()).toEqual([]);
  });

  it('interrupteur éteint (production avant le texte A3) : refusé, rien d’écrit', async () => {
    state.open = false;
    const result = await setPropertyLivingLink(BUYER, ITEM, LINK);
    expect(result.ok).toBe(false);
    expect(service.calls).toEqual([]);
  });

  it('refusé sans rien écrire : membre retiré, fiche archivée ou d’une autre agence, bien d’une autre fiche, retiré, mandat', async () => {
    state.profile.removed_at = '2026-11-01T00:00:00Z';
    expect((await setPropertyLivingLink(BUYER, ITEM, LINK)).ok).toBe(false);
    state.profile.removed_at = null;

    state.buyer = null;
    expect((await setPropertyLivingLink(BUYER, ITEM, LINK)).ok).toBe(false);
    state.buyer = { id: BUYER };

    state.selection = null;
    expect((await setPropertyLivingLink(BUYER, ITEM, LINK)).ok).toBe(false);
    state.selection = { id: SELECTION };

    state.item = {
      id: ITEM,
      source: 'listing',
      reference: SELOGER,
      removed_at: '2026-11-10T00:00:00Z',
      selection_id: SELECTION,
    };
    expect((await setPropertyLivingLink(BUYER, ITEM, LINK)).ok).toBe(false);

    state.item = {
      id: ITEM,
      source: 'project',
      reference: COMPETITOR,
      removed_at: null,
      selection_id: SELECTION,
    };
    expect(await setPropertyLivingLink(BUYER, ITEM, LINK)).toEqual({
      ok: false,
      error: 'Le lien d’un mandat se colle sur son bien vendeur.',
    });

    state.item = {
      id: ITEM,
      source: 'competitor',
      reference: COMPETITOR,
      removed_at: null,
      selection_id: SELECTION,
    };
    state.comparables = [];
    expect((await setPropertyLivingLink(BUYER, ITEM, LINK)).ok).toBe(false);

    expect((await setPropertyLivingLink('pas-un-id', ITEM, LINK)).ok).toBe(false);
    expect((await setPropertyLivingLink(BUYER, 42, LINK)).ok).toBe(false);
    expect(writes()).toEqual([]);
  });

  it('la sélection lue est celle de CETTE fiche, dans l’agence', async () => {
    await setPropertyLivingLink(BUYER, ITEM, LINK);
    const from = service.calls.findIndex(
      (call) => call.method === 'from' && call.args[0] === 'buyer_selections',
    );
    const after = service.calls.slice(from, from + 6);
    expect(after).toContainEqual({ method: 'eq', args: ['buyer_id', BUYER] });
    expect(after).toContainEqual({ method: 'eq', args: ['agency_id', 'agency-a'] });
  });

  it('une écriture refusée par la base : le message, au journal', async () => {
    state.writeError = { message: 'boom' };
    expect(await setPropertyLivingLink(BUYER, ITEM, LINK)).toEqual({
      ok: false,
      error: 'Le lien n’a pas pu être enregistré. Réessayez.',
    });
  });
});
