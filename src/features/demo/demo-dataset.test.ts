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
import { demoListingUrl, demoSubjectListingUrl } from '@/features/demo/services/demo-urls';

// Mission 114 (A3.8) — le jeu de données est relu par un test : aucune adresse ne correspond à une
// rue réelle des communes (la liste des rues fictives est tenue ICI), aucun nom de vraie agence,
// aucune adresse d'annonce d'un vrai portail, et des chiffres cohérents avec chaque marché.

// Les rues fictives autorisées : la seule liste que le jeu de données a le droit d'utiliser.
const FICTIONAL_STREETS = [
  'allée des Trois Cadrans',
  'chemin des Restanques Hautes',
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

const SOURCE = readFileSync(
  join(process.cwd(), 'src', 'features', 'demo', 'data', 'scenarios.ts'),
  'utf8',
);

describe('le jeu de données de la démonstration (mission 114)', () => {
  it('trois scénarios, 12 à 15 biens chacun, identifiants uniques', () => {
    expect(DEMO_SCENARIOS.map((scenario) => scenario.id)).toEqual(['antibes', 'vence', 'mougins']);
    for (const scenario of DEMO_SCENARIOS) {
      expect(scenario.listings.length).toBeGreaterThanOrEqual(12);
      expect(scenario.listings.length).toBeLessThanOrEqual(15);
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
      ...DEMO_LISTINGS.map((listing) => listing.address.street),
    ];
    for (const street of streets) {
      expect(FICTIONAL_STREETS).toContain(street);
    }
    const source = normalize(SOURCE);
    for (const real of REAL_STREETS) {
      expect(source).not.toContain(normalize(real));
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
      for (const file of scenario.subject.photos) expect(pool.has(file)).toBe(true);
      expect(existsSync(join(process.cwd(), 'public', 'demo', `fiche-${scenario.id}.pdf`))).toBe(
        true,
      );
      for (const listing of scenario.listings) {
        expect(listing.photos.length).toBeGreaterThanOrEqual(2);
        expect(listing.photos.length).toBeLessThanOrEqual(4);
        for (const file of listing.photos) expect(pool.has(file)).toBe(true);
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
        for (const file of photos) expect(own.has(file), `${scenario.id} : ${file}`).toBe(true);
      }
      if (scenario.id === 'mougins') {
        const exteriors = new Set<string>(DEMO_PHOTO_EXTERIORS.villa);
        for (const photos of all) {
          for (const file of photos) expect(exteriors.has(file), `Mougins : ${file}`).toBe(true);
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
        for (const photos of all)
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
