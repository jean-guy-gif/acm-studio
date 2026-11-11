import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// Mission 152 (partie 0) — le dossier d'adresse et « Vivre ici » construits par ACM (M141, M142)
// ne sont plus ni lus ni écrits depuis la M147 A : leurs tables et colonnes partent par migration,
// au plus tard le 23/11/2026 (`/confidentialite`). Rien dans le code ne doit plus les toucher, sinon
// la suppression casserait la production : le code part d'abord, la migration ensuite.
const RETIRED = [
  'address_dossiers',
  'living_here_sheets',
  'sector_priorities',
  'living_place',
  'living_place_trip',
];

const root = join(__dirname, '..');
// Les types générés suivent la base : ils perdent ces noms à la régénération qui suit la migration.
const IGNORED = new Set(['lib/supabase/database.types.ts', 'lib/retired-m147-data.test.ts']);

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

describe('les données retirées de la M147', () => {
  it('ne sont plus lues ni écrites par le code', () => {
    const hits = files(root)
      .filter((path) => !IGNORED.has(relative(root, path)))
      .flatMap((path) => {
        const text = readFileSync(path, 'utf8');
        return RETIRED.filter((name) => new RegExp(`\\b${name}\\b`).test(text)).map(
          (name) => `${relative(root, path)} : ${name}`,
        );
      });
    expect(hits).toEqual([]);
  });

  it('la page de confidentialité dit leur effacement, daté', () => {
    const page = readFileSync(join(root, 'app', 'confidentialite', 'page.tsx'), 'utf8');
    expect(page).toContain('seront effacés au plus tard le 23 novembre 2026');
    expect(page).not.toContain('OpenStreetMap');
    expect(page).not.toContain('Le dossier d’adresse, pour le conseiller seul');
  });
});
