import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  DEMO_LISTING_UNKNOWN,
  DEMO_SOURCE_LABEL,
  DEMO_SUBJECT_UNKNOWN,
} from '@/features/demo/constants';
import { DEMO_AGENCIES, DEMO_SCENARIOS, DEMO_STREETS } from '@/features/demo/data/scenarios';
import {
  demoBrochureChoices,
  demoSubjectListingChoices,
} from '@/features/demo/services/demo-choices';

// Mission 114 (point 2 et preuve 16, décision de Jean-Guy du 23/10) — rien ne dit « démonstration »
// à l'écran ni à l'impression : ni bandeau, ni pied d'écran, ni filigrane, ni pastille. L'agence de
// démonstration se reconnaît au serveur seulement ; le repère ne se voit qu'en bas de `/erreurs`,
// côté opérateur. Ce test le vérifie sur le code (les pages et les impressions, l'e2e `demo` le
// vérifie sur l'écran) et sur tout ce que le jeu de données met sous les yeux : rues, agences,
// titres, descriptions, libellés proposés au closer.

const UNSPOKEN = /d[ée]mo|fictif|fictive|simulat/i;
const read = (...parts: string[]) => readFileSync(join(process.cwd(), ...parts), 'utf8');

describe('rien ne dit « démonstration » à l’écran ni à l’impression', () => {
  it('ni bandeau, ni filigrane, ni note du Live : les composants n’existent plus', () => {
    for (const file of ['demo-banner.tsx', 'demo-watermark.tsx']) {
      expect(existsSync(join(process.cwd(), 'src', 'features', 'demo', 'components', file))).toBe(
        false,
      );
    }
    for (const file of [
      ['app', '(protected)', 'layout.tsx'],
      ['app', '(print)', 'layout.tsx'],
      ['app', 'synthese', '[token]', 'page.tsx'],
      ['app', '(stage)', 'live', '[projectId]', 'page.tsx'],
      ['app', '(stage)', 'live', '[projectId]', 'pause', 'page.tsx'],
      ['app', '(stage)', 'live', '[projectId]', 'merci', 'page.tsx'],
      ['features', 'live-seller', 'components', 'live-comparative-shell.tsx'],
      ['features', 'live-seller', 'components', 'live-neutral-screen.tsx'],
      ['features', 'seller-synthesis', 'components', 'seller-synthesis-document.tsx'],
    ]) {
      const source = read('src', ...file);
      expect(source, file.join('/')).not.toMatch(/DemoBanner|DemoWatermark|demo-live-note/);
    }
  });

  it('le drapeau des écrans ne décide d’aucun texte : seule la case de /erreurs nomme la démo', () => {
    // Les écrans lisent `useDemoMode` pour ne pas sonder l'extension ni le Localisateur ; aucun
    // d'eux n'en fait un texte.
    for (const file of [
      ['features', 'welcome', 'components', 'welcome-checklist.tsx'],
      ['features', 'subject-property-import', 'components', 'subject-property-import-panel.tsx'],
      ['features', 'subject-property-import', 'components', 'brochure-import-panel.tsx'],
      ['features', 'competitor-search', 'components', 'competitor-search-panel.tsx'],
      ['features', 'competitor-search', 'components', 'pending-imports-banner.tsx'],
      ['features', 'competitor-refresh', 'components', 'refresh-prices-button.tsx'],
      [
        'app',
        '(protected)',
        'builder',
        '[projectId]',
        'comparables',
        'new',
        'new-comparable-panel.tsx',
      ],
    ]) {
      const source = read('src', ...file).replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '');
      const strings = source.match(/(['"`])(?:(?!\1)[^\\]|\\.)*\1|>[^<{]+</g) ?? [];
      for (const text of strings) {
        expect(text, `${file.join('/')} : ${text}`).not.toMatch(/démonstration|DÉMONSTRATION/);
      }
    }
    expect(DEMO_SOURCE_LABEL).not.toMatch(UNSPOKEN);
    expect(DEMO_SUBJECT_UNKNOWN).not.toMatch(UNSPOKEN);
    expect(DEMO_LISTING_UNKNOWN).not.toMatch(UNSPOKEN);
    for (const choice of [...demoSubjectListingChoices(), ...demoBrochureChoices()]) {
      expect(choice.label).not.toMatch(UNSPOKEN);
    }
  });

  it('le jeu de données ne le dit pas non plus : rues, agences, titres, descriptions', () => {
    for (const street of DEMO_STREETS) expect(street).not.toMatch(UNSPOKEN);
    for (const agency of DEMO_AGENCIES) expect(agency).not.toMatch(UNSPOKEN);
    for (const scenario of DEMO_SCENARIOS) {
      expect(scenario.label).not.toMatch(UNSPOKEN);
      // Partie B — le nom du vendeur devient celui d'un dossier de démo.
      expect(scenario.sellerName).not.toMatch(UNSPOKEN);
      expect(scenario.subject.title).not.toMatch(UNSPOKEN);
      expect(scenario.subject.description).not.toMatch(UNSPOKEN);
      for (const strength of scenario.subject.strengths) expect(strength).not.toMatch(UNSPOKEN);
      for (const listing of scenario.listings) {
        expect(listing.title).not.toMatch(UNSPOKEN);
        expect(listing.description).not.toMatch(UNSPOKEN);
        expect(listing.address.street).not.toMatch(UNSPOKEN);
      }
    }
  });

  it('les fiches PDF s’impriment comme les vraies : ni en-tête ni mention', () => {
    const script = read('scripts', 'demo-fiches.mjs').replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '');
    expect(script).not.toMatch(/DÉMONSTRATION|Document de démonstration|class="demo"/);
    // Les chemins (`public/demo`, `features/demo`) restent ; aucun TEXTE ne dit « démo ».
    expect(script).not.toMatch(/démo|DÉMO|d[ée]monstration/);
  });
});
