import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

import { neighbourhoodLink } from '@/features/neighbourhood-link/services/neighbourhood-link';
import { CLIENT_TEXTS } from '@/lib/client-texts';

// Mission 147 (partie A) — les liens vers Academia (le dossier d'adresse, « Vivre ici », les ventes
// réelles) sont pour le conseiller seul : rien dans le Live, ni dans les documents remis au vendeur
// (synthèse, Point marché, Étude de marché). Côté acquéreur, seul le lien client « Vivre ici »
// collé sur le mandat passe, par le lien du dossier (liste d'autorisation, `build-buyer-dossier`) et
// par « Confirmer la visite » ; jamais l'adresse du bien, jamais la présentation plein cadre ni le
// PDF du dossier.
// Mission 157 B — côté vendeur, une seule porte, ouverte au seul lien client « Vivre ici » du bien :
// `features/neighbourhood-link`, qui ne laisse passer que le lien relu et sa date de validité. Le
// Live et les documents ne la nomment pas : le mot reste refusé partout ailleurs, et le nom du
// service n'est jamais dit au vendeur (Jean-Guy, 17/11).
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

describe('le lien « Vivre ici » montré au vendeur : une seule porte, le lien client', () => {
  const seller = () => SELLER_SIDE.flatMap((dir) => files(join(SRC, dir)));

  it('le côté vendeur ne lit le lien que par features/neighbourhood-link, et rien d’autre de lui', () => {
    const allowed = new Set([
      'NeighbourhoodLink',
      'NeighbourhoodDocumentLink',
      'NeighbourhoodLinkBlock',
      'readNeighbourhoodLink',
      'readNeighbourhoodDocumentLink',
      // Mission 159 — la porte s'ouvre aussi au quartier montré au vendeur : l'instantané des
      // blocs cochés, relu dans notre table (jamais Academia elle-même), ses dessins et ses mots.
      'NEIGHBOURHOOD_BLOCK_KEYS',
      'NeighbourhoodBlockKey',
      'NeighbourhoodBlocks',
      'readNeighbourhoodSnapshot',
      'neighbourhoodKeys',
      'neighbourhoodView',
      'NeighbourhoodDocumentBlocks',
      'NeighbourhoodDocumentContent',
      'BuiltPeriod',
      'DistanceRings',
      'Pictograms',
      'SalesTimeline',
      'SegmentGauge',
      // Mission 163 A — l'Étude en fil conducteur lit les mêmes blocs de l'instantané : s'ils sont
      // montrables, les catégories de l'urbanisme, l'année de début des ventes et leur type.
      'isShowableBlock',
      'PLANNING_CATEGORIES',
      'SALES_COUNTED_SINCE',
      'NeighbourhoodSale',
    ]);
    const imported: string[] = [];
    for (const path of seller()) {
      const source = readFileSync(path, 'utf8');
      for (const match of source.matchAll(
        /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+'@\/features\/neighbourhood-link\/[^']+'/g,
      )) {
        imported.push(
          ...match[1]
            .split(',')
            .map((name) => name.replace(/^\s*type\s+/, '').trim())
            .filter(Boolean),
        );
      }
      // Jamais la demande ni ses colonnes : seulement le lien relu par la porte.
      expect(source, relative(SRC, path)).not.toMatch(/project_academia_requests|living_here_url/);
    }
    expect(imported.length).toBeGreaterThan(0);
    expect(imported.filter((name) => !allowed.has(name))).toEqual([]);
  });

  it('la porte ne laisse passer que le lien client et sa date, pièges compris', () => {
    const now = new Date('2026-11-17T10:00:00Z');
    const request = {
      property_address: '4 chemin des Restanques Hautes, 06140 Vence',
      link_url: 'https://app.myacademia.ai/l/Vb4nT8wLp2',
      link_expires_at: '2026-12-16T10:00:00Z',
      academia_id: 'dos_8f2c1a9e',
      address_sent: '4 chemin des Restanques Hautes, 06140 Vence',
    };
    const link = neighbourhoodLink({
      url: request.link_url,
      request,
      propertyAddress: request.property_address,
      now,
    });
    expect(link).toEqual({ url: request.link_url, validUntil: request.link_expires_at });
    expect(Object.keys(link ?? {}).sort()).toEqual(['url', 'validUntil']);
    for (const url of [
      'https://app.myacademia.ai/dossiers/dos_8f2c1a9e',
      'https://app.myacademia.ai/l/abc?adresse=4%20chemin',
      'https://exemple.fr/l/abc',
    ]) {
      expect(
        neighbourhoodLink({
          url,
          request: null,
          propertyAddress: null,
          pastedAt: '2026-11-16T10:00:00Z',
          pastedProperty: null,
          now,
        }),
      ).toBeNull();
    }
  });

  it('les mots montrés au vendeur ne nomment pas le service', () => {
    for (const texts of Object.values(CLIENT_TEXTS)) {
      const n = texts.neighbourhood;
      const words = [n.title, n.subtitle, n.heading, n.open, n.scan('…'), n.validUntil('…')];
      for (const word of words) expect(word).not.toMatch(ACADEMIA);
    }
  });
});
