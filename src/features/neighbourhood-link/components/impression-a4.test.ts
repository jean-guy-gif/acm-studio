import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { NeighbourhoodDocumentBlocks } from '@/features/neighbourhood-link/components/neighbourhood-document';
import { DistanceRings } from '@/features/neighbourhood-link/components/neighbourhood-drawings';
import {
  NEIGHBOURHOOD_BLOCK_KEYS,
  parseNeighbourhoodBlocks,
} from '@/features/neighbourhood-link/services/neighbourhood-blocks';
import { TIER_CLASSES } from '@/features/market-update/components/price-ranking';
import exempleBienClient from '@/test-fixtures/academia-exemple-bien-client.json';
import clientView from '@/test-fixtures/academia-vue-bien-client.json';

// Mission 162 — le PDF propre à imprimer (constat du 19/11, `missions/maquettes/M162-avant`) :
// un titre de section s'imprime avec son premier bloc, jamais seul en bas de page ; les ventes
// nombreuses gardent leur titre et leur frise ensemble, le tableau pouvant continuer, sans titre
// doublé ; le tableau en 9 pt ; dans les anneaux, aucun texte posé sur un autre ; le tiers
// « danger » hachuré à l'impression.
const contentOf = (json: unknown) => ({
  blocks: parseNeighbourhoodBlocks(json)!,
  keys: [...NEIGHBOURHOOD_BLOCK_KEYS],
  takenAt: '2026-11-19T10:00:00Z',
});
const render = (json: unknown, only: string[], extra: Record<string, unknown> = {}) =>
  renderToStaticMarkup(
    createElement(NeighbourhoodDocumentBlocks, {
      content: contentOf(json),
      only: only as never,
      language: 'fr',
      ...extra,
    }),
  );
const HEADING = createElement('h2', { 'data-testid': 'section' }, 'Votre quartier');

describe('le titre de section ne reste jamais seul en bas de page', () => {
  it('il est imprimé dans le même groupe insécable que le premier bloc', () => {
    const html = render(clientView, ['urbanisme', 'risques'], { heading: HEADING });
    const group = html.indexOf('break-inside-avoid');
    expect(group).toBeGreaterThan(-1);
    expect(group).toBeLessThan(html.indexOf('data-testid="section"'));
    expect(html.indexOf('data-testid="section"')).toBeLessThan(html.indexOf('L’urbanisme'));
  });

  it('les ventes nombreuses : le titre et la frise ensemble, le tableau à la suite ; un seul titre', () => {
    const html = render(exempleBienClient, ['ventes'], {
      heading: createElement('h2', { 'data-testid': 'section' }, 'Les ventes réelles'),
      blockTitles: false,
    });
    expect(html.match(/Les ventes réelles/g)).toHaveLength(1);
    const avoid = html.indexOf('break-inside-avoid');
    const table = html.indexOf('data-testid="neighbourhood-sales-compact"');
    expect(avoid).toBeLessThan(html.indexOf('data-testid="section"'));
    expect(table).toBeGreaterThan(html.indexOf('<svg'));
    // Le tableau n'est pas dans un groupe insécable : il peut continuer sur la page suivante.
    const before = html.slice(0, table);
    const opened = (before.match(/<div class="[^"]*break-inside-avoid/g) ?? []).length;
    const groupEnd = before.lastIndexOf('</svg></div></div>');
    expect(opened).toBe(1);
    expect(groupEnd).toBeGreaterThan(avoid);
    expect(html).toContain('text-xs leading-[1.3]');
    expect(html).not.toContain('text-[0.65rem]');
  });

  it('sans titre de section, rien ne change', () => {
    const html = render(clientView, ['urbanisme']);
    expect(html).toContain('L’urbanisme');
    expect(html).not.toContain('data-testid="section"');
  });
});

describe('les anneaux imprimés', () => {
  it('la distance, le nombre et son mot ne se recouvrent pas', () => {
    const html = renderToStaticMarkup(
      createElement(DistanceRings, {
        inner: { hit: false, range: '0 à 40 m', count: 'aucun' },
        outer: { hit: true, range: '40 à 300 m', count: '3', label: 'éléments relevés' },
        center: 'Votre bien',
        paper: true,
      } as never),
    );
    const boxes = [...html.matchAll(/<rect x="[^"]+" y="([^"]+)" width="[^"]+" height="([^"]+)"/g)]
      .map((m) => ({ top: Number(m[1]), bottom: Number(m[1]) + Number(m[2]) }))
      .sort((a, b) => a.top - b.top);
    expect(boxes.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < boxes.length; i++) {
      expect(boxes[i]!.top).toBeGreaterThanOrEqual(boxes[i - 1]!.bottom - 0.5);
    }
  });
});

describe('le classement en noir et blanc', () => {
  it('le tiers « danger » est hachuré à l’impression, les autres non', () => {
    expect(TIER_CLASSES.red.barMark).toMatch(/^print:bg-\[image:repeating-linear-gradient/);
    expect(TIER_CLASSES.red.cellMark).toMatch(/^print:bg-\[image:repeating-linear-gradient/);
    expect(TIER_CLASSES.green.barMark).toBe('');
    expect(TIER_CLASSES.orange.barMark).toBe('');
  });
});
