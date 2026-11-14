import { existsSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { DEMO_COMMUNES } from '@/features/demo/data/communes';
import {
  DEMO_AGENCIES,
  DEMO_LISTINGS,
  DEMO_PHOTO_POOLS,
  DEMO_PHOTO_EXTERIORS,
  DEMO_SCENARIOS,
  DEMO_STREETS,
} from '@/features/demo/data/scenarios';
import { DEMO_LISTING_HOST } from '@/features/demo/constants';
import { DEMO_SEED_SUBJECTS } from '@/features/demo/services/demo-seed';
import { demoListingUrl, demoSubjectListingUrl } from '@/features/demo/services/demo-urls';

// Mission 114 (A3.8) — le jeu de données est relu par un test : aucune adresse ne correspond à une
// rue réelle des communes (la liste des rues fictives est tenue ICI), aucun nom de vraie agence,
// aucune adresse d'annonce d'un vrai portail, et des chiffres cohérents avec chaque marché.

// Les rues fictives autorisées : la seule liste que le jeu de données a le droit d'utiliser.
const FICTIONAL_STREETS = [
  'allée des Cistes Blancs',
  'chemin des Restanques Hautes',
  'impasse du Moulin à Huile',
  'rue du Vieux Pressoir',
  'avenue des Collines Douces',
  'traverse des Terrasses Fleuries',
  'montée des Oliviers Bas',
  'boulevard des Palmiers Nains',
  'chemin de la Source Haute',
  'allée des Orangers Amers',
  'rue des Jarres',
  'placette du Lavoir Neuf',
  'sentier des Genêts d’Or',
  'avenue des Tilleuls Hauts',
];

// Mission 147 (partie B) — les anciennes rues en jeux de mots (« allée du Décor »…) disaient le
// décor : aucune ne doit revenir, ni dans le jeu ni dans l'identité légale inventée.
const OLD_PUN_STREETS = [
  'allée des Trois Cadrans',
  'impasse de l’Essai',
  'rue de la Maquette',
  'avenue du Prototype',
  'traverse des Exemples',
  'montée de la Répétition',
  'boulevard du Scénario',
  'chemin des Figurants',
  'allée du Décor',
  'rue du Brouillon',
  'place de la Fiction',
  'sentier de l’Exercice',
  'avenue de l’Entraînement',
];

// Des rues qui existent dans les communes du jeu de données : aucune ne doit y figurer.
const REAL_STREETS = [
  'avenue Robert Soleau',
  'boulevard Wilson',
  'avenue de Cannes',
  'rue de la République',
  'chemin des Sables',
  'avenue du Général Leclerc',
  'route de Grasse',
  'avenue Henri Isnard',
  'avenue Marcellin Maurel',
  'avenue Colonel Meyère',
  'chemin de la Sine',
  'avenue de Tournamy',
  'chemin de Font de Currault',
  'avenue du Maréchal Juin',
  'boulevard Carnot',
  'rue d’Antibes',
];

// Des enseignes réelles : aucune ne doit apparaître, ni comme vendeur ni ailleurs.
const REAL_AGENCIES = [
  'century 21',
  'orpi',
  'laforêt',
  'laforet',
  'foncia',
  'guy hoquet',
  'era immobilier',
  'stéphane plaza',
  'nexity',
  'safti',
  'iad france',
  'capifrance',
  'l’adresse',
  'barnes',
  'engel & völkers',
  'sotheby',
  'john taylor',
  'michaël zingraf',
  'infinity group',
];

const REAL_PORTALS = [
  'seloger',
  'bienici',
  'bien’ici',
  'leboncoin',
  'green-acres',
  'greenacres',
  'lefigaro',
  'maisonsetappartements',
  'pap.fr',
  'logic-immo',
  'paruvendu',
];

// Prix au m² plausibles par scénario (automne 2026), larges : on refuse l'absurde, pas la nuance.
const PRICE_PER_M2: Record<string, { min: number; max: number }> = {
  antibes: { min: 4_000, max: 9_000 },
  vence: { min: 3_500, max: 8_000 },
  mougins: { min: 5_000, max: 12_000 },
};

const normalize = (text: string): string => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Les autres fichiers de données de la démo (identité légale, acquéreurs, plan des dossiers).
const DEMO_DATA_FILES = [
  'src/features/demo/data/demo-legal-identity.ts',
  'src/features/demo/services/demo-buyers.ts',
  'src/features/demo/services/demo-seed.ts',
];
const readDemoFile = (file: string): string => readFileSync(join(process.cwd(), file), 'utf8');

const SOURCE = readFileSync(
  join(process.cwd(), 'src', 'features', 'demo', 'data', 'scenarios.ts'),
  'utf8',
);

// Mission 155 — une photo d'un jeu par bien (« mou-02/01-facade.jpg ») suit les règles de
// demo-photo-sets.test.ts, pas celles des photos partagées par famille.
const inSet = (file: string): boolean => file.includes('/');

describe('le jeu de données de la démonstration (mission 114)', () => {
  it('trois scénarios, 12 à 15 biens chacun, identifiants uniques', () => {
    expect(DEMO_SCENARIOS.map((scenario) => scenario.id)).toEqual(['antibes', 'vence', 'mougins']);
    for (const scenario of DEMO_SCENARIOS) {
      expect(scenario.listings.length).toBeGreaterThanOrEqual(12);
      // Mission 155 — des annonces du marché seulement en plus.
      expect(scenario.listings.length).toBeLessThanOrEqual(18);
      // Partie B — le nom du vendeur devient celui d'un dossier de démo : rien n'y dit « démo ».
      expect(scenario.sellerName).not.toMatch(/d[ée]mo/i);
    }
    const ids = DEMO_LISTINGS.map((listing) => listing.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('rues fictives seulement : la liste du test est celle du code, et aucune rue réelle', () => {
    expect([...DEMO_STREETS]).toEqual(FICTIONAL_STREETS);
    const streets = [
      ...DEMO_SCENARIOS.map((scenario) => scenario.subject.address.street),
      // Mission 155 — le bien de chaque dossier.
      ...Object.values(DEMO_SEED_SUBJECTS).map((subject) => subject.address.street),
      ...DEMO_LISTINGS.map((listing) => listing.address.street),
    ];
    for (const street of streets) {
      expect(FICTIONAL_STREETS).toContain(street);
    }
    const source = normalize(SOURCE);
    for (const real of REAL_STREETS) {
      expect(source).not.toContain(normalize(real));
    }
    for (const data of [SOURCE, ...DEMO_DATA_FILES.map(readDemoFile)]) {
      for (const pun of OLD_PUN_STREETS) {
        expect(normalize(data)).not.toContain(normalize(pun));
      }
      expect(data).not.toContain('Azur Horizon');
    }
  });

  it('téléphones : tous dans la plage 06 39 98, réservée à la fiction (mission 147)', () => {
    for (const file of ['src/features/demo/data/scenarios.ts', ...DEMO_DATA_FILES]) {
      const numbers = readDemoFile(file).match(/(?:\+33\s?|\b0)[1-9](?:[ .]?\d{2}){4}\b/g) ?? [];
      for (const number of numbers) {
        expect(number.replace(/[ .]/g, ''), file).toMatch(/^063998\d{4}$/);
      }
    }
  });

  it('agences fictives seulement, aucune enseigne réelle', () => {
    for (const listing of DEMO_LISTINGS) {
      if (listing.seller.agencyName != null) {
        expect([...DEMO_AGENCIES]).toContain(listing.seller.agencyName);
      }
    }
    const source = normalize(SOURCE);
    for (const real of REAL_AGENCIES) {
      expect(source).not.toContain(normalize(real));
    }
  });

  it('aucune adresse d’annonce d’un vrai portail : toutes sur l’hôte réservé', () => {
    for (const listing of DEMO_LISTINGS) {
      expect(new URL(demoListingUrl(listing)).hostname).toBe(DEMO_LISTING_HOST);
    }
    for (const scenario of DEMO_SCENARIOS) {
      expect(new URL(demoSubjectListingUrl(scenario.id)).hostname).toBe(DEMO_LISTING_HOST);
    }
    const source = normalize(SOURCE);
    for (const portal of REAL_PORTALS) {
      expect(source).not.toContain(normalize(portal));
    }
    expect(source).not.toMatch(/https?:\/\//);
  });

  it('chaque commune est dans la table locale, et les chiffres suivent le marché', () => {
    const codes = new Set(DEMO_COMMUNES.map((commune) => commune.code));
    for (const scenario of DEMO_SCENARIOS) {
      expect(codes.has(scenario.subject.inseeCode)).toBe(true);
      const band = PRICE_PER_M2[scenario.id];
      const subjectPerM2 = scenario.subject.listedPrice / scenario.subject.surfaceArea;
      expect(subjectPerM2).toBeGreaterThanOrEqual(band.min);
      expect(subjectPerM2).toBeLessThanOrEqual(band.max);
      expect(scenario.subject.advisorRange.min).toBeLessThan(scenario.subject.advisorRange.max);
      for (const listing of scenario.listings) {
        expect(codes.has(listing.inseeCode)).toBe(true);
        expect(listing.propertyType).toBe(scenario.subject.propertyType);
        const perM2 = listing.price / listing.surfaceArea;
        expect(perM2).toBeGreaterThanOrEqual(band.min);
        expect(perM2).toBeLessThanOrEqual(band.max);
        expect(listing.publishedDaysAgo).toBeGreaterThan(0);
        for (const change of listing.priceChanges) {
          expect(change.to).toBeLessThan(change.from);
          expect(change.daysAgo).toBeLessThanOrEqual(listing.publishedDaysAgo);
        }
        if (listing.priceAfterMeeting != null) {
          expect(listing.priceAfterMeeting).toBeLessThan(listing.price);
        }
      }
      // Au moins une baisse simulée « après le rendez-vous » par scénario (M105).
      expect(scenario.listings.some((listing) => listing.priceAfterMeeting != null)).toBe(true);
      // Des vendeurs variés : agence en exclusivité, agence en mandat simple, inconnu (M83).
      const sellers = new Set(
        scenario.listings.map((listing) =>
          listing.seller.agencyName == null ? 'unknown' : listing.seller.exclusivity,
        ),
      );
      expect(sellers).toEqual(new Set(['unknown', 'yes', 'no']));
    }
  });

  it('les photos : 3 à 5 pour le bien vendeur, 2 à 4 par concurrent, toutes dans l’application', () => {
    const pool = new Set([
      ...DEMO_PHOTO_POOLS.apartment,
      ...DEMO_PHOTO_POOLS.house,
      ...DEMO_PHOTO_POOLS.villa,
    ]);
    const onDisk = (file: string) =>
      existsSync(join(process.cwd(), 'public', 'demo', 'photos', file));
    for (const file of pool) {
      expect(onDisk(file), file).toBe(true);
    }
    for (const scenario of DEMO_SCENARIOS) {
      expect(scenario.subject.photos.length).toBeGreaterThanOrEqual(3);
      expect(scenario.subject.photos.length).toBeLessThanOrEqual(5);
      for (const file of scenario.subject.photos) expect(pool.has(file) || inSet(file)).toBe(true);
      expect(existsSync(join(process.cwd(), 'public', 'demo', `fiche-${scenario.id}.pdf`))).toBe(
        true,
      );
      for (const listing of scenario.listings) {
        expect(listing.photos.length).toBeGreaterThanOrEqual(2);
        expect(listing.photos.length).toBeLessThanOrEqual(4);
        for (const file of listing.photos) expect(pool.has(file) || inSet(file)).toBe(true);
      }
    }
  });

  // Essai de Jean-Guy (25/10) : chaque scénario n'utilise que des photos de son type de bien ; la
  // villa de Mougins ne montre que des extérieurs de villa ; la photo principale d'une maison n'est
  // jamais un intérieur ni un immeuble.
  it('chaque scénario, les photos de son type de bien ; une maison s’ouvre sur un extérieur', () => {
    const family = { antibes: 'apartment', vence: 'house', mougins: 'villa' } as const;
    for (const scenario of DEMO_SCENARIOS) {
      const own = new Set<string>(DEMO_PHOTO_POOLS[family[scenario.id]]);
      const all = [scenario.subject.photos, ...scenario.listings.map((listing) => listing.photos)];
      for (const photos of all) {
        for (const file of photos.filter((f) => !inSet(f)))
          expect(own.has(file), `${scenario.id} : ${file}`).toBe(true);
      }
      if (scenario.id === 'mougins') {
        const exteriors = new Set<string>(DEMO_PHOTO_EXTERIORS.villa);
        for (const photos of all) {
          for (const file of photos.filter((f) => !inSet(f)))
            expect(exteriors.has(file), `Mougins : ${file}`).toBe(true);
        }
      }
      // Deux colonnes de la grille ne montrent jamais la même miniature : la photo principale d'un
      // concurrent n'est pas celle du bien vendeur (relecture des rendus, 25/10).
      {
        for (const listing of scenario.listings) {
          expect(listing.photos[0], `${scenario.id} ${listing.id}`).not.toBe(
            scenario.subject.photos[0],
          );
        }
      }
      if (scenario.id === 'vence') {
        const exteriors = new Set<string>(DEMO_PHOTO_EXTERIORS.house);
        for (const photos of all.filter((p) => !inSet(p[0]!)))
          expect(exteriors.has(photos[0]!), `Vence : ${photos[0]}`).toBe(true);
      }
    }
  });

  it('docs/DEMO.md liste chaque photo avec sa source et sa licence', () => {
    const doc = readFileSync(join(process.cwd(), 'docs', 'DEMO.md'), 'utf8');
    for (const file of [
      ...DEMO_PHOTO_POOLS.apartment,
      ...DEMO_PHOTO_POOLS.house,
      ...DEMO_PHOTO_POOLS.villa,
    ]) {
      const line = doc.split('\n').find((row) => row.includes(`\`${file}\``));
      expect(line, file).toBeDefined();
      expect(line).toMatch(/CC0|Unsplash|Pexels/);
      expect(line).toMatch(/https?:\/\//);
    }
  });
});
