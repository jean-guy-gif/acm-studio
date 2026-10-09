import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  DEMO_AT,
  demoAnsweredResponses,
  demoAnsweredSummary,
  demoComparables,
  demoProject,
  demoProperty,
  demoSavedPositioning,
} from '@/app/design-preview/demo-data';
import { projectLiveForSeller } from '@/features/live-seller/services/project-live-for-seller';
import { buildSellerPresentation } from '@/features/seller-presentation/services/build-seller-presentation';

// Mission 75, critère 4 — l'adresse d'un concurrent n'arrive JAMAIS côté vendeur : ni dans le
// Live, ni dans la présentation, ni dans aucune page montrée au client.

// Des valeurs reconnaissables, posées sur chaque concurrent comme le Localisateur les écrirait.
const SENTINELS = {
  locator_address: 'ADRESSE-SECRETE 12 avenue des Mimosas',
  locator_label: 'ETIQUETTE-SECRETE',
  locator_label_key: 'confirmee',
  locator_source: 'SOURCE-SECRETE',
  locator_state: 'pret',
  locator_confirmed: true,
  locator_property_id: 'BIEN-SECRET-42',
  locator_latitude: 43.123456,
  locator_longitude: 7.654321,
  locator_analyzed_at: '2026-10-08T09:30:00.000Z',
};
const LEAKS = [
  'ADRESSE-SECRETE',
  'ETIQUETTE-SECRETE',
  'SOURCE-SECRETE',
  'BIEN-SECRET-42',
  '43.123456',
  '7.654321',
  'locator',
];

function buildPresentation(answered: boolean) {
  return buildSellerPresentation({
    project: demoProject,
    property: demoProperty,
    diagnostics: null,
    condominium: null,
    comparables: demoComparables.map((competitor) => ({ ...competitor, ...SENTINELS })),
    savedPositioning: demoSavedPositioning,
    sellerResponses: answered ? demoAnsweredResponses : [],
    sellerSummary: answered ? demoAnsweredSummary : null,
    generatedAt: DEMO_AT,
    propertyPhotoUrls: [],
  });
}

describe('l’adresse d’un concurrent ne passe jamais côté vendeur', () => {
  it.each([false, true])('présentation et Live (réponses du vendeur : %s)', (answered) => {
    const presentation = buildPresentation(answered);
    expect(presentation.live).not.toBeNull();
    const payload = JSON.stringify(presentation);
    for (const leak of LEAKS) {
      expect(payload).not.toContain(leak);
    }
  });

  it('charge projetée pour le vendeur', () => {
    const live = buildPresentation(true).live;
    if (!live) throw new Error('fixture sans live');
    const payload = JSON.stringify(projectLiveForSeller(live));
    for (const leak of LEAKS) {
      expect(payload).not.toContain(leak);
    }
  });

  it('aucun code montré au vendeur ne lit ces colonnes ni n’importe la brique', () => {
    const SRC = join(process.cwd(), 'src');
    const SELLER_SIDE = [
      join('features', 'live-seller'),
      join('features', 'live-presentation'),
      join('features', 'seller-presentation'),
      join('app', '(stage)'),
      join('app', '(protected)', 'live'),
      join('app', '(protected)', 'builder', '[projectId]', 'presentation'),
    ];
    const files = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) {
          return files(path);
        }
        return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
      });
    const offenders = SELLER_SIDE.flatMap((dir) => files(join(SRC, dir)))
      .filter((path) => /locator_|competitor-locator/.test(readFileSync(path, 'utf8')))
      .map((path) => relative(SRC, path));
    expect(offenders).toEqual([]);
  });
});
