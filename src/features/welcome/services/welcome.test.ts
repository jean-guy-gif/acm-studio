import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { SuiviDossier } from '@/features/meeting-conclusion/queries/get-suivi-dossiers';
import {
  averageJourneyGap,
  exclusiveSignedCount,
  followUpMotiveCounts,
  suiviCounts,
} from '@/features/meeting-conclusion/services/filter-suivi';
import type { ConclusionOutcome } from '@/features/meeting-conclusion/types';
import {
  EXAMPLE_CITY,
  EXAMPLE_COMPETITORS,
  EXAMPLE_PROPERTY,
  EXAMPLE_SELLER_NAME,
  exampleHasNoRealAddress,
} from '@/features/welcome/services/example-dossier';
import { isExampleDossier, withoutExamples } from '@/features/welcome/services/example-exclusion';
import {
  LOCALISATEUR_STORE_URL,
  locatorInstalled,
  WELCOME_STEPS,
  homeHref,
  isChromeBrowser,
} from '@/features/welcome/services/welcome';

const SRC = join(process.cwd(), 'src');
const read = (...path: string[]): string => readFileSync(join(SRC, ...path), 'utf8');

describe('« Bienvenue » (mission 97)', () => {
  it('accueille le conseiller tant qu’il n’a aucun dossier', () => {
    expect(homeHref(0)).toBe('/bienvenue');
    expect(homeHref(1)).toBe('/builder');
    expect(homeHref(12)).toBe('/builder');
  });

  it('jamais en mode expert : ses dossiers (mission 110)', () => {
    expect(homeHref(0, true)).toBe('/builder');
    expect(homeHref(3, true)).toBe('/builder');
  });

  it('donne les 4 étapes, une ligne chacune', () => {
    expect(WELCOME_STEPS.map((step) => step.title)).toEqual([
      'Le bien du vendeur',
      'Les concurrents',
      'Avant le rendez-vous',
      'Le Live et le suivi',
    ]);
    for (const step of WELCOME_STEPS) {
      expect(step.line).not.toContain('\n');
      expect(step.line.length).toBeLessThanOrEqual(110);
    }
  });

  it('reconnaît Chrome, pas ses cousins', () => {
    const chrome =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
    expect(isChromeBrowser(chrome)).toBe(true);
    expect(isChromeBrowser(`${chrome} Edg/141.0.0.0`)).toBe(false);
    expect(isChromeBrowser(`${chrome} OPR/120.0.0.0`)).toBe(false);
    expect(
      isChromeBrowser(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
      ),
    ).toBe(false);
    expect(
      isChromeBrowser('Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0'),
    ).toBe(false);
  });

  it('propose le Localisateur en facultatif, sans jamais nommer sa version ACM', () => {
    const checklist = read('features', 'welcome', 'components', 'welcome-checklist.tsx');
    expect(checklist).toContain('Facultatif : Localisateur Academia');
    expect(checklist).toContain('Pour retrouver l’adresse d’un bien.');
    expect(checklist).not.toMatch(/acm1|3\.1\.1/i);
  });

  // Mission 106 — la ligne mène à la page du Store, et se coche quand un Localisateur répond.
  it('mène au Localisateur du Store, et se coche quand un Localisateur répond', () => {
    expect(LOCALISATEUR_STORE_URL).toBe(
      'https://chromewebstore.google.com/detail/fpnimjhhiagpfjodphjddobegnelckeg',
    );
    expect(locatorInstalled('ready')).toBe(true);
    expect(locatorInstalled('sharing_off')).toBe(true);
    expect(locatorInstalled('unavailable')).toBe(false);
    expect(locatorInstalled(null)).toBe(false);
    const checklist = read('features', 'welcome', 'components', 'welcome-checklist.tsx');
    expect(checklist).toContain('href={LOCALISATEUR_STORE_URL}');
    // Mission 114 — en démonstration, la ligne est cochée sans Localisateur : les adresses sont simulées.
    expect(checklist).toContain(
      "state={extension.demo || locatorInstalled(locator) ? 'done' : 'optional'}",
    );
    expect(checklist).toContain('pingLocator()');
  });

  it('« Aide » ramène à « Bienvenue » depuis le menu', () => {
    // Mission 125 — « Aide » est au menu de la carte du conseiller, dans le service du mode.
    expect(read('features', 'workspace-mode', 'services', 'workspace-mode.ts')).toContain(
      "{ href: '/bienvenue', label: 'Aide'",
    );
  });
});

describe('le dossier d’exemple est une démonstration identifiée', () => {
  it('se nomme « Exemple », dans une commune qui n’existe pas', () => {
    expect(EXAMPLE_SELLER_NAME.startsWith('Exemple')).toBe(true);
    expect(EXAMPLE_PROPERTY.city).toBe(EXAMPLE_CITY);
    expect(EXAMPLE_CITY).toBe('Exempleville');
  });

  it('ne porte aucune adresse réelle : ni adresse, ni code postal, ni annonce, ni photo', () => {
    expect(exampleHasNoRealAddress()).toBe(true);
    const everything = JSON.stringify({ EXAMPLE_PROPERTY, EXAMPLE_COMPETITORS });
    expect(everything).not.toMatch(/https?:|listing_url|photo|address|postal_code|\b\d{5}\b/);
    for (const competitor of EXAMPLE_COMPETITORS) {
      expect(competitor.title).toContain('exemple');
    }
  });

  it('est prêt pour le Live : au moins 3 concurrents avec prix et surface', () => {
    const exploitable = EXAMPLE_COMPETITORS.filter(
      (competitor) => competitor.price > 0 && competitor.surface_area > 0,
    );
    expect(exploitable.length).toBeGreaterThanOrEqual(3);
    // Assez pour voir le rythme accéléré, à partir du 4e concurrent (M95).
    expect(EXAMPLE_COMPETITORS.length).toBeGreaterThanOrEqual(4);
  });

  it('ne déclenche jamais la recherche payante', () => {
    expect(read('features', 'competitor-search', 'actions', 'search-stream-estate.ts')).toMatch(
      /if \(project\?\.is_example\) \{\s+return \{ ok: false, error: EXAMPLE_SEARCH_MESSAGE \};/,
    );
  });
});

describe('le dossier d’exemple est exclu de tous les compteurs', () => {
  const dossier = (
    id: string,
    outcome: ConclusionOutcome,
    isExample: boolean,
    extra: Partial<NonNullable<SuiviDossier['conclusion']>> = {},
  ): SuiviDossier => ({
    project: { id, seller_name: id, is_example: isExample } as unknown as SuiviDossier['project'],
    property: null,
    conclusion: {
      marketComputed: null,
      advisorAnalysis: null,
      advisorPrice: null,
      commercializationPrice: 300000,
      sellerPerceivedPrice: 330000,
      sellerRevisedPrice: null,
      launchReadinessFirst: null,
      launchReadinessLast: null,
      launchReadinessMissing: null,
      outcome,
      followUpReason: null,
      followUpMotive: outcome === 'follow_up' ? 'thinking_price' : null,
      followUpMotiveDetail: null,
      mandateType: outcome === 'signed' ? 'exclusive' : null,
      signedAt: null,
      concludedAt: null,
      outcomeChangedAt: null,
      ...extra,
    },
  });
  const all = [
    dossier('vrai-signé', 'signed', false),
    dossier('exemple-signé', 'signed', true, { commercializationPrice: 200000 }),
    dossier('vrai-relance', 'follow_up', false),
    dossier('exemple-relance', 'follow_up', true),
    dossier('exemple-retiré', 'withdrawn', true),
  ];
  const counted = withoutExamples(all);

  it('reconnaît un dossier d’exemple', () => {
    expect(all.map(isExampleDossier)).toEqual([false, true, false, true, true]);
    expect(counted.map((entry) => entry.project.id)).toEqual(['vrai-signé', 'vrai-relance']);
  });

  it('tuiles, exclusifs, écart moyen et motifs ne comptent que les vrais dossiers', () => {
    expect(suiviCounts(counted)).toEqual({ signed: 1, follow_up: 1, lost: 0 });
    expect(exclusiveSignedCount(counted)).toBe(1);
    // L'écart du seul vrai mandat signé : 330 000 → 300 000, soit −9,09 %.
    expect(averageJourneyGap(counted)).toBeCloseTo(-9.09, 1);
    expect([...followUpMotiveCounts(counted)]).toEqual([['thinking_price', 1]]);
  });

  it('le Suivi compte sur la liste sans exemples, mais les affiche', () => {
    const page = read('app', '(protected)', 'suivi', 'page.tsx');
    expect(page).toContain('const counted = withoutExamples(allDossiers);');
    for (const counter of [
      'suiviCounts(counted)',
      'followUpMotiveCounts(counted)',
      'getAgencyProspecting(counted)',
    ]) {
      expect(page).toContain(counter);
    }
    // Mission 130 — « À faire aujourd'hui » et le compteur du menu laissent l'exemple de côté
    // (le service écarte `isExample`, le compteur part de `withoutExamples`) ; le rapprochement,
    // parti au mode Acquéreur, aussi.
    expect(read('features', 'meeting-conclusion', 'services', 'suivi-tasks.ts')).toContain(
      'inputs.filter((input) => !input.isExample)',
    );
    expect(read('features', 'meeting-conclusion', 'queries', 'get-suivi-task-count.ts')).toContain(
      // Mission 132 — lus avec les acquéreurs à recontacter, puis l'exemple écarté.
      'withoutExamples(allDossiers)',
    );
    expect(read('app', '(protected)', 'acquereurs', 'rapprochement', 'page.tsx')).toContain(
      'dossiers={counted}',
    );
    // La liste, elle, part de tous les dossiers : l'exemple s'y voit, avec son badge.
    expect(page).toContain('filterSuiviByGroup(allDossiers, group)');
    expect(read('features', 'meeting-conclusion', 'components', 'suivi-row.tsx')).toContain(
      '{project.is_example ? <ExampleBadge /> : null}',
    );
  });

  it('la Prospection et la vue du manager l’ignorent', () => {
    expect(read('features', 'prospecting', 'queries', 'get-agency-prospecting.ts')).toContain(
      'withoutExamples(dossiers).filter(',
    );
    expect(read('features', 'team', 'queries', 'get-manager-overview.ts')).toContain(
      ".eq('is_example', false)",
    );
    expect(read('app', '(protected)', 'builder', '[projectId]', 'page.tsx')).toContain(
      '!project.is_example && isProspectingOpen(',
    );
  });
});
