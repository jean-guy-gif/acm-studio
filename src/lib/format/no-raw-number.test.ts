import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { describe, expect, it } from 'vitest';

// Mission 74 — garde-fou volontairement simple : aucun `toFixed(` ni `toLocaleString(` dans src/
// hors de src/lib/format (tests exclus). Un nombre s'affiche par le formateur, ou pas du tout.
// Mission 143 — ni `toLocaleDateString(` : une date aussi (relative côté conseiller, absolue côté
// client, toujours à l'heure de Paris).

const SRC = join(process.cwd(), 'src');
const ALLOWED = join('lib', 'format') + sep;
const FORBIDDEN = /\b(toFixed|toLocaleString|toLocaleDateString)\(/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '__fixtures__' ? [] : sourceFiles(path);
    }
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

describe('nombres affichés', () => {
  it('passent tous par src/lib/format', () => {
    const offenders = sourceFiles(SRC)
      .filter((path) => !relative(SRC, path).startsWith(ALLOWED))
      .flatMap((path) =>
        readFileSync(path, 'utf8')
          .split('\n')
          .map((line, index) =>
            FORBIDDEN.test(line) ? `${relative(SRC, path)}:${index + 1}` : null,
          )
          .filter((hit): hit is string => hit !== null),
      );
    expect(offenders).toEqual([]);
  });
});
