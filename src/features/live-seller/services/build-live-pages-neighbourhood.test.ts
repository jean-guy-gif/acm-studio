import { describe, expect, it } from 'vitest';

import { buildLiveSequence } from '@/features/before-meeting/services/live-sequence';
import { buildLivePages } from '@/features/live-seller/services/build-live-pages';
import { answeredResumeBound } from '@/features/live-seller/services/max-reachable-live-index';

// Mission 159 — le quartier au Live (décisions de Jean-Guy, 17/11) : un écran par bloc coché, après
// « Votre valeur perçue » ; les ventes réelles juste avant « Analyse des prix », après « Votre prix
// après le marché » ; les mêmes écrans dans les trois rythmes, comptés dans la durée et dans
// « Reprendre », sans plafond ; sans instantané, aucun écran.
const comparables = [1, 2, 3, 4].map((n) => ({ id: `c${n}`, response: null, energyRating: null }));
const ALL = ['ventes', 'permis', 'urbanisme', 'copropriete', 'population', 'risques'] as const;
const keys = (pages: { key: string }[]) => pages.map((page) => page.key);

describe('les écrans du quartier', () => {
  it('sans bloc coché, le Live est celui d’avant', () => {
    expect(keys(buildLivePages({ comparables, neighbourhood: [] }, true))).toEqual(
      keys(buildLivePages({ comparables }, true)),
    );
  });

  it('l’ordre de la planche : urbanisme, risques, population, copropriété, permis, puis les ventes avant l’analyse', () => {
    const order = keys(buildLivePages({ comparables, neighbourhood: ALL }, true));
    expect(order.slice(0, 8)).toEqual([
      'intro',
      'subject_property',
      'seller_perceived_price',
      'neighbourhood:urbanisme',
      'neighbourhood:risques',
      'neighbourhood:population',
      'neighbourhood:copropriete',
      'neighbourhood:permis',
    ]);
    const sales = order.indexOf('neighbourhood:ventes');
    expect(order[sales - 1]).toBe('seller_revised_price');
    expect(order[sales + 1]).toBe('price_analysis');
  });

  it('les mêmes écrans dans les trois façons de présenter', () => {
    for (const [rhythm, mode] of [
      ['complete', 'interactive'],
      ['accelerated', 'interactive'],
      ['complete', 'direct'],
    ] as const) {
      const pages = buildLivePages({ comparables, neighbourhood: ALL }, true, rhythm, mode);
      expect(pages.filter((page) => page.key.startsWith('neighbourhood:'))).toHaveLength(6);
    }
    // En directe, sans valeur perçue : le quartier suit « Votre bien ».
    const direct = keys(
      buildLivePages({ comparables, neighbourhood: ['risques'] }, true, 'complete', 'direct'),
    );
    expect(direct.slice(0, 3)).toEqual(['intro', 'subject_property', 'neighbourhood:risques']);
  });

  it('chaque écran compte dans la durée, sans plafond', () => {
    const without = buildLiveSequence(comparables, true, 'accelerated');
    const withAll = buildLiveSequence(comparables, true, 'accelerated', 'interactive', ALL);
    expect(withAll.totalScreens).toBe(without.totalScreens + 6);
    expect(withAll.estimatedMinutes).toBeGreaterThan(without.estimatedMinutes);
    expect(withAll.parts.map((part) => part.key)).toEqual([
      'opening',
      'perceived',
      'neighbourhood',
      'competitors',
      'market',
      'closing',
    ]);
    expect(withAll.screenTitles).toContain('Votre quartier — les risques');
    expect(withAll.screenTitles).toContain('Les ventes réelles autour du bien');
  });

  it('un écran du quartier ne pose pas de question : il ne retient pas la reprise', () => {
    const pages = buildLivePages({ comparables, neighbourhood: ['urbanisme'] }, true);
    const live = {
      comparables,
      sellerSummary: {
        seller_property_confirmed: true,
        seller_perceived_property_price: 400000,
      } as never,
    };
    expect(pages[answeredResumeBound(pages, live)]?.key).toBe('comparable_competition:c1');
  });
});
