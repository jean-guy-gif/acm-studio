import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/meeting-conclusion/components/live-commercialization-price', () => ({
  LiveCommercializationPrice: () => null,
}));

import { LivePageConclusion } from '@/features/live-seller/components/live-page-conclusion';
import type { AuthorizedAdvisorRange } from '@/features/live-seller/services/project-live-for-seller';
import { NARROW_NBSP, NBSP } from '@/lib/typography/french-spacing';

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

// Jean-Guy (28/11) — la justification que tape le conseiller suit la règle des espaces, à
// l'affichage seulement.
describe('la justification du conseiller, à la Conclusion du Live', () => {
  it('ne coupe pas sa ligne devant « : » ni « ? », et le texte reçu ne change pas', () => {
    const advisorRange = range(true);
    const decision = (advisorRange as unknown as { advisorDecision: { justification: string } })
      .advisorDecision;
    decision.justification = 'Trois biens proches : le vôtre a un balcon ?';
    const html = renderToStaticMarkup(
      createElement(LivePageConclusion, {
        projectId: 'p1',
        summary: null,
        advisorRange,
        dangerous: null,
      }),
    );
    expect(html).toContain(`Trois biens proches${NBSP}: le vôtre a un balcon${NARROW_NBSP}?`);
    expect(decision.justification).toBe('Trois biens proches : le vôtre a un balcon ?');
  });
});
