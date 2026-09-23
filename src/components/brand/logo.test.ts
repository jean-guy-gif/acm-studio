import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// next/image → simple <img> pour le test (on ne teste pas l'optimisation, mais le ratio).
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => createElement('img', props),
}));

import { Logo } from '@/components/brand/logo';

// Mission 55 §4 / §10.1 — un logo de ratio quelconque n'est JAMAIS déformé : la boîte
// s'adapte (hauteur imposée, largeur auto), l'image non (object-contain).
describe('Logo — ratio préservé, jamais déformé', () => {
  it('un logo agence, quel que soit son ratio, garde largeur auto + object-contain', () => {
    for (const src of ['https://x/wide-logo.svg', 'https://x/tall-logo.png']) {
      const html = renderToStaticMarkup(createElement(Logo, { lightSrc: src, className: 'h-10' }));
      const img = html.match(/<img[^>]*>/)?.[0] ?? '';
      expect(img).toContain('w-auto');
      expect(img).toContain('object-contain');
      expect(img).toContain('h-10'); // la BOÎTE impose la hauteur
      // Aucune largeur fixe qui écraserait le ratio.
      expect(img).not.toMatch(/\bwidth="\d/);
    }
  });

  it('sans logo agence, retombe sur le logo Start Academy (largeur auto)', () => {
    const html = renderToStaticMarkup(createElement(Logo, {}));
    const img = html.match(/<img[^>]*>/)?.[0] ?? '';
    expect(img).toContain('w-auto');
    expect(img).toMatch(/start-academy-logo/);
  });
});
