import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

import { demoComparables, demoProperty } from '@/app/design-preview/demo-data';
import {
  allTexts,
  buildProspectingFile,
} from '@/features/prospecting-file/services/build-prospecting-file';
import {
  OUR_LISTING_SELECT,
  THEIR_LISTING_SELECT,
  buildProspectingFacts,
} from '@/features/prospecting-file/services/prospecting-facts';

// Mission 84, critère 8 — le dossier de prospection SORT de l'agence. Un test par interdit :
//   - seulement les informations publiques de NOTRE annonce : jamais le nom du vendeur, sa
//     valeur perçue, l'analyse ni la fourchette du conseiller ;
//   - jamais les photos du concurrent ;
//   - jamais le nom de son propriétaire, ni ce qu'ACM en sait par ailleurs (titre du portail,
//     description, notes du conseiller, étiquette du Localisateur) ;
//   - rien de tout cela ne passe côté vendeur (M75).

// Notre bien et le concurrent tels que la base les rend, chargés de valeurs reconnaissables
// partout où le dossier n'a rien à lire.
const OUR_ROW = {
  ...demoProperty,
  address: 'ADRESSE-VENDEUR 3 rue Secrète',
  advisor_price_min: 111111,
  advisor_price_max: 999999,
  description: 'DESCRIPTION-VENDEUR',
  strengths: ['POINT-FORT-VENDEUR'],
  watch_points: ['VIGILANCE-VENDEUR'],
  photo_urls: ['agence/dossier/property/PHOTO-VENDEUR.jpg'],
};
const THEIR_ROW = {
  ...demoComparables[0],
  title: 'TITRE-PORTAIL M. Dupont PROPRIETAIRE',
  listing_description: 'DESCRIPTION-CONCURRENT',
  advisor_notes: 'NOTES-CONSEILLER',
  photo_urls: ['https://portail.example/PHOTO-CONCURRENT.jpg'],
  listing_url: 'https://portail.example/ANNONCE-CONCURRENT',
  locator_label: 'ETIQUETTE-LOCALISATEUR',
  locator_property_id: 'BIEN-LOCALISATEUR',
  source: 'SOURCE-CONCURRENT',
};
const LEAKS = [
  'VENDEUR',
  '111111',
  '999999',
  'CONCURRENT',
  'PROPRIETAIRE',
  'Dupont',
  'NOTES-CONSEILLER',
  'LOCALISATEUR',
  'portail.example',
];

function payloads() {
  const facts = buildProspectingFacts({
    ours: OUR_ROW,
    ourPrice: 300000,
    theirs: THEIR_ROW,
    theirAddress: '14 chemin des Oliviers, 06800 Cagnes-sur-Mer',
    distanceMeters: 640,
  });
  return (['owner', 'colleague'] as const).map((version) => {
    const file = buildProspectingFile(facts, version, { showPrices: true });
    return { facts, file, said: allTexts(file, file.defaults).join(' | ') };
  });
}

describe('le dossier de prospection ne sort que ce qui est public', () => {
  it('ni le vendeur, ni la fourchette, ni les photos ou le propriétaire du concurrent', () => {
    for (const { facts, file, said } of payloads()) {
      const payload = `${JSON.stringify(facts)} ${JSON.stringify(file)} ${said}`;
      for (const leak of LEAKS) {
        expect(payload).not.toContain(leak);
      }
    }
  });

  it('notre adresse n’y figure pas : seule celle du bien concurrent, côté propriétaire', () => {
    const [owner, colleague] = payloads();
    expect(owner.said).toContain('14 chemin des Oliviers');
    expect(colleague.said).not.toContain('14 chemin des Oliviers');
  });

  it('les colonnes lues sont une liste d’autorisation', () => {
    expect(OUR_LISTING_SELECT.split(', ')).toEqual([
      'property_type',
      'surface_area',
      'rooms_count',
      'land_area',
      'outdoor_spaces',
      'parking_types',
      'energy_rating',
      'district',
      'city',
    ]);
    expect(THEIR_LISTING_SELECT.split(', ')).toEqual([...OUR_LISTING_SELECT.split(', '), 'price']);
  });

  const SRC = join(process.cwd(), 'src');
  const files = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        return files(path);
      }
      return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
    });
  const offenders = (dirs: string[], pattern: RegExp): string[] =>
    dirs
      .flatMap((dir) => files(join(SRC, dir)))
      .filter((path) => pattern.test(readFileSync(path, 'utf8')))
      .map((path) => relative(SRC, path));

  it('aucun code du dossier ne lit le vendeur, sa valeur perçue, l’analyse ou la fourchette', () => {
    const FILE_SIDE = [
      join('features', 'prospecting-file'),
      join('app', '(print)', 'builder', '[projectId]', 'prospection', '[comparableId]'),
    ];
    expect(
      offenders(
        FILE_SIDE,
        /seller_name|seller_email|seller_phone|perceived|advisor_price|advisor_analysis|advisorAnalysis|frozen_|range_(low|high|central)|market_computed|getProject\b|getConclusion\b|getComparables\b|getSubjectProperty\b|select\('\*'\)|listing_description|advisor_notes|locator_label/,
      ),
    ).toEqual([]);
  });

  it('aucun code montré au vendeur n’importe le dossier de prospection (M75)', () => {
    const SELLER_SIDE = [
      join('features', 'live-seller'),
      join('features', 'live-presentation'),
      join('features', 'seller-presentation'),
      join('app', '(stage)'),
      join('app', '(protected)', 'live'),
      join('app', '(protected)', 'builder', '[projectId]', 'presentation'),
    ];
    expect(offenders(SELLER_SIDE, /prospecting-file|advisor-profile/)).toEqual([]);
  });
});
