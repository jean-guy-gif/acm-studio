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

// Mission 83, critère 6 — « Vendu par » et « Exclusivité » n'arrivent JAMAIS côté vendeur : ni
// dans le Live, ni dans la présentation (comme les adresses, mission 75).

// Des valeurs reconnaissables : les vraies (« agency », « yes ») sont trop courantes pour être
// cherchées dans une charge.
const SENTINELS = {
  sold_by: 'VENDEUR-SECRET',
  sold_by_source: 'PROVENANCE-VENDEUR-SECRETE',
  exclusivity: 'EXCLUSIVITE-SECRETE',
  exclusivity_source: 'PROVENANCE-EXCLUSIVITE-SECRETE',
};
const LEAKS = [...Object.values(SENTINELS), 'sold_by', 'exclusivity'];

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

describe('vendeur et exclusivité d’un concurrent ne passent jamais côté vendeur', () => {
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
      .filter((path) =>
        /sold_by|soldBy|exclusivity|competitor-mandate|read-listing-mandate/.test(
          readFileSync(path, 'utf8'),
        ),
      )
      .map((path) => relative(SRC, path));
    expect(offenders).toEqual([]);
  });
});
