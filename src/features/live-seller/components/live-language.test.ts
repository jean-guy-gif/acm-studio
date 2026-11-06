import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { LivePageAnalysis } from '@/features/live-seller/components/live-page-analysis';
import { LivePageClosing } from '@/features/live-seller/components/live-page-closing';
import { LivePageDpe } from '@/features/live-seller/components/live-page-dpe';
import { LivePageIntro } from '@/features/live-seller/components/live-page-intro';
import { LivePageRevised } from '@/features/live-seller/components/live-page-revised';
import { LiveTextsProvider } from '@/features/live-seller/components/live-texts';
import type { MarketReading } from '@/features/live-seller/services/market-reading';
import type { TextLanguage } from '@/lib/client-texts';
import { frenchLeaks } from '@/test-fixtures/french-leaks';

// Mission 140 — le Live dans la langue du dossier : chaque écran lit ses mots dans les textes du
// client, portés par la scène (`LiveTextsProvider`). En anglais, rien ne reste du français ; sans
// langue, le français ne change pas.

const READING: MarketReading = {
  calculationCount: 3,
  seenTogetherCount: null,
  revealedCount: 3,
  prices: [300_000, 320_000, 360_000],
  revealed: [
    { id: 'c1', price: 300_000 },
    { id: 'c2', price: 320_000 },
    { id: 'c3', price: 360_000 },
  ],
  lowestPrice: 300_000,
  highestPrice: 360_000,
  medianPrice: 320_000,
  droppedCount: 1,
  medianDaysOnMarket: 64,
  competitorPriceBasis: 'computed',
};

const screens: ReactElement[] = [
  createElement(LivePageIntro, {
    comparablesCount: 5,
    sellerName: 'Mr and Mrs Bernard',
    address: null,
    onStart: () => undefined,
  }),
  createElement(LivePageRevised, { summary: null, confirming: 325_000 }),
  createElement(LivePageDpe, {
    subjectEnergyRating: null,
    competitorEnergyRatings: ['D', 'D', 'C'],
  }),
  createElement(LivePageAnalysis, {
    priceGaps: {
      sellerPerceivedPrice: 350_000,
      competitiveMarketCentral: 320_000,
      advisorComparativePrice: 330_000,
      sellerVsMarket: { amount: 30_000, percentage: 9.4 },
      sellerVsAdvisor: { amount: 20_000, percentage: 6.1 },
      marketVsAdvisor: { amount: -10_000, percentage: -3 },
    },
    reading: READING,
    revisedPrice: 325_000,
  }),
  createElement(LivePageClosing, {
    agreedPrice: 330_000,
    hasAgreedPrice: true,
    advisorAnalysis: 330_000,
    score: 7,
    missing: '',
    onScore: () => undefined,
    onMissingChange: () => undefined,
  }),
];

const render = (screen: ReactElement, language?: TextLanguage) =>
  renderToStaticMarkup(language ? createElement(LiveTextsProvider, { language }, screen) : screen);

describe('le Live dans la langue du vendeur', () => {
  it('en anglais, aucun écran ne garde un mot français', () => {
    for (const screen of screens) {
      expect(frenchLeaks(render(screen, 'en'), ['Mr and Mrs Bernard'])).toEqual([]);
    }
  });

  it('en anglais, les montants à l’anglaise', () => {
    const html = render(screens[3], 'en');
    expect(html).toContain('€350,000');
    expect(html).toContain('Price analysis');
  });

  it('sans langue, le français d’avant', () => {
    expect(render(screens[1])).toContain(
      'Après avoir vu ces biens, à quel prix mettriez-vous votre bien en vente ?',
    );
    expect(render(screens[4])).toContain('Sur une échelle de 1 à 10');
  });
});
