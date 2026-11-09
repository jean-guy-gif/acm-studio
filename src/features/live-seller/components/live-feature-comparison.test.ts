import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { LiveFeatureComparison } from '@/features/live-seller/components/live-feature-comparison';

// Jean-Guy, 05/11 — la grille du Live se lit du côté du vendeur, comme le Point marché : vert
// « Avantage pour vous », orange « Avantage pour lui » (attention), gris « Équivalent ».
// Mission 148 — une bande de pastilles : le libellé dit « · pour vous » / « · pour lui », jamais la
// couleur seule (M129).
describe('la grille du Live, du côté du vendeur', () => {
  it('« pour vous » en vert, « pour lui » en orange, « équivalent » en gris sans mot', () => {
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
            criterion: 'rooms',
            subjectValue: '5',
            comparableValue: '5',
            comparisonStatus: 'same',
            displayLabel: 'Pièces',
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
      html.match(new RegExp(`class="([^"]*)"><dt[^>]*>${label}[ ·<]`))?.[1] ?? '';
    expect(card('Surface')).toContain('emerald');
    expect(card('Extérieur')).toContain('amber');
    expect(card('Pièces')).toContain('zinc');
    // Le statut n'est jamais coupé : il reste entier, d'un bloc.
    expect(html).toMatch(/Surface<span class="whitespace-nowrap"> · pour vous<\/span>/);
    expect(html).toMatch(/Extérieur<span class="whitespace-nowrap"> · pour lui<\/span>/);
    expect(html).not.toContain('truncate');
    expect(html).toMatch(/Pièces<\/dt>/);
    expect(html).toContain('avantage pour vous');
    expect(html).not.toContain('Faiblesse');
  });
});
