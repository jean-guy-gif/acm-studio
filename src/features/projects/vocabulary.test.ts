import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

import { competitorFacts } from '@/features/prospecting/services/competitor-facts';
import { propertyLabel } from '@/features/projects/services/property-label';
import { propertyTypeDisplay } from '@/features/subject-property/services/property-type-display';

// Mission 97 — un seul mot par notion, sur le modèle du test de vocabulaire du Live (M89, M92).
// Le lexique : « fourchette » (celle du conseiller), « décision de prix », « concurrents
// retenus », « concurrents » — jamais « comparables », « cran » ni « palier » à l'écran —, et un
// type de bien toujours en français. Le Suivi et la conclusion sont hors périmètre.
const SRC = join(process.cwd(), 'src');
const OUT_OF_SCOPE = [
  join('features', 'meeting-conclusion'),
  join('app', '(protected)', 'suivi'),
  join('app', '(protected)', 'builder', '[projectId]', 'conclusion'),
  'test-fixtures',
];

const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '__fixtures__' ? [] : files(path);
    }
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });

// Ce qui peut s'afficher : le code sans ses commentaires.
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
  .filter((path) => !OUT_OF_SCOPE.some((dir) => path.startsWith(dir)));

const offenders = (pattern: RegExp): string[] =>
  SCREENS.filter((path) => pattern.test(shown(join(SRC, path))));

describe('un seul mot par notion (mission 97)', () => {
  it('le périmètre couvre bien les écrans de préparation', () => {
    expect(SCREENS.length).toBeGreaterThan(200);
    expect(SCREENS).toContain(
      join('features', 'competitor-search', 'services', 'stream-estate-summary.ts'),
    );
  });

  it('ni « cran » ni « palier » : la recherche s’« élargit »', () => {
    // Le code est en anglais : un « cran » hors commentaire est un mot d'écran.
    expect(offenders(/(?<!\p{L})(crans?|paliers?)(?!\p{L})/iu)).toEqual([]);
  });

  it('« tranche » ne désigne jamais la fourchette', () => {
    expect(offenders(/tranches? de prix|votre tranche/i)).toEqual([]);
  });

  it('« comparables » ne sert plus de nom pour les concurrents', () => {
    expect(
      offenders(
        /\b(\d+|les|des|aux|vos|ces|trois|aucun|chaque) comparables?\b|\bcomparables? (retenus?|proposés?|écartés?|utilisés?|influents?)\b/i,
      ),
    ).toEqual([]);
  });

  it('ceux qui passeront au Live sont des « concurrents retenus », pas des « biens retenus »', () => {
    expect(offenders(/\bbiens? (retenus?|écartés?)\b/i)).toEqual([]);
  });

  it('« Fourchette » ne nomme plus la décision de prix', () => {
    expect(offenders(/Fourchette conseiller|Fourchette non saisie|fourchette validée/)).toEqual([]);
    expect(offenders(/label: 'Fourchette'/)).toEqual([]);
  });

  it('le bloc d’« Avant le rendez-vous » s’appelle « décision de prix », plus « positionnement »', () => {
    expect(
      offenders(
        /décision de positionnement|Le positionnement (prix )?ne peut pas être (enregistré|calculé avec|calculé \()/,
      ),
    ).toEqual([]);
    const page = shown(
      join(SRC, 'app', '(protected)', 'builder', '[projectId]', 'avant-rendez-vous', 'page.tsx'),
    );
    expect(page).toContain('Votre décision de prix');
  });
});

describe('le type de bien se lit en français', () => {
  it('traduit le vocabulaire canonique des sources', () => {
    expect(propertyTypeDisplay('apartment')).toBe('Appartement');
    expect(propertyTypeDisplay('house')).toBe('Maison');
    expect(propertyTypeDisplay('HOUSE')).toBe('Maison');
    expect(propertyTypeDisplay('parking')).toBe('Parking');
  });

  it('garde un texte déjà français, et ne dit rien d’une valeur vide', () => {
    expect(propertyTypeDisplay('Appartement')).toBe('Appartement');
    expect(propertyTypeDisplay('Villa d’architecte')).toBe('Villa d’architecte');
    expect(propertyTypeDisplay('  ')).toBeNull();
    expect(propertyTypeDisplay(null)).toBeNull();
  });

  it('carte de Prospection et libellé du bien : jamais « apartment »', () => {
    const facts = competitorFacts({
      propertyType: 'apartment',
      roomsCount: 3,
      surfaceArea: 61.6,
      price: 339000,
      portal: 'SeLoger',
    } as Parameters<typeof competitorFacts>[0]);
    expect(facts[0]).toBe('Appartement');
    expect(facts.join(' ')).not.toMatch(/apartment|house/);
    const label = propertyLabel({
      propertyType: 'house',
      roomsCount: 5,
      surfaceArea: 140.4,
      city: 'Vence',
    });
    expect(label?.replace(/[  ]/g, ' ')).toBe('Maison · 5 pièces · 140 m² · Vence');
  });
});

describe('les surfaces s’affichent au m² près', () => {
  it('sur la carte de Prospection comme ailleurs', () => {
    const facts = competitorFacts({
      propertyType: null,
      roomsCount: null,
      surfaceArea: 61.6,
      price: null,
      portal: null,
    } as Parameters<typeof competitorFacts>[0]);
    expect(facts.map((fact) => fact.replace(/[  ]/g, ' '))).toEqual(['62 m²']);
  });
});
