import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { LiveGuessGap } from '@/features/live-seller/components/live-guess-gap';

// Mission 148 B (Jean-Guy, 08/11) — sur les cartes du plus dangereux, l'écart en pourcentage reste
// écrit à côté de la couleur : jamais la couleur seule.
const inline = (guess: number | null, listedPrice: number) =>
  renderToStaticMarkup(createElement(LiveGuessGap, { guess, listedPrice, variant: 'inline' }));

describe('la réponse du vendeur sur une carte', () => {
  it('écrit l’écart en pourcentage à côté de la couleur', () => {
    const html = inline(678_000, 729_000);
    expect(html).toContain('data-guess-gap="orange"');
    expect(html).toMatch(/7\s%\sen dessous du prix affiché/);
    expect(html).toMatch(/Votre réponse\s:\s678\s000\s€/);
    expect(inline(755_000, 740_000)).toMatch(/2\s%\sau-dessus du prix affiché/);
    expect(inline(861_000, 749_000)).toContain('data-guess-gap="red"');
  });

  it('une réponse exacte se dit, une réponse à 0 € n’a ni couleur ni écart', () => {
    expect(inline(740_000, 740_000)).toContain('le prix affiché');
    const zero = inline(0, 740_000);
    expect(zero).toContain('data-guess-gap="none"');
    expect(zero).not.toMatch(/dessous|dessus/);
    expect(inline(null, 740_000)).toBe('');
  });
});
