import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PriceBand } from '@/features/live-seller/components/live-page-analysis';
import type { MarketReading } from '@/features/live-seller/services/market-reading';

const READING: MarketReading = {
  calculationCount: 3,
  revealedCount: 3,
  prices: [300_000, 320_000, 360_000],
  lowestPrice: 300_000,
  highestPrice: 360_000,
  medianPrice: 320_000,
  droppedCount: null,
  medianDaysOnMarket: null,
  competitorPriceBasis: 'computed',
};

const band = (competitorPrice: number | null) =>
  renderToStaticMarkup(
    createElement(PriceBand, {
      reading: READING,
      startPrice: 380_000,
      revisedPrice: 340_000,
      competitorPrice,
    }),
  );

// Mission 104 — le « Prix des concurrents » est placé sur la bande, comme les prix du vendeur.
describe('la bande des prix', () => {
  it('place le « Prix des concurrents » parmi les biens vus, avec sa légende', () => {
    const html = band(330_000);
    expect(html).toContain('data-band-marker="competitors"');
    expect(html).toMatch(/Prix des concurrents : 330\s000\s€/);
    // 300 000 → 380 000 : 330 000 tombe à 37,5 % de la bande.
    expect(html).toMatch(/data-band-marker="competitors"[^>]*style="left:37.5%"/);
    expect(html).toContain('data-band-marker="start"');
    expect(html).toContain('data-band-marker="revised"');
  });

  it('sans « Prix des concurrents », pas de repère', () => {
    expect(band(null)).not.toContain('data-band-marker="competitors"');
  });
});
