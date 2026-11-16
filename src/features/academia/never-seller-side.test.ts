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

// Mission 156 — une seule page de `(print)` est côté ACQUÉREUR : le dossier acquéreur, dont l'en-tête
// du conseiller (jamais imprimé, `print:hidden`) porte « « Vivre ici » de chaque bien » (planche
// A3-1). Elle n'est pas un document du vendeur ; le document imprimé, lui, reste sans Academia
// (`BuyerDossierDocument`, prouvé par `build-buyer-dossier.test.ts`).
const BUYER_SIDE = [join('app', '(print)', 'acquereurs', '[buyerId]', 'dossier', 'page.tsx')];

describe('Academia ne passe jamais côté vendeur', () => {
  it('aucun code du Live ni des documents du vendeur ne lit Academia', () => {
    const scanned = SELLER_SIDE.flatMap((dir) => files(join(SRC, dir)));
    expect(scanned.length).toBeGreaterThan(50);
    const offenders = scanned
      .filter((path) => ACADEMIA.test(readFileSync(path, 'utf8')))
      .map((path) => relative(SRC, path))
      .filter((path) => !BUYER_SIDE.includes(path));
    expect(offenders).toEqual([]);
  });

  it('la page du dossier acquéreur ne met Academia que dans l’en-tête du conseiller, jamais imprimé', () => {
    const page = readFileSync(join(SRC, BUYER_SIDE[0]), 'utf8');
    expect(page).toMatch(/<header className="[^"]*print:hidden/);
    // Le bloc vit dans cet en-tête, avant le document imprimé.
    const header = page.slice(page.indexOf('<header'), page.indexOf('</header>'));
    expect(header).toContain('<LivingHereChoices');
    // Après l'en-tête, jusqu'à la fin de la page rendue : le document imprimé seul.
    const printed = page.slice(
      page.indexOf('</header>'),
      page.indexOf('</div>', page.indexOf('</header>')),
    );
    expect(printed).toContain('<BuyerDossierDocument');
    expect(printed).not.toMatch(/LivingHere|academia/i);
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
