import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { DemoBanner } from '@/features/demo/components/demo-banner';
import { DemoWatermark } from '@/features/demo/components/demo-watermark';
import { DEMO_BANNER_MESSAGE, DEMO_WATERMARK } from '@/features/demo/constants';

// Mission 114 (A1.2, B.12) — une démonstration est identifiée comme telle (CLAUDE.md) : le bandeau
// en haut de l'espace conseiller, la note discrète du Live, et le filigrane « DÉMONSTRATION »
// sur CHAQUE page imprimée — courriers, tournée, synthèse au vendeur, lien public compris. Rien
// de ce qu'une démo produit ne peut sortir comme un vrai document. Hors démo, rien n'en parle.

const read = (...parts: string[]) => readFileSync(join(process.cwd(), 'src', ...parts), 'utf8');

describe('le bandeau et le filigrane de la démonstration', () => {
  it('ne rendent rien hors de l’agence de démonstration', () => {
    expect(renderToStaticMarkup(createElement(DemoBanner, { isDemo: false }))).toBe('');
    expect(renderToStaticMarkup(createElement(DemoWatermark, { isDemo: false }))).toBe('');
  });

  it('le bandeau dit « données fictives », à l’écran seulement', () => {
    const html = renderToStaticMarkup(createElement(DemoBanner, { isDemo: true }));
    expect(html).toContain(DEMO_BANNER_MESSAGE);
    expect(html).toContain('print:hidden');
  });

  it('le filigrane est un calque fixe, répété sur chaque feuille, qui ne gêne ni lecture ni clic', () => {
    const html = renderToStaticMarkup(createElement(DemoWatermark, { isDemo: true }));
    expect(html).toContain(DEMO_WATERMARK);
    expect(html).toContain('fixed');
    expect(html).toContain('pointer-events-none');
    expect(html).toContain('aria-hidden');
  });
});

describe('où la démonstration se voit, d’après le repère de l’agence lu en base', () => {
  it('l’espace conseiller : le bandeau et le drapeau des écrans, sur `agencies.is_demo`', () => {
    const layout = read('app', '(protected)', 'layout.tsx');
    expect(layout).toContain('const isDemo = agency?.is_demo === true;');
    expect(layout).toContain('<DemoModeProvider isDemo={isDemo}>');
    expect(layout).toContain('<DemoBanner isDemo={isDemo} />');
  });

  it('chaque page imprimée : le groupe « impression » entier porte le filigrane', () => {
    const layout = read('app', '(print)', 'layout.tsx');
    expect(layout).toContain('<DemoWatermark isDemo={agency?.is_demo === true} />');
    // Les pages du groupe : courriers (un, en lot), tournée, prospection du dossier, synthèse.
    for (const page of [
      'prospection/tournee/page.tsx',
      'prospection/courriers/page.tsx',
      'builder/[projectId]/prospection/page.tsx',
      'builder/[projectId]/prospection/[comparableId]/page.tsx',
      'builder/[projectId]/synthese/page.tsx',
    ]) {
      expect(() => read('app', '(print)', ...page.split('/'))).not.toThrow();
    }
  });

  it('le lien public de la synthèse : le filigrane suit l’agence du dossier', () => {
    const page = read('app', 'synthese', '[token]', 'page.tsx');
    expect(page).toContain('<DemoWatermark isDemo={synthesis.agency.isDemo} />');
    const loader = read('features', 'seller-synthesis', 'queries', 'load-seller-synthesis.ts');
    expect(loader).toContain("select('name, is_demo')");
  });

  it('le Live : une note discrète, scène et écrans neutres, jamais un bandeau', () => {
    for (const file of ['live-comparative-shell.tsx', 'live-neutral-screen.tsx']) {
      const source = read('features', 'live-seller', 'components', file);
      expect(source).toContain('data-testid="demo-live-note"');
      expect(source).toContain('{DEMO_BANNER_MESSAGE}');
      expect(source).not.toContain('DemoBanner');
    }
    const page = read('app', '(stage)', 'live', '[projectId]', 'page.tsx');
    expect(page).toContain('isDemo={agency?.is_demo === true}');
  });
});
