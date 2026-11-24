import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  isUnreadPortalHost,
  isUnreadPortalUrl,
  UNREAD_PORTAL_MESSAGE,
} from '@/features/comparable-import/utils/unread-portals';
import { fakeSupabase } from '@/test-fixtures/fake-supabase';

// Mission 150 (mesures du 10/11) — un site dont la page ne se lit plus est refusé dès l'adresse
// collée, à l'écran comme au serveur. Lancement, mission 4 (24/11) : Figaro Immobilier se lit de
// nouveau, plus aucun site n'est refusé ; son adresse collée repart vers la lecture de la page.

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
  it('plus aucun : Figaro Immobilier se lit de nouveau', () => {
    expect(UNREAD_PORTAL_MESSAGE).not.toMatch(/Figaro/);
    for (const url of [
      FIGARO,
      'https://www.immobilier.lefigaro.fr/annonces/annonce-1.html',
      'https://www.seloger.com/annonces/achat/maison/vence-06/1.htm',
      'https://www.bienici.com/annonce/vente/vence/maison/5pieces/ag-1',
      'https://www.green-acres.fr/fr/properties/Au9ynlkd33pc1o6v.htm',
      'https://www.maisonsetappartements.fr/ads/4580682',
    ]) {
      expect(isUnreadPortalUrl(url), url).toBe(false);
    }
    expect(isUnreadPortalHost('immobilier.lefigaro.fr')).toBe(false);
    expect(isUnreadPortalUrl('pas une adresse')).toBe(false);
  });

  it('l’écran lit de nouveau une adresse Figaro collée : la page est demandée à l’extension', async () => {
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
    expect(result).not.toEqual({ ok: false, error: UNREAD_PORTAL_MESSAGE });
    expect(state.pageRead).toBeGreaterThan(0);
  });

  it('le serveur ne la refuse plus d’emblée', async () => {
    const { importComparableHtml } =
      await import('@/features/comparable-import/actions/import-comparable-html');
    const byHtml = new FormData();
    byHtml.set('url', FIGARO);
    byHtml.set('html', '<html><title>495 000 €</title></html>');
    const result = await importComparableHtml('p1', byHtml);
    expect(result).not.toEqual({ ok: false, error: UNREAD_PORTAL_MESSAGE });
  });
});
