import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

// Mission 141 (décision de Jean-Guy, 07/11) — le dossier d'adresse est un écran du conseiller :
// rien dans le Live, ni dans les documents remis au vendeur (synthèse, Point marché, Étude de
// marché), ni dans ce que voit l'acquéreur. Aucun de ces codes n'importe la brique ni ne lit sa table.
const SRC = join(process.cwd(), 'src');

const files = (dir: string): string[] =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) return files(path);
        return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
      })
    : [];

const CLIENT_SIDE = [
  join('features', 'live-seller'),
  join('features', 'seller-presentation'),
  join('features', 'seller-synthesis'),
  join('features', 'market-update'),
  join('features', 'market-study'),
  join('features', 'buyer-deck'),
  join('features', 'buyer-dossier'),
  join('features', 'buyer-presentation'),
  join('app', '(stage)'),
  join('app', '(print)'),
  join('app', 'synthese'),
  join('app', 'point-marche'),
  join('app', 'etude-de-marche'),
  join('app', 'dossier'),
  join('app', 'bon-de-visite'),
  join('app', 'offre'),
];

describe('le dossier d’adresse ne passe jamais côté client', () => {
  it('aucun code montré au vendeur ou à l’acquéreur ne l’importe ni ne lit sa table', () => {
    const scanned = CLIENT_SIDE.flatMap((dir) => files(join(SRC, dir)));
    expect(scanned.length).toBeGreaterThan(50);
    const offenders = scanned
      .filter((path) =>
        /address-dossier|address_dossiers|addressDossier/.test(readFileSync(path, 'utf8')),
      )
      .map((path) => relative(SRC, path));
    expect(offenders).toEqual([]);
  });

  it('dans la démo, aucun appel réseau : le jeu figé, servi par une porte côté serveur', () => {
    const demo = readFileSync(
      join(SRC, 'features', 'demo', 'services', 'demo-address-sources.ts'),
      'utf8',
    );
    expect(demo).not.toMatch(/\bfetch\(|getJson|https?:\/\//);
    const provider = readFileSync(
      join(SRC, 'features', 'address-dossier', 'services', 'sources-provider.ts'),
      'utf8',
    );
    expect(provider).toMatch(/isDemo \? demoAddressSources : liveSources/);
  });
});
