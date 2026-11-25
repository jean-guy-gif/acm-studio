import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  ESSAI_HOST,
  linkedProjectRef,
  MALFORMED_REF,
  MISSING_REF,
  NOT_ESSAI_URL,
  PRODUCTION_REF,
  readTestEnv,
  testDatabaseTarget,
  testsBaseUrl,
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

describe('l’adresse où se jouent les specs', () => {
  it('avant la séparation : toute adresse, comme avant', () => {
    const preview = 'https://acm-studio-abc123-jean-guy-s-projects.vercel.app';
    expect(testsBaseUrl(preview, { separateRequired: false })).toBe(preview);
  });

  it('une fois la base séparée : l’essai seulement, jamais la prévisualisation d’une autre branche', () => {
    const essai = `https://${ESSAI_HOST}`;
    expect(testsBaseUrl(essai, { separateRequired: true })).toBe(essai);
    for (const url of [
      'https://acm-studio-abc123-jean-guy-s-projects.vercel.app',
      'https://acm-studio-henna.vercel.app',
      `https://${ESSAI_HOST}.exemple.fr`,
      'http://localhost:3000',
      'pas une adresse',
      '',
    ]) {
      expect(() => testsBaseUrl(url, { separateRequired: true }), url).toThrow(NOT_ESSAI_URL);
    }
  });
});

// Relecture du 25/11 — ce module est aussi lu par Playwright, qui le compile en CommonJS : avec un
// `import.meta` ou une attente au premier niveau, plus aucune spec ne se chargeait (« 0 tests »),
// et les barrières ne le voyaient pas.
describe('la suite e2e se charge', () => {
  it('le module partagé avec les specs reste lisible par Playwright', () => {
    const source = readFileSync(join(process.cwd(), 'scripts', 'base-des-tests.mjs'), 'utf8')
      .split('\n')
      .filter((line) => !line.trimStart().startsWith('//'))
      .join('\n');
    expect(source).not.toContain('import.meta');
    expect(source).not.toMatch(/^await\s/m);
  });

  it('Playwright liste les specs, sans en jouer aucune', () => {
    const listed = spawnSync('npx', ['playwright', 'test', '--list'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        E2E_BASE_URL: process.env.E2E_BASE_URL ?? `https://${ESSAI_HOST}`,
      },
    });
    const total = /Total: (\d+) tests? in (\d+) files?/.exec(listed.stdout ?? '');
    expect(total, `${listed.stdout}\n${listed.stderr}`.slice(-600)).not.toBeNull();
    expect(Number(total?.[1])).toBeGreaterThan(30);
    expect(Number(total?.[2])).toBeGreaterThan(20);
  }, 120_000);
});
