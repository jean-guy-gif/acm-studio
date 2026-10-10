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
  // Mission 86 — où en est la prospection de ce concurrent : affaire de l'agence, pas du vendeur.
  prospecting_handed_at: '2031-01-02T03:04:05.000Z',
  prospecting_meeting_at: '2031-01-03T03:04:05.000Z',
  prospecting_mandate_at: '2031-01-04T03:04:05.000Z',
  prospecting_declined_at: null,
};
const LEAKS = [
  'ADRESSE-SECRETE',
  'ETIQUETTE-SECRETE',
  'SOURCE-SECRETE',
  'BIEN-SECRET-42',
  '43.123456',
  '7.654321',
  'locator',
  'prospecting',
  '2031-01-0',
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
      .filter((path) =>
        /locator_|competitor-locator|prospecting-file|prospecting_|features\/prospecting|\/prospection/.test(
          readFileSync(path, 'utf8'),
        ),
      )
      .map((path) => relative(SRC, path));
    expect(offenders).toEqual([]);
  });

  // Mission 86 — la page Prospection et sa tournée imprimable montrent les adresses : elles
  // vivent dans l'espace conseiller, jamais sous un dossier montré au vendeur, et aucune n'est
  // publique.
  it('la page Prospection reste un écran conseiller', async () => {
    const { isPublicPath } = await import('@/lib/supabase/public-paths');
    expect(isPublicPath('/prospection')).toBe(false);
    expect(isPublicPath('/prospection/tournee')).toBe(false);

    const APP = join(process.cwd(), 'src', 'app');
    const routes = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory()
          ? [relative(APP, join(dir, entry.name)), ...routes(join(dir, entry.name))]
          : [],
      );
    const prospection = routes(APP).filter((route) => /(^|\/)prospection(\/|$)/.test(route));
    expect(prospection.sort()).toEqual([
      join('(print)', 'builder', '[projectId]', 'prospection'),
      join('(print)', 'builder', '[projectId]', 'prospection', '[comparableId]'),
      join('(print)', 'prospection'),
      join('(print)', 'prospection', 'tournee'),
      join('(protected)', 'prospection'),
    ]);
  });
});
