import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PriceBand } from '@/features/live-seller/components/live-page-analysis';
import type { MarketReading } from '@/features/live-seller/services/market-reading';

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
  droppedCount: null,
  medianDaysOnMarket: null,
  competitorPriceBasis: 'computed',
};

const band = (competitorPrice: number | null, dangerousId: string | null = null) =>
  renderToStaticMarkup(
    createElement(PriceBand, {
      reading: READING,
      startPrice: 380_000,
      revisedPrice: 340_000,
      competitorPrice,
      dangerousId,
    }),
  );

// Mission 104 — le « Prix des concurrents » est placé sur la bande, comme les prix du vendeur.
describe('la bande des prix', () => {
  it('place le « Prix des concurrents » parmi les biens vus, avec sa légende', () => {
    const html = band(330_000);
    expect(html).toContain('data-band-marker="competitors"');
    expect(html).toMatch(/Prix des concurrents\s: 330\s000\s€/);
    // 300 000 → 380 000 : 330 000 tombe à 37,5 % de la bande.
    expect(html).toMatch(/data-band-marker="competitors"[^>]*style="left:37.5%"/);
    expect(html).toContain('data-band-marker="start"');
    expect(html).toContain('data-band-marker="revised"');
  });

  it('sans « Prix des concurrents », pas de repère', () => {
    expect(band(null)).not.toContain('data-band-marker="competitors"');
  });
});

// Mission 115 — trois repères nommés : « Au début », « Après le marché », « Le plus dangereux
// selon vous » ; ce dernier au prix affiché du concurrent désigné, visible au premier regard.
describe('« Le plus dangereux selon vous » sur la bande', () => {
  it('nomme le concurrent désigné, par son prix affiché, libellé lisible sur la bande', () => {
    const html = band(330_000, 'c2');
    expect(html).toMatch(/data-band-marker="dangerous"[^>]*style="left:25%"/);
    expect(html).toContain('>Le plus dangereux selon vous</span>');
    expect(html).toMatch(/Le plus dangereux selon vous\s: 320\s000\s€/);
    expect(html).toMatch(/Au début\s: 380\s000\s€/);
    expect(html).toMatch(/Après le marché\s: 340\s000\s€/);
  });

  it('absent sans désignation, et pour un concurrent qui n’est pas sur la bande (un « Non »)', () => {
    expect(band(330_000)).not.toContain('data-band-marker="dangerous"');
    expect(band(330_000, 'non-revele')).not.toContain('data-band-marker="dangerous"');
    expect(band(330_000, 'non-revele')).not.toContain('Le plus dangereux selon vous');
  });
});
