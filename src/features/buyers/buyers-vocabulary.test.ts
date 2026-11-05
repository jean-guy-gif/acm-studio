import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

// Mission 117 — « Acquéreur » partout dans le nouveau code et à l'écran ; jamais « acheteur »
// (sauf, hors de ce périmètre, le code de M86 qui garde ses noms), jamais « estimation » (M105).
const SRC = join(process.cwd(), 'src');
const SCOPE = [
  join('features', 'buyers'),
  join('app', '(protected)', 'acquereurs'),
  join('app', '(protected)', 'biens-ideaux'),
  join('features', 'demo', 'services', 'demo-buyers.ts'),
  // Mission 118 — les biens idéaux.
  join('features', 'ideal-properties'),
  // Mission 119 — la présentation et les visites.
  join('features', 'buyer-presentation'),
  join('app', '(protected)', 'visites'),
  join('app', '(stage)', 'presentation'),
  // Mission 119 (partie B) — le dossier acquéreur et son lien.
  join('features', 'buyer-dossier'),
  join('app', 'dossier'),
  join('app', '(print)', 'acquereurs'),
];

const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return files(path);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });

const shown = (path: string): string =>
  readFileSync(path, 'utf8')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .map((line) => line.replace(/\s\/\/ .*$/, ''))
    .join('\n');

const SCREENS = files(SRC)
  .map((path) => relative(SRC, path))
  .filter((path) => SCOPE.some((dir) => path === dir || path.startsWith(dir)));

const offenders = (pattern: RegExp): string[] =>
  SCREENS.filter((path) => pattern.test(shown(join(SRC, path))));

describe('le vocabulaire du mode acquéreur (mission 117)', () => {
  it('le périmètre couvre la feature et ses écrans', () => {
    expect(SCREENS.length).toBeGreaterThan(10);
    expect(SCREENS).toContain(join('features', 'buyers', 'components', 'buyer-form.tsx'));
    expect(SCREENS).toContain(join('app', '(protected)', 'acquereurs', '(liste)', 'page.tsx'));
  });

  it('jamais « acheteur »', () => {
    expect(offenders(/acheteu(r|se)s?/i)).toEqual([]);
  });

  it('jamais « estimation »', () => {
    expect(offenders(/estimation/i)).toEqual([]);
  });

  it('une recherche n’est pas une disponibilité : jamais « disponible » dans les biens idéaux (M118)', () => {
    expect(offenders(/disponible/i)).toEqual([]);
    const types = shown(join(SRC, 'features', 'ideal-properties', 'types.ts'));
    for (const label of ['Correspondance forte', 'Bon compromis', 'À explorer']) {
      expect(types).toContain(label);
    }
  });

  it('le rapprochement du Suivi se nomme « Rapprochement acquéreur » et ne dit plus « acheteur » à l’écran', () => {
    const panel = shown(
      join(SRC, 'features', 'meeting-conclusion', 'components', 'buyer-search-panel.tsx'),
    );
    expect(panel).toContain('Rapprochement acquéreur');
    expect(panel).not.toMatch(/acheteur/i);
    expect(panel).toContain('Enregistrer cette recherche');
  });

  it('le menu du mode Acquéreur commence par « Acquéreurs » (M118) et le mode Vendeur ne le porte pas', () => {
    const nav = readFileSync(
      join(SRC, 'features', 'workspace-mode', 'services', 'workspace-mode.ts'),
      'utf8',
    );
    expect(nav).toContain("label: 'Acquéreurs'");
    const seller = nav.slice(nav.indexOf('const SELLER_NAV'), nav.indexOf('const BUYER_NAV'));
    expect(seller).not.toContain('/acquereurs');
  });
});
