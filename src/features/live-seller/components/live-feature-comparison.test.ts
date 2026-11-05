import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { LiveFeatureComparison } from '@/features/live-seller/components/live-feature-comparison';

// Jean-Guy, 05/11 — la grille du Live se lit du côté du vendeur, comme le Point marché : vert
// « Avantage pour vous », orange « Avantage pour lui » (attention), gris « Équivalent ».
describe('la grille du Live, du côté du vendeur', () => {
  it('« Avantage pour vous » en vert, « Avantage pour lui » en orange', () => {
    const html = renderToStaticMarkup(
      createElement(LiveFeatureComparison, {
        items: [
          {
            criterion: 'surface',
            subjectValue: '210 m²',
            comparableValue: '200 m²',
            comparisonStatus: 'competitor_weakness',
            displayLabel: 'Surface',
          },
          {
            criterion: 'outdoor',
            subjectValue: 'Non',
            comparableValue: 'Oui',
            comparisonStatus: 'competitor_advantage',
            displayLabel: 'Extérieur',
          },
        ],
      }),
    );
    const card = (label: string) =>
      html.match(new RegExp(`<div class="([^"]*)"><dt[^>]*>${label}<`))?.[1] ?? '';
    expect(card('Surface')).toContain('emerald');
    expect(card('Extérieur')).toContain('amber');
    expect(html).toContain('Avantage pour vous');
    expect(html).toContain('Avantage pour lui');
    expect(html).toContain('avantage pour vous');
    expect(html).not.toContain('Faiblesse');
  });
});
