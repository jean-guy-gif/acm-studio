import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  locatorExtensionId,
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
    expect(locatorExtensionId()).toBeNull();
    expect(await pingLocator()).toBe('unavailable');
    vi.stubEnv('NEXT_PUBLIC_LOCALISATEUR_ID', 'pas-un-identifiant');
    expect(locatorExtensionId()).toBeNull();
    vi.stubEnv('NEXT_PUBLIC_LOCALISATEUR_ID', 'abcdefghijklmnopabcdefghijklmnop');
    expect(locatorExtensionId()).toBe('abcdefghijklmnopabcdefghijklmnop');
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
