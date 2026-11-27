import { describe, expect, it } from 'vitest';

import {
  bothRhythmsLabel,
  buildLiveSequence,
  durationLabel,
  estimateLiveMinutes,
  MINUTES_PER_SCREEN,
  tooManyCompetitorsNote,
} from '@/features/before-meeting/services/live-sequence';
import {
  buildMarketGlance,
  type GlanceCompetitor,
} from '@/features/before-meeting/services/market-glance';
import {
  buildReadinessChecks,
  decisionFormulaNote,
  isReadyBadge,
} from '@/features/before-meeting/services/readiness-checks';
import { buildLivePages } from '@/features/live-seller/services/build-live-pages';

const plain = (text: string) => text.replace(/[\u00a0\u202f]/g, ' ');

function competitor(id: string, overrides: Partial<GlanceCompetitor> = {}): GlanceCompetitor {
  return {
    id,
    price: 600_000,
    surfaceArea: 120,
    daysOnMarket: null,
    hasDropped: false,
    ...overrides,
  };
}

describe('buildMarketGlance', () => {
  it('donne les quatre chiffres sur les concurrents retenus', () => {
    const glance = buildMarketGlance([
      competitor('a', { price: 615_000, surfaceArea: 123, daysOnMarket: 40, hasDropped: true }),
      competitor('b', { price: 700_000, surfaceArea: 140, daysOnMarket: 94 }),
      competitor('c', { price: 745_000, surfaceArea: 149, daysOnMarket: 200, hasDropped: true }),
    ]);
    expect(glance.competitorCount).toBe(3);
    expect(glance.medianPricePerSquareMeter).toBe(5000);
    expect(glance.lowestPrice).toBe(615_000);
    expect(glance.highestPrice).toBe(745_000);
    expect(glance.medianDaysOnMarket).toBe(94);
    expect(glance.droppedCount).toBe(2);
  });

  it('place chaque concurrent entre le moins cher et le plus cher au m²', () => {
    const glance = buildMarketGlance([
      competitor('cher', { price: 600_000, surfaceArea: 100 }),
      competitor('bas', { price: 400_000, surfaceArea: 100 }),
      competitor('milieu', { price: 450_000, surfaceArea: 100 }),
    ]);
    expect(glance.dots.map((dot) => dot.id)).toEqual(['bas', 'milieu', 'cher']);
    expect(glance.dots.map((dot) => dot.position)).toEqual([0, 0.25, 1]);
    expect(glance.medianPosition).toBe(0.25);
  });

  it('ne montre pas un chiffre qui manque, et n’invente rien', () => {
    const glance = buildMarketGlance([
      competitor('a', { surfaceArea: null }),
      competitor('b', { price: null }),
    ]);
    expect(glance.medianPricePerSquareMeter).toBeNull();
    expect(glance.dots).toEqual([]);
    expect(glance.medianPosition).toBeNull();
    expect(glance.lowestPrice).toBe(600_000);
    expect(glance.medianDaysOnMarket).toBeNull();
    // Aucune baisse connue n'est pas « aucun n'a baissé » : le chiffre ne s'affiche pas.
    expect(glance.droppedCount).toBeNull();
  });

  it('reste vide sans concurrent', () => {
    const glance = buildMarketGlance([]);
    expect(glance.competitorCount).toBe(0);
    expect(glance.lowestPrice).toBeNull();
    expect(glance.highestPrice).toBeNull();
  });

  it('superpose les points quand tous ont le même prix au m²', () => {
    const glance = buildMarketGlance([competitor('a'), competitor('b')]);
    expect(glance.dots.map((dot) => dot.position)).toEqual([0.5, 0.5]);
    expect(glance.medianPosition).toBe(0.5);
  });
});

describe('buildLiveSequence', () => {
  const six = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({ id, energyRating: 'D' }));

  it('compte le déroulé de la maquette : 6 concurrents, 33 écrans, 40 à 55 min', () => {
    const sequence = buildLiveSequence([...six.slice(0, 5), { id: 'f', energyRating: null }], true);
    expect(sequence.parts).toEqual([
      { key: 'opening', label: 'Introduction · Votre bien', screenCount: 2 },
      { key: 'perceived', label: 'Votre valeur perçue', screenCount: 1 },
      { key: 'competitors', label: '6 concurrents, un à la fois', screenCount: 24 },
      { key: 'dpe', label: 'Le DPE face au marché', screenCount: 1 },
      {
        key: 'market',
        label: 'Le concurrent le plus dangereux · Votre prix après le marché · Analyse des prix',
        screenCount: 3,
      },
      {
        key: 'closing',
        label: 'Prix de commercialisation · Question de 1 à 10',
        screenCount: 2,
      },
    ]);
    expect(sequence.totalScreens).toBe(33);
    expect(plain(durationLabel(sequence))).toBe('environ 49 min');
    expect(sequence.competitorsWithoutDpe).toBe(1);
  });

  it('compte exactement les écrans du moteur du Live', () => {
    for (const hasProperty of [true, false]) {
      const sequence = buildLiveSequence(six, hasProperty);
      const pages = buildLivePages(
        { comparables: six.map((entry) => ({ ...entry, response: null })) },
        hasProperty,
      );
      expect(sequence.totalScreens).toBe(pages.length);
      expect(sequence.parts.reduce((sum, part) => sum + part.screenCount, 0)).toBe(pages.length);
      expect(sequence.screenTitles).toHaveLength(pages.length);
    }
  });

  it('ne nomme que les écrans présents', () => {
    const sequence = buildLiveSequence([], false);
    expect(sequence.parts.map((part) => part.label)).toEqual([
      'Introduction',
      'Votre valeur perçue',
      'Analyse des prix',
      'Prix de commercialisation · Question de 1 à 10',
    ]);
    expect(sequence.totalScreens).toBe(5);
    expect(plain(durationLabel(sequence))).toBe('environ 7 min');
  });

  it('ne signale pas de concurrent sans DPE quand l’écran DPE n’existe pas', () => {
    const sequence = buildLiveSequence([{ id: 'a', energyRating: null }], true);
    expect(sequence.parts.some((part) => part.key === 'dpe')).toBe(false);
    expect(sequence.competitorsWithoutDpe).toBe(0);
  });

  it('liste les titres des écrans sans aucun montant', () => {
    const sequence = buildLiveSequence(six.slice(0, 1), true);
    expect(sequence.screenTitles).toContain('Concurrent 1 — À quel prix\u202f?');
    expect(sequence.screenTitles.join(' ')).not.toMatch(/\d{3}|€/);
  });
});

describe('buildReadinessChecks', () => {
  const ready = { hasProperty: true, retainedCount: 6, exploitableCount: 6, hasDecision: true };

  it('coche les quatre pastilles d’un dossier prêt', () => {
    const checks = buildReadinessChecks(ready);
    expect(checks.map((check) => check.done)).toEqual([true, true, true, true]);
    expect(checks.map((check) => check.label)).toEqual([
      'Bien vendeur',
      '6 concurrents retenus',
      'Prix et surface pour les 6',
      'Décision enregistrée',
    ]);
    expect(isReadyBadge(ready, 'draft')).toBe(true);
  });

  it('dit ce qui reste à faire', () => {
    const input = { hasProperty: false, retainedCount: 2, exploitableCount: 1, hasDecision: false };
    const checks = buildReadinessChecks(input);
    expect(checks.map((check) => check.done)).toEqual([false, false, false, false]);
    expect(checks.map((check) => check.label)).toEqual([
      'Bien vendeur à renseigner',
      '2 concurrents retenus — il en faut 3',
      'Prix et surface pour 1 sur 2',
      'Décision à enregistrer',
    ]);
    expect(isReadyBadge(input, 'draft')).toBe(false);
  });

  it('ne change pas la règle de « prêt » : un concurrent retenu sans surface n’empêche rien', () => {
    const input = { hasProperty: true, retainedCount: 4, exploitableCount: 3, hasDecision: true };
    expect(buildReadinessChecks(input)[2]).toMatchObject({ done: false });
    expect(isReadyBadge(input, 'draft')).toBe(true);
  });

  it('garde « Prêt » pour un dossier que le conseiller a déclaré prêt (M52)', () => {
    const input = { hasProperty: true, retainedCount: 1, exploitableCount: 1, hasDecision: false };
    expect(isReadyBadge(input, 'ready_for_meeting')).toBe(true);
  });
});

describe('decisionFormulaNote', () => {
  const plain = (text: string) => text.replace(/[\u00a0\u202f]/g, ' ');

  it('dit d’où vient le montant proposé', () => {
    expect(plain(decisionFormulaNote(140, 0))).toBe('Prix médian au m² × 140 m².');
    expect(plain(decisionFormulaNote(82.5, 1))).toBe(
      'Prix médian au m² × 83 m², hors 1 concurrent atypique.',
    );
  });
});

describe('mission 92 — un Live sans écrans inutiles', () => {
  const seven = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => ({ id, energyRating: 'D' }));

  it('prévient au-delà de 6 concurrents, sans rien bloquer', () => {
    const sequence = buildLiveSequence(seven, true);
    expect(tooManyCompetitorsNote(sequence, 7)).toBe(
      '7 concurrents\u00a0: environ 55 minutes de Live. Nous conseillons 6 au plus.',
    );
    expect(tooManyCompetitorsNote(buildLiveSequence(seven.slice(0, 6), true), 6)).toBeNull();
  });

  it('ne compte pas l’étape « Durée » d’un concurrent sans durée ni historique', () => {
    const withAll = buildLiveSequence(seven.slice(0, 2), true);
    const withOneUnknown = buildLiveSequence(
      [seven[0], { ...seven[1], durationKnown: false }],
      true,
    );
    expect(withOneUnknown.totalScreens).toBe(withAll.totalScreens - 1);
    expect(withOneUnknown.screenTitles).not.toContain(
      'Concurrent 2 — Pourquoi toujours en vente\u202f?',
    );
    expect(withOneUnknown.screenTitles).toContain(
      'Concurrent 1 — Pourquoi toujours en vente\u202f?',
    );
  });
});

describe('mission 95 — le rythme du Live et sa durée estimée', () => {
  const competitors = (count: number) =>
    Array.from({ length: count }, (_value, i) => ({ id: `c${i}`, energyRating: 'D' }));
  const screens = (count: number, rhythm: 'accelerated' | 'complete') =>
    buildLiveSequence(competitors(count), true, rhythm);

  it('la formule : écrans × 1,475, arrondi à la minute', () => {
    expect(MINUTES_PER_SCREEN).toBe(1.475);
    expect(estimateLiveMinutes(27)).toBe(40);
    expect(estimateLiveMinutes(33)).toBe(49);
  });

  // Écrans communs : introduction, votre bien, valeur perçue, DPE, concurrent le plus dangereux,
  // prix reformulé, analyse, prix de commercialisation, question de 1 à 10 = 9.
  it('3 concurrents : les deux rythmes sont identiques (rien n’est accéléré avant le 4e)', () => {
    for (const rhythm of ['accelerated', 'complete'] as const) {
      const sequence = screens(3, rhythm);
      expect(sequence.totalScreens).toBe(9 + 3 * 4);
      expect(sequence.estimatedMinutes).toBe(31);
    }
  });

  it('6 concurrents : 49 min en complet, 40 min en accéléré', () => {
    expect(screens(6, 'complete').totalScreens).toBe(9 + 6 * 4);
    expect(screens(6, 'complete').estimatedMinutes).toBe(49);
    expect(screens(6, 'accelerated').totalScreens).toBe(9 + 3 * 4 + 3 * 2);
    expect(screens(6, 'accelerated').estimatedMinutes).toBe(40);
  });

  it('8 concurrents : 60 min en complet, 46 min en accéléré', () => {
    expect(screens(8, 'complete').totalScreens).toBe(9 + 8 * 4);
    expect(screens(8, 'complete').estimatedMinutes).toBe(60);
    expect(screens(8, 'accelerated').totalScreens).toBe(9 + 3 * 4 + 5 * 2);
    expect(screens(8, 'accelerated').estimatedMinutes).toBe(46);
  });

  it('affiche les deux estimations côte à côte', () => {
    expect(plain(bothRhythmsLabel(screens(6, 'accelerated'), screens(6, 'complete')))).toBe(
      'Accéléré : environ 40 min · Complet : environ 49 min',
    );
  });

  it('l’avertissement au-delà de 6 concurrents reprend la durée du rythme choisi', () => {
    expect(tooManyCompetitorsNote(screens(7, 'accelerated'), 7)).toBe(
      '7 concurrents\u00a0: environ 43 minutes de Live. Nous conseillons 6 au plus.',
    );
    expect(tooManyCompetitorsNote(screens(7, 'complete'), 7)).toBe(
      '7 concurrents\u00a0: environ 55 minutes de Live. Nous conseillons 6 au plus.',
    );
  });

  it('le déroulé compte les deux écrans des concurrents accélérés', () => {
    const sequence = screens(5, 'accelerated');
    expect(sequence.parts.find((part) => part.key === 'competitors')?.screenCount).toBe(
      3 * 4 + 2 * 2,
    );
    expect(sequence.screenTitles).toContain('Concurrent 3 — Pourquoi toujours en vente\u202f?');
    expect(sequence.screenTitles).toContain(
      'Concurrent 4 — Un sérieux concurrent, et à quel prix\u202f?',
    );
    expect(sequence.screenTitles).not.toContain('Concurrent 4 — Pourquoi toujours en vente\u202f?');
  });
});
