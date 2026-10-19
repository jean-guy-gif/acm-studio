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
} from '@/test-fixtures/demo-data';
import {
  authorizeAdvisorRange,
  authorizeComparableReveal,
  projectLiveForSeller,
} from '@/features/live-seller/services/project-live-for-seller';
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
      join('features', 'seller-presentation'),
      join('app', '(stage)'),
      join('app', '(protected)', 'live'),
      join('app', '(protected)', 'builder', '[projectId]', 'presentation'),
      // Mission 110 — la synthèse laissée au vendeur, et sa page publique.
      join('features', 'seller-synthesis'),
      join('app', 'synthese'),
      join('app', '(print)', 'builder', '[projectId]', 'synthese'),
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
    // Mission 98 — les courriers imprimés d'un bien vendeur portent les adresses des concurrents.
    expect(isPublicPath('/prospection/courriers')).toBe(false);

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
      join('(print)', 'prospection', 'courriers'),
      join('(print)', 'prospection', 'tournee'),
      join('(protected)', 'prospection'),
    ]);
  });
});

// Mission 107 — ni le titre de l'annonce ni son adresse ne passent côté vendeur : un titre peut
// dire « EXCLUSIVITÉ », le nom d'une agence ou une rue, et le domaine de l'annonce dit qui vend.
describe('le titre et l’adresse de l’annonce ne passent jamais côté vendeur', () => {
  const TRAP_TITLE = 'EXCLUSIVITÉ Agence Dupont 12 rue des Lilas';
  const TRAP_URL = 'https://www.agence-dupont-immobilier.fr/annonce/vente-12-rue-des-lilas';

  const live = () => {
    const presentation = buildSellerPresentation({
      project: demoProject,
      property: demoProperty,
      diagnostics: null,
      condominium: null,
      comparables: demoComparables.map((competitor) => ({
        ...competitor,
        title: TRAP_TITLE,
        listing_url: TRAP_URL,
      })),
      savedPositioning: demoSavedPositioning,
      sellerResponses: demoAnsweredResponses,
      sellerSummary: demoAnsweredSummary,
      generatedAt: DEMO_AT,
      propertyPhotoUrls: [],
    });
    if (!presentation.live) throw new Error('fixture sans live');
    return presentation.live;
  };

  it('ni dans la charge projetée, ni dans une révélation livrée, ni dans l’analyse', () => {
    const full = live();
    const projected = projectLiveForSeller(full);
    const revealed = full.comparables.map((entry) => authorizeComparableReveal(full, entry.id));
    expect(revealed.some((entry) => entry != null)).toBe(true);
    const payload = JSON.stringify({ projected, revealed, range: authorizeAdvisorRange(full) });
    for (const leak of [
      'EXCLUSIVITÉ',
      'Dupont',
      'Lilas',
      'agence-dupont',
      'listingUrl',
      '"title"',
    ]) {
      expect(payload, leak).not.toContain(leak);
    }
    // Le concurrent reste désigné par son libellé neutre.
    expect(projected.comparables[0].neutralLabel).not.toContain('Lilas');
  });

  it('aucun écran du Live ne lit le titre ou l’adresse d’une annonce', () => {
    const DIR = join(process.cwd(), 'src', 'features', 'live-seller', 'components');
    const offenders = readdirSync(DIR)
      .filter((file) => /\.tsx$/.test(file) && !/\.test\.tsx?$/.test(file))
      .filter((file) =>
        /\b(entry|dangerous|comparable|competitor)\.(title|listingUrl)\b/.test(
          readFileSync(join(DIR, file), 'utf8'),
        ),
      );
    expect(offenders).toEqual([]);
  });
});
