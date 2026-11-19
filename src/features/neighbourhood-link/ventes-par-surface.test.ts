import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { createAcademiaRequest, readAcademiaView } from '@/features/academia/services/academia-api';
import { parsePropertyView } from '@/features/academia/services/property-view';
import { NeighbourhoodDocumentBlocks } from '@/features/neighbourhood-link/components/neighbourhood-document';
import { SalesTimeline } from '@/features/neighbourhood-link/components/neighbourhood-drawings';
import {
  parseNeighbourhoodBlocks,
  pickNeighbourhoodBlocks,
  readStoredNeighbourhood,
} from '@/features/neighbourhood-link/services/neighbourhood-blocks';
import { neighbourhoodView } from '@/features/neighbourhood-link/services/neighbourhood-view';
import {
  labelledSales,
  placeTimelineLabels,
  TIMELINE_ALL_PRICES_UP_TO,
} from '@/features/neighbourhood-link/services/sales-timeline';
import { CLIENT_TEXTS } from '@/lib/client-texts';
import clientView from '@/test-fixtures/academia-vue-bien-client.json';
import advisorView from '@/test-fixtures/academia-vue-bien.json';
import { FAKE_ACADEMIA_ID, fakeAcademia } from '@/test-fixtures/fake-academia';

// Correctifs 161 — la règle des ventes de Laurent (19/11) : le même type, une surface comprise dans
// la fourchette (la surface du bien à ±25 %, bornes comprises), toutes pièces confondues ; la vue
// rend la fourchette appliquée (`surfaceMin`, `surfaceMax`). ACM n'envoie ni l'une ni l'autre pour
// l'instant (décision de Jean-Guy, 19/11) ; chaque vente garde ses pièces ; avec beaucoup de ventes
// (37 sur le dossier de démonstration), la frise reste lisible et l'impression tient sur la page.

const NB = ' ';

// 37 ventes, comme la vue vendeur du dossier de démonstration d'Academia depuis le 19/11.
function manySales(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    mois: `${2021 + Math.floor(i / 7)}-${String((i % 12) + 1).padStart(2, '0')}`,
    type: 'maison',
    pieces: 3 + (i % 4),
    surface: 101 + ((i * 7) % 68),
    prix: 600_000 + ((i * 37_123) % 400_000),
    distance: 50 + ((i * 50) % 400),
    rue: i % 2 ? 'Chemin du Val Fleuri' : 'Boulevard Marechal Juin',
  }));
}
const withSales = (count: number) => ({
  ...clientView,
  blocs: {
    ...clientView.blocs,
    ventes: { ...clientView.blocs.ventes, anneau: 500, liste: manySales(count) },
  },
});

describe('le lecteur : la fourchette de surface, et rien d’autre de nouveau', () => {
  it('la vue vendeur et la vue du conseiller lisent surfaceMin et surfaceMax', () => {
    const blocks = parseNeighbourhoodBlocks(clientView)!;
    expect(blocks.ventes).toMatchObject({ surfaceMin: 101, surfaceMax: 169 });
    expect(parsePropertyView(advisorView)?.sales).toMatchObject({
      surfaceMin: 101,
      surfaceMax: 169,
    });
  });

  it('gardée dans l’instantané et relue telle quelle', () => {
    const kept = pickNeighbourhoodBlocks(parseNeighbourhoodBlocks(clientView)!, ['ventes']);
    const stored = readStoredNeighbourhood(JSON.parse(JSON.stringify(kept)));
    expect(stored.ventes).toMatchObject({ surfaceMin: 101, surfaceMax: 169 });
  });

  it('deux bornes de 9 à 1 000 m², la plus petite d’abord ; sinon aucune, jamais une seule', () => {
    const read = (surfaceMin: unknown, surfaceMax: unknown) =>
      parseNeighbourhoodBlocks({
        ...clientView,
        blocs: {
          ...clientView.blocs,
          ventes: { ...clientView.blocs.ventes, surfaceMin, surfaceMax },
        },
      })!.ventes;
    expect(read(80, 134)).toMatchObject({ surfaceMin: 80, surfaceMax: 134 });
    for (const [min, max] of [
      [134, 80],
      [100, 100],
      [5, 134],
      [80, 1200],
      [80, null],
      [null, 134],
      ['80', '134'],
    ]) {
      expect(read(min, max)).toMatchObject({ surfaceMin: null, surfaceMax: null });
    }
  });

  it('un champ inconnu du bloc des ventes ne passe pas', () => {
    const blocks = parseNeighbourhoodBlocks({
      ...clientView,
      blocs: {
        ...clientView.blocs,
        ventes: { ...clientView.blocs.ventes, piecesMin: 3, moyenne: 712_000 },
      },
    })!;
    expect(JSON.stringify(blocks.ventes)).not.toMatch(/piecesMin|moyenne|712000/);
  });
});

describe('ce qu’ACM envoie à Academia : ni surfaceMin ni surfaceMax', () => {
  it('le dossier : l’adresse, le type, les pièces et la surface, rien d’autre', async () => {
    const server = fakeAcademia();
    await createAcademiaRequest(
      {
        key: 'msk_test_0123456789',
        adresse: '4 chemin des Restanques Hautes, 06140 Vence',
        bien: { type: 'maison', pieces: 5, surface: 135 },
      },
      server.fetch,
    );
    const body = server.calls[0]?.body as { bien: Record<string, unknown> };
    expect(Object.keys(body.bien).sort()).toEqual(['pieces', 'surface', 'type']);
  });

  it('les vues : le type, les pièces (toujours exigées) et la surface', async () => {
    const server = fakeAcademia({ readView: [{ status: 200, body: advisorView }] });
    await readAcademiaView(
      'bien',
      'msk_test_0123456789',
      FAKE_ACADEMIA_ID,
      { type: 'maison', pieces: 5, surface: 135 },
      server.fetch,
    );
    const query = new URLSearchParams(server.calls[0]?.query ?? '');
    expect([...query.keys()].sort()).toEqual(['pieces', 'surface', 'type']);
  });

  it('le faux serveur suit la règle des vues : une fourchette fausse ou sans pièces, 400', async () => {
    const server = fakeAcademia({ readView: [{ status: 200, body: advisorView }] });
    const base = `https://app.myacademia.ai/api/v1/dossiers/${FAKE_ACADEMIA_ID}`;
    const status = async (path: string) =>
      (await server.fetch(`${base}${path}`, { method: 'GET', headers: {} })).status;
    expect(await status('/bien?type=maison&surface=135')).toBe(400);
    expect(
      await status('/bien-client?type=maison&pieces=5&surface=135&surfaceMin=150&surfaceMax=120'),
    ).toBe(400);
    expect(await status('/bien?type=maison&pieces=5&surface=135&surfaceMin=5')).toBe(400);
    expect(await status('/bien?type=maison&pieces=5&surface=135&surfaceMax=1200')).toBe(400);
    expect(
      await status('/bien?type=maison&pieces=5&surface=135&surfaceMin=100&surfaceMax=170'),
    ).toBe(200);
  });

  it('le faux serveur suit la règle : une fourchette à l’envers ou hors bornes, 400', async () => {
    const server = fakeAcademia();
    const refused = await createAcademiaRequest(
      {
        key: 'msk_test_0123456789',
        adresse: '4 chemin des Restanques Hautes, 06140 Vence',
        bien: {
          type: 'maison',
          pieces: 5,
          surface: 135,
          surfaceMin: 150,
          surfaceMax: 120,
        } as never,
      },
      server.fetch,
    );
    expect(refused.ok).toBe(false);
  });
});

describe('beaucoup de ventes : la frise lisible, la page imprimée tenue', () => {
  const blocks37 = parseNeighbourhoodBlocks(withSales(37))!;

  it('37 ventes lues, le titre dit le type et la fourchette', () => {
    expect(blocks37.ventes?.list).toHaveLength(37);
    expect(neighbourhoodView(blocks37, 'ventes', CLIENT_TEXTS.fr, 'fr')).toMatchObject({
      headline: `37 maisons de 101 à 169${NB}m² vendues autour de chez vous depuis 2021`,
      legend: CLIENT_TEXTS.fr.quartier.sales.legendMany,
    });
  });

  it('jusqu’à 12 ventes, chaque prix ; au-delà, le plus bas, le plus haut et le plus récent', () => {
    const few = manySales(12).map((sale) => ({ month: sale.mois, price: sale.prix }));
    expect(labelledSales(few).size).toBe(12);
    const many = manySales(37).map((sale) => ({ month: sale.mois, price: sale.prix }));
    const kept = [...labelledSales(many)];
    const prices = many.map((sale) => sale.price);
    expect(kept.map((i) => many[i]!.price)).toEqual(
      expect.arrayContaining([Math.min(...prices), Math.max(...prices)]),
    );
    const latest = [...many].sort((a, b) => b.month.localeCompare(a.month))[0]!.month;
    expect(kept.some((i) => many[i]!.month === latest)).toBe(true);
    expect(kept.length).toBeLessThanOrEqual(3);
    expect(TIMELINE_ALL_PRICES_UP_TO).toBe(12);
  });

  it('jamais deux prix l’un sur l’autre, ni sur un point, même à 37 ventes serrées', () => {
    for (const count of [5, 12, 13, 37, 50]) {
      const points = Array.from({ length: count }, (_, i) => ({
        x: 40 + (i * 530) / count,
        y: 50 + ((i * 53) % 120),
        text: `${600 + i} k€`,
      }));
      const placed = placeTimelineLabels(points, new Set(points.map((_, i) => i)), 620, 176);
      // Jamais hors du dessin (le prix le plus bas, sur le premier point, sortait à gauche).
      placed.forEach((label) => {
        const w = Math.max(40, label.text.length * 9.5);
        const x0 =
          label.anchor === 'start'
            ? label.x
            : label.anchor === 'end'
              ? label.x - w
              : label.x - w / 2;
        expect(x0).toBeGreaterThanOrEqual(0);
        expect(x0 + w).toBeLessThanOrEqual(620);
        // Jamais sur l'axe des années.
        expect(label.y + 2).toBeLessThanOrEqual(176);
      });
      const box = (label: (typeof placed)[number]) => {
        const w = Math.max(40, label.text.length * 9.5);
        const x0 =
          label.anchor === 'start'
            ? label.x
            : label.anchor === 'end'
              ? label.x - w
              : label.x - w / 2;
        return { x0, x1: x0 + w, y0: label.y - 14, y1: label.y + 2 };
      };
      placed.forEach((a, i) =>
        placed.forEach((b, j) => {
          if (i >= j) return;
          const p = box(a);
          const q = box(b);
          expect(p.x0 < q.x1 && q.x0 < p.x1 && p.y0 < q.y1 && q.y0 < p.y1).toBe(false);
        }),
      );
    }
  });

  it('la frise à 37 ventes : des points plus petits, trois prix écrits au plus', () => {
    const view = neighbourhoodView(blocks37, 'ventes', CLIENT_TEXTS.fr, 'fr');
    if (view?.kind !== 'sales') throw new Error('vue des ventes attendue');
    const svg = renderToStaticMarkup(createElement(SalesTimeline, { sales: view.timeline }));
    expect(svg.match(/<circle/g)).toHaveLength(37);
    expect(svg).toContain('r="5"');
    expect((svg.match(/font-weight="700"/g) ?? []).length).toBeLessThanOrEqual(3);
  });

  it('au-delà de 12 ventes, le prix le plus bas, le plus haut et le plus récent sont bien écrits', () => {
    for (const count of [13, 20, 37, 50]) {
      const blocks = parseNeighbourhoodBlocks(withSales(count))!;
      const view = neighbourhoodView(blocks, 'ventes', CLIENT_TEXTS.fr, 'fr');
      if (view?.kind !== 'sales') throw new Error('vue des ventes attendue');
      const svg = renderToStaticMarkup(createElement(SalesTimeline, { sales: view.timeline }));
      const written = [...svg.matchAll(/font-weight="700"[^>]*>([^<]+)</g)].map((m) => m[1]);
      const byPrice = [...view.timeline].sort((a, b) => a.price - b.price);
      const latest = [...view.timeline].sort((a, b) => b.month.localeCompare(a.month))[0]!;
      expect(written, `${count} ventes`).toEqual(
        expect.arrayContaining([byPrice[0]!.label, byPrice.at(-1)!.label, latest.label]),
      );
    }
  });

  it('l’impression : au-delà de 12 ventes, une ligne par vente dans un tableau, les pièces dites', () => {
    const html = renderToStaticMarkup(
      createElement(NeighbourhoodDocumentBlocks, {
        content: {
          blocks: readStoredNeighbourhood(pickNeighbourhoodBlocks(blocks37, ['ventes'])),
          keys: ['ventes'],
          takenAt: '2026-11-19T08:00:00Z',
        },
        only: ['ventes'],
        language: 'fr',
      }),
    );
    expect(html).toContain('data-testid="neighbourhood-sales-compact"');
    expect(html.match(/<tr class="border-b border-zinc-200/g)).toHaveLength(37);
    expect(html).toContain('>Pièces</th>');
    const eleven = renderToStaticMarkup(
      createElement(NeighbourhoodDocumentBlocks, {
        content: {
          blocks: readStoredNeighbourhood(
            pickNeighbourhoodBlocks(parseNeighbourhoodBlocks(clientView)!, ['ventes']),
          ),
          keys: ['ventes'],
          takenAt: '2026-11-19T08:00:00Z',
        },
        only: ['ventes'],
        language: 'fr',
      }),
    );
    expect(eleven).not.toContain('neighbourhood-sales-compact');
  });
});
