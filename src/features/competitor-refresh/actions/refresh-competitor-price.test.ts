import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeSupabase } from '@/test-fixtures/fake-supabase';

const state = vi.hoisted(() => ({
  competitor: null as Record<string, unknown> | null,
  status: 'meeting_completed',
  liveStartedAt: null as string | null,
  answers: 0,
  observed: [] as unknown[],
}));

const server = fakeSupabase((calls) => {
  const table = [...calls].reverse().find((call) => call.method === 'from')?.args[0];
  if (table === 'projects')
    return { data: { id: PROJECT, status: state.status, live_started_at: state.liveStartedAt } };
  if (table === 'live_seller_responses') return { count: state.answers };
  if (table === 'comparables') return { data: state.competitor };
  return {};
});

vi.mock('@/lib/auth/get-profile', () => ({
  getProfile: async () => ({ id: 'u-1', agency_id: 'a-1', removed_at: null }),
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => server.client }));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
// La lecture de la page elle-même est éprouvée ailleurs (extracteurs, M48) : ici, le prix lu.
vi.mock('@/features/comparable-import/services/extract-listing-data', () => ({
  extractListingData: (html: string) => ({ html }),
}));
vi.mock('@/features/comparable-import/services/normalize-listing-data', () => ({
  normalizeListingData: (parts: { html: string }) => {
    const price = /data-price="(\d+)"/.exec(parts.html)?.[1];
    return {
      data: price ? { price: Number(price), title: 'x' } : { price: null },
      foundFields: [],
    };
  },
}));
vi.mock('@/features/comparables/utils/imported-to-comparable-input', () => ({
  importedToComparableInput: (data: { price: number | null }) =>
    data.price ? { price: data.price, title: 'x' } : null,
}));
vi.mock('@/features/comparable-import/services/record-listing-observation', () => ({
  observeListing: async (_s: unknown, _a: unknown, url: string, data: { price: number }) => {
    state.observed.push({ url, price: data.price });
  },
}));

import { refreshCompetitorPrice } from '@/features/competitor-refresh/actions/refresh-competitor-price';
import { listingPayload } from '@/features/competitor-search/services/listing-payload';

const PROJECT = '33333333-3333-4333-8333-333333333333';
const COMPETITOR = '44444444-4444-4444-8444-444444444444';
const URL = 'https://www.seloger.com/annonces/achat/appartement/nice-06/123.htm';
const listingPage = (price: number) => `<html><body data-price="${price}"></body></html>`;
const updates = () =>
  server.calls.filter((call) => call.method === 'update').map((call) => call.args[0]);

beforeEach(() => {
  server.reset();
  state.observed = [];
  state.status = 'meeting_completed';
  state.liveStartedAt = null;
  state.answers = 0;
  state.competitor = { id: COMPETITOR, price: 300_000, listing_url: URL, listing_gone_at: null };
});

describe('relire le prix d’un concurrent retenu (mission 105)', () => {
  it('une page sans prix ni preuve (captcha) ne change rien', async () => {
    const outcome = await refreshCompetitorPrice(
      PROJECT,
      COMPETITOR,
      listingPayload(URL, '<html><body>Vérification de sécurité</body></html>', null),
    );
    expect(outcome).toEqual({ status: 'unreadable' });
    expect(server.writes()).toEqual([]);
  });

  it('une annonce qui prouve son retrait est marquée « Retirée depuis le rendez-vous »', async () => {
    const outcome = await refreshCompetitorPrice(
      PROJECT,
      COMPETITOR,
      listingPayload(
        URL,
        '<html><body><h1>Cette annonce n’est plus disponible</h1></body></html>',
        null,
      ),
    );
    expect(outcome).toEqual({ status: 'gone' });
    expect(updates()).toEqual([{ listing_gone_at: expect.any(String) }]);
  });

  it('un prix qui a baissé : constat daté, et nouveau prix du concurrent', async () => {
    const outcome = await refreshCompetitorPrice(
      PROJECT,
      COMPETITOR,
      listingPayload(URL, listingPage(285_000), null),
    );
    expect(outcome).toEqual({ status: 'changed', previous: 300_000, price: 285_000 });
    expect(state.observed).toEqual([{ url: URL, price: 285_000 }]);
    expect(updates()).toEqual([{ price: 285_000 }]);
  });

  it('un prix inchangé : le constat seul, le concurrent n’est pas réécrit', async () => {
    await refreshCompetitorPrice(
      PROJECT,
      COMPETITOR,
      listingPayload(URL, listingPage(300_000), null),
    );
    expect(state.observed).toEqual([{ url: URL, price: 300_000 }]);
    expect(updates()).toEqual([]);
  });

  it('une redirection hors de l’annonce aussi', async () => {
    const payload = listingPayload(URL, '', null);
    payload.set('gone', 'redirect');
    expect(await refreshCompetitorPrice(PROJECT, COMPETITOR, payload)).toEqual({ status: 'gone' });
  });

  it('refuse une autre annonce que celle du concurrent, et un dossier archivé', async () => {
    expect(
      await refreshCompetitorPrice(
        PROJECT,
        COMPETITOR,
        listingPayload('https://www.seloger.com/annonces/autre.htm', listingPage(1), null),
      ),
    ).toEqual({ status: 'unreadable' });
    state.status = 'archived';
    expect(
      await refreshCompetitorPrice(PROJECT, COMPETITOR, listingPayload(URL, listingPage(1), null)),
    ).toEqual({ status: 'unreadable' });
    expect(server.writes()).toEqual([]);
  });

  // Mission 152 — « Vérifier les annonces », sur « Avant le rendez-vous » : un dossier en
  // préparation ou prêt se relit, tant que son Live n'a pas commencé.
  it('relit un dossier prêt avant son Live, jamais après le début du Live', async () => {
    state.status = 'ready_for_meeting';
    expect(
      await refreshCompetitorPrice(
        PROJECT,
        COMPETITOR,
        listingPayload(URL, listingPage(285_000), null),
      ),
    ).toEqual({ status: 'changed', previous: 300_000, price: 285_000 });
    server.reset();
    state.liveStartedAt = '2026-11-11T10:00:00Z';
    expect(
      await refreshCompetitorPrice(PROJECT, COMPETITOR, listingPayload(URL, listingPage(1), null)),
    ).toEqual({ status: 'unreadable' });
    state.liveStartedAt = null;
    state.answers = 1;
    state.status = 'draft';
    expect(
      await refreshCompetitorPrice(PROJECT, COMPETITOR, listingPayload(URL, listingPage(1), null)),
    ).toEqual({ status: 'unreadable' });
    expect(server.writes()).toEqual([]);
  });
});
