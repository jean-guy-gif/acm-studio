import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  fetchLocatorProperties,
  forgetChosenLocator,
  locatorExtensionIds,
  pingLocator,
  readOpen,
  readPing,
  readProperties,
} from '@/features/competitor-locator/client';

describe('readPing', () => {
  it('prêt : installé, bêta en cours, partage allumé', () => {
    expect(readPing({ ok: true, version: '3.1.1', betaTerminee: false, partage: true })).toBe(
      'ready',
    );
  });

  it('partage éteint (le défaut)', () => {
    expect(readPing({ ok: true, version: '3.1.1', betaTerminee: false, partage: false })).toBe(
      'sharing_off',
    );
  });

  it('absent, sans réponse ou bêta terminée : même ligne discrète', () => {
    expect(readPing(null)).toBe('unavailable');
    expect(readPing({ ok: false, error: 'origine refusée' })).toBe('unavailable');
    expect(readPing({ ok: true, betaTerminee: true, partage: true })).toBe('unavailable');
  });
});

describe('readProperties', () => {
  it('rend les biens tels quels, à revalider', () => {
    expect(readProperties({ ok: true, biens: { u: { etat: 'pret' } } })).toEqual({
      ok: true,
      properties: { u: { etat: 'pret' } },
    });
  });

  it('distingue le partage éteint d’une erreur', () => {
    expect(readProperties({ ok: false, partage: false })).toEqual({
      ok: false,
      reason: 'sharing_off',
    });
    expect(readProperties({ ok: false, betaTerminee: true })).toEqual({
      ok: false,
      reason: 'error',
    });
    expect(readProperties(undefined)).toEqual({ ok: false, reason: 'error' });
  });
});

describe('readOpen — « Localiser moi-même »', () => {
  it('plafond de vues atteint : le message renvoyé, tel quel', () => {
    const message = 'Plafond de vues 3D atteint pour aujourd’hui : reprise demain.';
    expect(readOpen({ ok: false, message })).toEqual({ ok: false, reason: 'refused', message });
  });

  it('un détail interne (`error`) n’est jamais un message pour le conseiller', () => {
    expect(readOpen({ ok: false, error: 'erreur' })).toEqual({
      ok: false,
      reason: 'refused',
      message: null,
    });
  });

  it('partage éteint, et ouverture réussie', () => {
    expect(readOpen({ ok: false, partage: false })).toMatchObject({ reason: 'sharing_off' });
    expect(readOpen({ ok: true })).toEqual({ ok: true });
  });
});

describe('identifiant du Localisateur', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('vient de NEXT_PUBLIC_LOCALISATEUR_ID ; absent ou malformé : pas de Localisateur', async () => {
    vi.stubEnv('NEXT_PUBLIC_LOCALISATEUR_ID', '');
    expect(locatorExtensionIds()).toEqual([]);
    expect(await pingLocator()).toBe('unavailable');
    vi.stubEnv('NEXT_PUBLIC_LOCALISATEUR_ID', 'pas-un-identifiant');
    expect(locatorExtensionIds()).toEqual([]);
    // Une seule valeur, comme avant la mission 106.
    vi.stubEnv('NEXT_PUBLIC_LOCALISATEUR_ID', 'abcdefghijklmnopabcdefghijklmnop');
    expect(locatorExtensionIds()).toEqual(['abcdefghijklmnopabcdefghijklmnop']);
  });

  // Mission 106 — une liste : le Store d'abord, puis le mode développeur.
  it('accepte une liste, ignore un identifiant malformé et les doublons', () => {
    expect(
      locatorExtensionIds(
        ' pppppppppppppppppppppppppppppppp , mal-forme, aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,pppppppppppppppppppppppppppppppp',
      ),
    ).toEqual(['pppppppppppppppppppppppppppppppp', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa']);
  });

  it('n’est écrit en dur nulle part dans src/', () => {
    // Un identifiant d'extension Chrome : 32 lettres de a à p.
    const EXTENSION_ID = /['"`][a-p]{32}['"`]/;
    const files = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) {
          return entry.name === '__fixtures__' ? [] : files(path);
        }
        return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
      });
    const offenders = files(join(process.cwd(), 'src')).filter((path) =>
      EXTENSION_ID.test(readFileSync(path, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });
});

// Mission 106 — ACM parle au Localisateur installé, qu'il vienne du Store ou du mode développeur.
describe('plusieurs Localisateurs possibles', () => {
  const STORE = 'pppppppppppppppppppppppppppppppp';
  const DEV = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const sent: { id: string; type: unknown }[] = [];

  // Chrome factice : seuls les identifiants « installés » répondent ; les autres renseignent
  // `lastError`, comme une extension absente.
  function installed(...ids: string[]) {
    const runtime: { lastError?: unknown; sendMessage: unknown } = {
      sendMessage: (id: string, message: { type: unknown }, callback: (r: unknown) => void) => {
        sent.push({ id, type: message.type });
        if (ids.includes(id)) {
          runtime.lastError = undefined;
          callback(
            message.type === 'ACM_PING' ? { ok: true, partage: true } : { ok: true, biens: {} },
          );
        } else {
          runtime.lastError = { message: 'Could not establish connection' };
          callback(undefined);
        }
      },
    };
    vi.stubGlobal('chrome', { runtime });
  }

  beforeEach(() => {
    sent.length = 0;
    forgetChosenLocator();
    vi.stubEnv('NEXT_PUBLIC_LOCALISATEUR_ID', `${STORE},${DEV}`);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('le premier ne répond pas, le second répond : il est gardé pour la suite', async () => {
    installed(DEV);
    expect(await pingLocator()).toBe('ready');
    expect(sent).toEqual([
      { id: STORE, type: 'ACM_PING' },
      { id: DEV, type: 'ACM_PING' },
    ]);
    sent.length = 0;
    expect(await fetchLocatorProperties(['https://www.seloger.com/annonces/1.htm'])).toEqual({
      ok: true,
      properties: {},
    });
    // Le message suivant va au seul Localisateur qui a répondu.
    expect(sent).toEqual([{ id: DEV, type: 'ACM_BIENS_PAR_URL' }]);
  });

  it('le Store répond : c’est lui, le développeur n’est pas interrogé', async () => {
    installed(STORE, DEV);
    expect(await pingLocator()).toBe('ready');
    expect(sent).toEqual([{ id: STORE, type: 'ACM_PING' }]);
  });

  it('aucun ne répond : Localisateur absent, comme avant', async () => {
    installed();
    expect(await pingLocator()).toBe('unavailable');
    expect(await fetchLocatorProperties(['https://www.seloger.com/annonces/1.htm'])).toEqual({
      ok: false,
      reason: 'error',
    });
  });

  it('un Localisateur gardé qui devient muet est oublié, et la liste est reprise', async () => {
    installed(DEV);
    await pingLocator();
    installed(STORE);
    sent.length = 0;
    expect(await pingLocator()).toBe('ready');
    expect(sent).toEqual([
      { id: DEV, type: 'ACM_PING' },
      { id: STORE, type: 'ACM_PING' },
    ]);
  });
});
