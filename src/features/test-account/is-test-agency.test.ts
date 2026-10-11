import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

import { isTestAgency } from '@/features/test-account/is-test-agency';

describe('isTestAgency', () => {
  it('reconnaît l’agence de l’e2e à son début de nom', () => {
    expect(isTestAgency('TEST AUTOMATIQUE — ne pas utiliser — agence au nom très long')).toBe(true);
    expect(isTestAgency('  test automatique 2  ')).toBe(true);
  });

  it('ne dit rien des autres agences', () => {
    expect(isTestAgency('ACM Studio Pilote')).toBe(false);
    expect(isTestAgency('Agence du Test Automatique')).toBe(false);
    expect(isTestAgency('')).toBe(false);
    expect(isTestAgency(null)).toBe(false);
  });
});

describe('le bandeau de test', () => {
  const SRC = join(process.cwd(), 'src');
  const files = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        return files(path);
      }
      return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
    });
  const users = (dirs: string[]): string[] =>
    dirs
      .flatMap((dir) => files(join(SRC, dir)))
      .filter((path) => /test-account/.test(readFileSync(path, 'utf8')))
      .map((path) => relative(SRC, path));

  it('n’est monté nulle part dans ce que voit le vendeur', () => {
    expect(
      users([
        join('features', 'live-seller'),
        join('features', 'live-presentation'),
        join('features', 'seller-presentation'),
        join('app', '(stage)'),
      ]),
    ).toEqual([]);
  });

  it('est monté dans l’espace conseiller et sur les écrans d’impression', () => {
    expect(users([join('app', '(protected)')])).toEqual([join('app', '(protected)', 'layout.tsx')]);
    expect(users([join('app', '(print)')])).toEqual([join('app', '(print)', 'layout.tsx')]);
  });

  it('ne s’imprime jamais', () => {
    const banner = readFileSync(
      join(SRC, 'features', 'test-account', 'test-account-banner.tsx'),
      'utf8',
    );
    expect(banner).toContain('print:hidden');
  });
});
