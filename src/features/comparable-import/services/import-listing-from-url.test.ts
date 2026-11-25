import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ComparableImportResult } from '@/features/comparable-import/types';

// Lancement, mission 11 (suite, demande de Jean-Guy du 25/11) — deux petits points vus en vrai :
// 1. une annonce Belles Demeures, lien pris depuis une page de résultats, ne se lit pas ;
// 2. « L'annonce semble supprimée » s'affichait quand l'extension ne répondait pas : c'était le
//    serveur qui répondait à sa place, et les portails refusent le serveur (M74).

const state = vi.hoisted(() => ({
  robots: { ok: true, status: 200, text: '' } as
    { ok: true; status: number; text: string } | { ok: false; unreachable?: true },
  page: { ok: false, error: 'L’extension n’a pas répondu.' } as
    | { ok: true; html: string; finalUrl: string; size: number; durationMs: number }
    | { ok: false; error: string },
  asked: 0,
}));
vi.mock('@/features/browser-extension/client', () => ({
  fetchRobotsViaExtension: async () => {
    state.asked += 1;
    return state.robots;
  },
  fetchPageViaExtension: async () => {
    state.asked += 1;
    return state.page;
  },
}));

const { importListingFromUrl, EXTENSION_UNREAD_MESSAGE, ROBOTS_BLOCKED_MESSAGE } =
  await import('@/features/comparable-import/services/import-listing-from-url');
const { FETCH_MESSAGES } = await import('@/features/comparable-import/services/fetch-listing-page');

// Le lien tel qu'il sort d'une page de résultats (relevé le 25/11, annonce 277322163).
const BELLES_DEMEURES =
  'https://www.bellesdemeures.com/277322163/detail.htm?serp_view=list&search=distributionTypes%3DBuy%26estateTypes%3DHouse#ln=classified_search_results&m=classified_search_results_classified_classified_detail_XL&source=SL_web';
const SELOGER =
  'https://www.seloger.com/annonce/achat/provence-alpes-cote-d-azur/alpes-maritimes-06/cannes-06400/264A7CPMX7U5';
const AGENCY_SITE = 'https://www.agence-exemple.fr/biens/villa-mougins-1234';

const serverSays = (result: ComparableImportResult) => {
  const calls: string[] = [];
  const action = async (formData: FormData) => {
    calls.push(String(formData.get('url')));
    return result;
  };
  return { action, calls };
};
const failure = (error: string, reason?: string) =>
  ({ ok: false, error, reason }) as ComparableImportResult;

beforeEach(() => {
  state.robots = { ok: true, status: 200, text: '' };
  state.page = { ok: false, error: 'L’extension n’a pas répondu.' };
  state.asked = 0;
});

describe('Belles Demeures', () => {
  it('le lien d’une page de résultats : dit tout de suite, sans rien lire ni rien demander', async () => {
    const server = serverSays(failure('non'));
    const result = await importListingFromUrl({
      url: BELLES_DEMEURES,
      extensionAvailable: true,
      importUrlAction: server.action,
      importHtmlAction: server.action,
    });
    expect(result).toEqual({
      ok: false,
      error:
        'Belles Demeures interdit la lecture automatique de ses annonces : ACM ne peut pas la reprendre. Saisissez le bien à la main ci-dessous.',
    });
    expect(state.asked).toBe(0);
    expect(server.calls).toEqual([]);
  });

  it('jamais « semble supprimée », extension ou non', async () => {
    const server = serverSays(failure(FETCH_MESSAGES.unavailable, 'unavailable'));
    for (const extensionAvailable of [true, false]) {
      const result = await importListingFromUrl({
        url: BELLES_DEMEURES,
        extensionAvailable,
        importUrlAction: server.action,
        importHtmlAction: server.action,
      });
      expect(result.ok).toBe(false);
      expect(result.ok ? '' : result.error).not.toContain('supprimée');
    }
  });
});

describe('l’extension ne répond pas : jamais « L’annonce semble supprimée »', () => {
  for (const reason of ['unavailable', 'refused', 'network', 'timeout', 'empty']) {
    it(`extension absente : le serveur échoue (${reason}), l’écran dit l’extension`, async () => {
      const server = serverSays(failure(FETCH_MESSAGES.unavailable, reason));
      const result = await importListingFromUrl({
        url: SELOGER,
        extensionAvailable: false,
        importUrlAction: server.action,
        importHtmlAction: server.action,
      });
      expect(result).toEqual({ ok: false, error: EXTENSION_UNREAD_MESSAGE });
      expect(server.calls).toHaveLength(1);
    });
  }

  it('extension présente, la page ne lui répond pas : le serveur essaie, l’écran dit l’extension', async () => {
    const server = serverSays(failure(FETCH_MESSAGES.unavailable, 'unavailable'));
    const result = await importListingFromUrl({
      url: SELOGER,
      extensionAvailable: true,
      importUrlAction: server.action,
      importHtmlAction: server.action,
    });
    expect(result).toEqual({ ok: false, error: EXTENSION_UNREAD_MESSAGE });
    expect(state.asked).toBe(2);
  });

  it('l’extension ne répond même pas pour le robots.txt : pas « ce portail refuse cette adresse »', async () => {
    state.robots = { ok: false, unreachable: true };
    const server = serverSays(failure(FETCH_MESSAGES.unavailable, 'unavailable'));
    const result = await importListingFromUrl({
      url: SELOGER,
      extensionAvailable: true,
      importUrlAction: server.action,
      importHtmlAction: server.action,
    });
    expect(result).toEqual({ ok: false, error: EXTENSION_UNREAD_MESSAGE });
    expect(server.calls).toHaveLength(1);
  });

  it('le serveur, lui, la lit : l’import réussit comme avant', async () => {
    const read = { ok: true, data: {}, foundFields: ['price'], missingFields: [] };
    const server = serverSays(read as unknown as ComparableImportResult);
    const result = await importListingFromUrl({
      url: SELOGER,
      extensionAvailable: false,
      importUrlAction: server.action,
      importHtmlAction: server.action,
    });
    expect(result).toBe(read);
  });
});

describe('ce qui ne change pas', () => {
  it('un portail qui interdit cette adresse le dit toujours, par l’extension comme par le serveur', async () => {
    state.robots = { ok: true, status: 200, text: 'User-agent: *\nDisallow: /annonce/' };
    const server = serverSays(failure(FETCH_MESSAGES.robots, 'robots'));
    const byExtension = await importListingFromUrl({
      url: SELOGER,
      extensionAvailable: true,
      importUrlAction: server.action,
      importHtmlAction: server.action,
    });
    expect(byExtension).toEqual({ ok: false, error: ROBOTS_BLOCKED_MESSAGE });
    const byServer = await importListingFromUrl({
      url: SELOGER,
      extensionAvailable: false,
      importUrlAction: server.action,
      importHtmlAction: server.action,
    });
    expect(byServer).toEqual(failure(FETCH_MESSAGES.robots, 'robots'));
  });

  it('une adresse qui n’est pas celle d’une annonce garde son message', async () => {
    const server = serverSays(failure(FETCH_MESSAGES.invalid, 'invalid'));
    const result = await importListingFromUrl({
      url: SELOGER,
      extensionAvailable: false,
      importUrlAction: server.action,
      importHtmlAction: server.action,
    });
    expect(result).toEqual(failure(FETCH_MESSAGES.invalid, 'invalid'));
  });

  it('un site que l’extension ne lit pas (le site d’une agence) : elle n’est pas sollicitée, le serveur répond', async () => {
    const server = serverSays(failure(FETCH_MESSAGES.unavailable, 'unavailable'));
    const result = await importListingFromUrl({
      url: AGENCY_SITE,
      extensionAvailable: true,
      importUrlAction: server.action,
      importHtmlAction: server.action,
    });
    expect(state.asked).toBe(0);
    expect(server.calls).toHaveLength(1);
    // Le serveur a lu ce site lui-même : sa réponse vaut.
    expect(result).toEqual(failure(FETCH_MESSAGES.unavailable, 'unavailable'));
  });
});
