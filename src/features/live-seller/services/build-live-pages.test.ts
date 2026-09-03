import { describe, expect, it } from 'vitest';

import { buildLivePages } from '@/features/live-seller/services/build-live-pages';
import type { LiveComparativeData } from '@/features/seller-presentation/types/seller-presentation';

function live(comparableCount: number): LiveComparativeData {
  return {
    comparables: Array.from({ length: comparableCount }, (_v, i) => ({ id: `c${i}` }) as never),
    sellerSummary: null,
    competitiveMarketCentral: null,
    advisorDecision: null,
    priceGaps: {
      sellerPerceivedPrice: null,
      competitiveMarketCentral: null,
      advisorComparativePrice: null,
      sellerVsMarket: { amount: null, percentage: null },
      sellerVsAdvisor: { amount: null, percentage: null },
      marketVsAdvisor: { amount: null, percentage: null },
    },
  };
}

describe('buildLivePages', () => {
  it('produces exactly 4 pages per retained comparable, competition→price→reveal→duration', () => {
    const pages = buildLivePages(live(2), false);
    const perComparable = pages.filter((p) => p.comparableId === 'c0');
    expect(perComparable.map((p) => p.type)).toEqual([
      'comparable_competition',
      'comparable_price',
      'comparable_price_reveal',
      'comparable_duration',
    ]);
    expect(perComparable.map((p) => p.step)).toEqual([1, 2, 3, 4]);
  });

  it('reduces a rejected comparable to a single page (competition only)', () => {
    const scenario = live(2);
    scenario.comparables[0].response = {
      seller_serious_competitor: 'no',
    } as LiveComparativeData['comparables'][number]['response'];

    const pages = buildLivePages(scenario, false);
    const rejectedPages = pages.filter((page) => page.comparableId === scenario.comparables[0].id);

    // The seller's "not a competitor" skips the guess, the reveal AND the duration.
    expect(rejectedPages.map((page) => page.type)).toEqual(['comparable_competition']);
  });

  it('orders the whole flow: intro, loop, dangerous, perceived, analysis, conclusion', () => {
    const pages = buildLivePages(live(2), false);
    expect(pages[0].type).toBe('intro');
    expect(pages.map((p) => p.type).slice(-4)).toEqual([
      'dangerous_competitor',
      'seller_perceived_price',
      'price_analysis',
      'conclusion',
    ]);
    // intro + 2*4 + 4 tail
    expect(pages).toHaveLength(1 + 8 + 4);
  });

  it('skips the per-comparable loop and the dangerous page when there are none', () => {
    const pages = buildLivePages(live(0), false);
    expect(pages.map((p) => p.type)).toEqual([
      'intro',
      'seller_perceived_price',
      'price_analysis',
      'conclusion',
    ]);
  });

  it('assigns a 1-based comparable index', () => {
    const pages = buildLivePages(live(2), false);
    expect(pages.find((p) => p.comparableId === 'c1')?.comparableIndex).toBe(2);
  });

  it('inserts the "Votre bien" recognition slide right after intro when a subject property exists', () => {
    const pages = buildLivePages(live(2), true);
    expect(pages[0].type).toBe('intro');
    expect(pages[1].type).toBe('subject_property');
    expect(pages[1].title).toBe('Votre bien');
    // intro + subject_property + 2*4 + 4 tail
    expect(pages).toHaveLength(1 + 1 + 8 + 4);
  });

  it('omits the "Votre bien" slide when the dossier has no subject property', () => {
    expect(buildLivePages(live(2), false).some((p) => p.type === 'subject_property')).toBe(false);
    // even with no comparables at all
    expect(buildLivePages(live(0), false).some((p) => p.type === 'subject_property')).toBe(false);
  });
});
