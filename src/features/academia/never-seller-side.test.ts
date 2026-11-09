import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

// Mission 147 (partie A) — les liens vers Academia (le dossier d'adresse, « Vivre ici », les ventes
// réelles) sont pour le conseiller seul : rien dans le Live, ni dans les documents remis au vendeur
// (synthèse, Point marché, Étude de marché). Côté acquéreur, seul le lien client « Vivre ici »
// collé sur le mandat passe, par le lien du dossier (liste d'autorisation, `build-buyer-dossier`) et
// par « Confirmer la visite » ; jamais l'adresse du bien, jamais la présentation plein cadre ni le
// PDF du dossier.
const SRC = join(process.cwd(), 'src');

const files = (dir: string): string[] =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) return files(path);
        return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
      })
    : [];

const SELLER_SIDE = [
  join('features', 'live-seller'),
  join('features', 'meeting-conclusion'),
  join('features', 'seller-presentation'),
  join('features', 'seller-synthesis'),
  join('features', 'market-update'),
  join('features', 'market-study'),
  join('features', 'buyer-deck'),
  join('app', '(stage)'),
  join('app', '(print)'),
  join('app', 'synthese'),
  join('app', 'point-marche'),
  join('app', 'etude-de-marche'),
  join('app', 'bon-de-visite'),
  join('app', 'offre'),
];

const ACADEMIA = /academia|Academia/;

describe('Academia ne passe jamais côté vendeur', () => {
  it('aucun code du Live ni des documents du vendeur ne lit Academia', () => {
    const scanned = SELLER_SIDE.flatMap((dir) => files(join(SRC, dir)));
    expect(scanned.length).toBeGreaterThan(50);
    const offenders = scanned
      .filter((path) => ACADEMIA.test(readFileSync(path, 'utf8')))
      .map((path) => relative(SRC, path));
    expect(offenders).toEqual([]);
  });

  it('côté acquéreur, le seul lien collé, jamais dans le PDF du dossier', () => {
    const dossierFiles = files(join(SRC, 'features', 'buyer-dossier'));
    const pdf = dossierFiles.filter((path) => /buyer-dossier-document/.test(path));
    expect(pdf.length).toBeGreaterThan(0);
    for (const path of pdf) expect(readFileSync(path, 'utf8')).not.toMatch(ACADEMIA);
    // Ni l'adresse du bien, ni les liens qui l'ouvrent : seulement le lien client relu.
    for (const path of dossierFiles) {
      const source = readFileSync(path, 'utf8');
      expect(source, relative(SRC, path)).not.toMatch(/academiaLinkView|propertyAddressLine/);
    }
  });
});
