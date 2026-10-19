import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/meeting-conclusion/components/live-commercialization-price', () => ({
  LiveCommercializationPrice: () => null,
}));

import { LivePageConclusion } from '@/features/live-seller/components/live-page-conclusion';
import type { AuthorizedAdvisorRange } from '@/features/live-seller/services/project-live-for-seller';

// Mission 109 — sans décision de prix enregistrée, l'écran du vendeur n'affiche aucun « Prix des
// concurrents » : le calcul brut n'a pas été validé par le conseiller.
const range = (decided: boolean): AuthorizedAdvisorRange =>
  ({
    competitiveMarketCentral: 305_000,
    priceGaps: {},
    advisorDecision: decided
      ? {
          advisorPrice: 330_000,
          sellerPrice: null,
          advisorComparativeMarketPrice: null,
          justification: null,
        }
      : null,
    marketReading: {},
  }) as unknown as AuthorizedAdvisorRange;

const render = (decided: boolean) =>
  renderToStaticMarkup(
    createElement(LivePageConclusion, {
      projectId: 'p1',
      summary: null,
      advisorRange: range(decided),
      dangerous: null,
    }),
  );

describe('la Conclusion du Live, sans décision de prix', () => {
  it('n’affiche aucun « Prix des concurrents », ni le calcul brut', () => {
    const html = render(false);
    expect(html).not.toContain('Prix des concurrents');
    expect(html.replace(/\s/g, '')).not.toContain('305000');
  });

  it('avec une décision, le prix décidé', () => {
    const html = render(true);
    expect(html).toContain('Prix des concurrents');
    expect(html.replace(/\s| | /g, '')).toContain('330000');
  });
});
