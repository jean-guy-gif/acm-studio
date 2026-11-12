import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// Mission 152 (partie 0) — le dossier d'adresse et « Vivre ici » construits par ACM (M141, M142)
// ne sont plus ni lus ni écrits depuis la M147 A. L'étape 1 a retiré le dernier code qui les
// touchait ; l'étape 2 supprime leurs tables, leurs fonctions et leurs colonnes
// (`20261206090000_effacer_m147.sql`), au plus tard le 23/11/2026 (`/confidentialite`). Plus rien
// ne doit les citer, hors des migrations, qui sont l'historique de la base.
const RETIRED = [
  'address_dossiers',
  'living_here_sheets',
  'sector_priorities',
  'living_place',
  'living_place_trip',
  'check_address_dossier',
  'date_living_here_sheet',
];

const repo = join(__dirname, '..', '..');
const SCANNED = [
  'src',
  'scripts',
  'supabase/tests',
  '.github/workflows/sql.yml',
  'docs/PROCEDURE_EFFACEMENT.md',
];
// Ce test, et le test SQL qui prouve qu'ils n'existent plus (`visites.sql`, §4), les nomment.
const IGNORED = new Set(['src/lib/retired-m147-data.test.ts', 'supabase/tests/visites.sql']);

function files(path: string): string[] {
  if (!existsSync(path)) return [];
  if (!statSync(path).isDirectory()) return [path];
  return readdirSync(path).flatMap((name) => files(join(path, name)));
}

describe('les données retirées de la M147', () => {
  it('plus rien ne les cite : code, scripts, tests SQL, CI, procédure d’effacement', () => {
    const scanned = SCANNED.flatMap((entry) => files(join(repo, entry)))
      .filter((path) => /\.(ts|tsx|mjs|js|sql|yml|md)$/.test(path))
      .filter((path) => !IGNORED.has(relative(repo, path)));
    expect(scanned.length).toBeGreaterThan(100);
    const hits = scanned.flatMap((path) => {
      const text = readFileSync(path, 'utf8');
      return RETIRED.filter((name) => new RegExp(`\\b${name}\\b`).test(text)).map(
        (name) => `${relative(repo, path)} : ${name}`,
      );
    });
    expect(hits).toEqual([]);
  });

  it('la migration les supprime tous, sans toucher au jour de la visite', () => {
    const migration = readFileSync(
      join(repo, 'supabase', 'migrations', '20261206090000_effacer_m147.sql'),
      'utf8',
    );
    expect(migration).toContain('drop table public.address_dossiers;');
    expect(migration).toContain('drop table public.living_here_sheets;');
    expect(migration).toContain('drop function public.check_address_dossier();');
    expect(migration).toContain('drop function public.date_living_here_sheet();');
    expect(migration).toContain(
      'alter table public.buyers drop column sector_priorities, drop column living_place;',
    );
    expect(migration).toContain(
      'alter table public.buyer_visit_requests drop column living_place_trip;',
    );
    expect(migration).not.toMatch(/drop column scheduled_at/);
  });

  it('la page de confidentialité dit leur effacement, daté', () => {
    const page = readFileSync(join(repo, 'src', 'app', 'confidentialite', 'page.tsx'), 'utf8');
    expect(page).toContain('seront effacés au plus tard le 23 novembre 2026');
    expect(page).not.toContain('OpenStreetMap');
    expect(page).not.toContain('Le dossier d’adresse, pour le conseiller seul');
    // La phrase prévue pour le jour du lien direct vers Academia attend ce jour-là (M147 A).
    expect(page).not.toContain('adresse de la page ouverte');
  });
});
