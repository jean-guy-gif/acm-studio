import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { LivePageClosing } from '@/features/live-seller/components/live-page-closing';

// Mission 116 — sur l'écran qui suit la Conclusion, le prix de commercialisation prend la couleur
// de son écart à l'analyse du conseiller : titre et montant colorés, le libellé à côté du titre.
// Sans analyse du conseiller (M109), ni couleur ni libellé ; sans prix, rien.
const render = (agreedPrice: number | null, advisorAnalysis: number | null) =>
  renderToStaticMarkup(
    createElement(LivePageClosing, {
      agreedPrice,
      hasAgreedPrice: agreedPrice != null,
      advisorAnalysis,
      score: null,
      missing: '',
      onScore: () => undefined,
      onMissingChange: () => undefined,
    }),
  );

describe('le prix de commercialisation en couleur', () => {
  it('vert, orange, rouge : titre et montant colorés, le libellé à côté du titre', () => {
    const cases: [number, string, string][] = [
      [419_000, 'green', 'Prix aligné sur le marché'],
      [420_000, 'orange', 'Proche du marché'],
      [440_000, 'red', 'Éloigné du marché'],
    ];
    for (const [price, tone, label] of cases) {
      const html = render(price, 400_000);
      expect(html).toContain(`data-alignment="${tone}"`);
      expect(html).toContain(`data-testid="price-alignment"`);
      expect(html).toContain(label);
      // Le titre et le montant portent la classe de la couleur, lisible sur la scène sombre aussi.
      const colour = {
        green: 'text-emerald-700 stage:text-emerald-300',
        orange: 'text-amber-700 stage:text-amber-300',
        red: 'text-red-700 stage:text-red-300',
      }[tone];
      expect(html.split(colour!).length - 1).toBeGreaterThanOrEqual(3);
      expect(html).toContain('Prix de commercialisation');
    }
  });

  it('sans analyse du conseiller : le prix, sans couleur ni libellé', () => {
    const html = render(419_000, null);
    expect(html).toContain('data-alignment=""');
    expect(html).not.toContain('data-testid="price-alignment"');
    expect(html).not.toMatch(/aligné|Proche du marché|Éloigné/);
    expect(html).toContain('Prix de commercialisation');
  });

  it('sans prix de commercialisation : rien', () => {
    const html = render(null, 400_000);
    expect(html).not.toContain('data-testid="agreed-price"');
    expect(html).not.toContain('Prix de commercialisation');
  });
});
