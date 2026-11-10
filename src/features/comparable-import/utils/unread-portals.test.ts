import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  isUnreadPortalHost,
  isUnreadPortalUrl,
  UNREAD_PORTAL_MESSAGE,
} from '@/features/comparable-import/utils/unread-portals';
import { fakeSupabase } from '@/test-fixtures/fake-supabase';

// Mission 150 (mesures du 10/11) — Figaro Immobilier ne se lit plus (ni prix ni surface) : une
// adresse collée de ce site est refusée avant toute lecture, à l'écran comme au serveur.

const state = vi.hoisted(() => ({ pageRead: 0, actions: 0 }));
const db = fakeSupabase(() => ({ data: { id: 'p1' } }));

vi.mock('@/lib/auth/get-profile', () => ({
  getProfile: async () => ({ id: 'u1', agency_id: 'a1', removed_at: null }),
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => db.client }));
vi.mock('@/features/browser-extension/client', () => ({
  fetchRobotsViaExtension: async () => {
    state.pageRead += 1;
    return { ok: true, text: '' };
  },
  fetchPageViaExtension: async () => {
    state.pageRead += 1;
    return { ok: true, html: '<html></html>', finalUrl: '', size: 13, durationMs: 1 };
  },
}));

const FIGARO = 'https://immobilier.lefigaro.fr/annonces/annonce-105506109.html';

beforeEach(() => {
  state.pageRead = 0;
  state.actions = 0;
  db.reset();
});

describe('les sites qu’ACM ne lit plus', () => {
  it('Figaro Immobilier, et lui seul', () => {
    expect(isUnreadPortalHost('immobilier.lefigaro.fr')).toBe(true);
    expect(isUnreadPortalHost('www.immobilier.lefigaro.fr')).toBe(true);
    expect(isUnreadPortalUrl(FIGARO)).toBe(true);
    for (const url of [
      'https://www.seloger.com/annonces/achat/maison/vence-06/1.htm',
      'https://www.bienici.com/annonce/vente/vence/maison/5pieces/ag-1',
      'https://www.green-acres.fr/fr/properties/Au9ynlkd33pc1o6v.htm',
      'https://www.maisonsetappartements.fr/ads/4580682',
      'https://www.lefigaro.fr/actualite',
    ]) {
      expect(isUnreadPortalUrl(url), url).toBe(false);
    }
    expect(isUnreadPortalUrl('pas une adresse')).toBe(false);
  });

  it('l’écran refuse une adresse Figaro collée, sans lire la page ni appeler le serveur', async () => {
    const { importListingFromUrl } =
      await import('@/features/comparable-import/services/import-listing-from-url');
    const action = async () => {
      state.actions += 1;
      return { ok: false as const, error: 'non' };
    };
    const result = await importListingFromUrl({
      url: FIGARO,
      extensionAvailable: true,
      importUrlAction: action,
      importHtmlAction: action,
    });
    expect(result).toEqual({ ok: false, error: UNREAD_PORTAL_MESSAGE });
    expect(state.pageRead).toBe(0);
    expect(state.actions).toBe(0);
  });

  it('le serveur la refuse aussi, par l’adresse comme par la page lue, sans rien écrire', async () => {
    const { importComparableUrl } =
      await import('@/features/comparable-import/actions/import-comparable-url');
    const { importComparableHtml } =
      await import('@/features/comparable-import/actions/import-comparable-html');
    const byUrl = new FormData();
    byUrl.set('url', FIGARO);
    expect(await importComparableUrl('p1', byUrl)).toEqual({
      ok: false,
      error: UNREAD_PORTAL_MESSAGE,
    });
    const byHtml = new FormData();
    byHtml.set('url', FIGARO);
    byHtml.set('html', '<html><title>495 000 €</title></html>');
    expect(await importComparableHtml('p1', byHtml)).toEqual({
      ok: false,
      error: UNREAD_PORTAL_MESSAGE,
    });
    expect(db.writes()).toEqual([]);
  });
});
