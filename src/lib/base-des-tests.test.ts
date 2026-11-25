import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  linkedProjectRef,
  MALFORMED_REF,
  MISSING_REF,
  PRODUCTION_REF,
  readTestEnv,
  testDatabaseTarget,
} from '../../scripts/base-des-tests.mjs';

// La base d'essai séparée (décision de Jean-Guy du 25/11) : les tests e2e et le nettoyage de
// l'agence de test visent la base d'essai par sa référence, jamais celle de la production.
const PRODUCTION = 'aaaaaaaaaaaaaaaaaaaa';
const ESSAI = 'bbbbbbbbbbbbbbbbbbbb';

describe('la base des tests', () => {
  it('sans référence posée : le projet lié, comme avant la séparation', () => {
    expect(
      testDatabaseTarget({ ref: null, linkedRef: PRODUCTION, separateRequired: false }),
    ).toEqual({ arg: '--remote', separate: false });
    expect(
      testDatabaseTarget({ ref: '  ', linkedRef: PRODUCTION, separateRequired: false }),
    ).toEqual({ arg: '--remote', separate: false });
  });

  it('référence posée : la base d’essai, nommée dans la commande', () => {
    expect(testDatabaseTarget({ ref: ESSAI, linkedRef: PRODUCTION })).toEqual({
      arg: `--remote=${ESSAI}`,
      separate: true,
    });
    expect(testDatabaseTarget({ ref: ` ${ESSAI}\n`, linkedRef: PRODUCTION }).arg).toBe(
      `--remote=${ESSAI}`,
    );
  });

  it('jamais la base de la production, même posée par erreur', () => {
    expect(() => testDatabaseTarget({ ref: PRODUCTION, linkedRef: PRODUCTION })).toThrow(
      PRODUCTION_REF,
    );
  });

  it('une référence qui n’en est pas une est refusée : ni adresse, ni option glissée', () => {
    for (const ref of [
      'https://bbbbbbbbbbbbbbbbbbbb.supabase.co',
      'bbbbbbbbbbbbbbbbbbb',
      'BBBBBBBBBBBBBBBBBBBB',
      'bbbbbbbbbb bbbbbbbbb',
      '--yes',
    ]) {
      expect(() => testDatabaseTarget({ ref, linkedRef: PRODUCTION }), ref).toThrow(MALFORMED_REF);
    }
  });

  it('une fois la séparation faite, une référence absente arrête les tests', () => {
    expect(() =>
      testDatabaseTarget({ ref: null, linkedRef: PRODUCTION, separateRequired: true }),
    ).toThrow(MISSING_REF);
  });

  it('hors d’un poste lié (la CI), la référence posée vaut quand même', () => {
    expect(testDatabaseTarget({ ref: ESSAI, linkedRef: null }).arg).toBe(`--remote=${ESSAI}`);
  });
});

describe('les lectures du poste', () => {
  const dir = mkdtempSync(join(tmpdir(), 'base-des-tests-'));

  it('une variable se lit dans .env.e2e.local, guillemets ôtés ; absente, rien', () => {
    const file = join(dir, '.env.e2e.local');
    writeFileSync(file, `E2E_EMAIL=a@example.com\n  E2E_SUPABASE_REF = "${ESSAI}"\n`);
    delete process.env.E2E_SUPABASE_REF;
    expect(readTestEnv('E2E_SUPABASE_REF', file)).toBe(ESSAI);
    expect(readTestEnv('E2E_AUTRE', file)).toBeNull();
    expect(readTestEnv('E2E_SUPABASE_REF', join(dir, 'absent'))).toBeNull();
  });

  it('le projet lié se lit dans supabase/.temp/project-ref ; sans fichier, rien', () => {
    const file = join(dir, 'project-ref');
    writeFileSync(file, `${PRODUCTION}\n`);
    expect(linkedProjectRef(file)).toBe(PRODUCTION);
    expect(linkedProjectRef(join(dir, 'absent'))).toBeNull();
  });
});
