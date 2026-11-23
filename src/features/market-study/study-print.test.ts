import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  MarketStudyDocument,
  SalesFrise,
} from '@/features/market-study/components/market-study-document';
import {
  buildMarketStudy,
  type MarketStudyCompetitorRow,
  type MarketStudyInput,
} from '@/features/market-study/services/build-market-study';
import {
  PRINT_GAP_MM,
  PRINT_ROOM_MM,
  PRINT_SAFETY_MM,
  paginateUnits,
  type PrintUnit,
} from '@/features/market-study/services/study-print';
import {
  NEIGHBOURHOOD_BLOCK_KEYS,
  parseNeighbourhoodBlocks,
} from '@/features/neighbourhood-link/services/neighbourhood-blocks';
import clientView from '@/test-fixtures/academia-vue-bien-client.json';

// Correctifs 163 — l'Étude imprimée (retours de Jean-Guy du 23/11 sur les PDF de M. Lefebvre et de
// Mme Garcia) : des pages pleines, où un bloc ne passe à la page suivante que s'il n'y tient pas ; un
// numéro de page écrit dans la page elle-même, qu'aucun navigateur ne peut omettre ; des renvois du
// résumé qui tombent sur la bonne page ; jamais un prix sur l'axe des années ; des libellés qui
// suivent ce qui est réellement montré. L'écran et le lien public ne changent pas.

const MADE_AT = '2026-11-19T10:00:00.000Z';

function competitor(
  id: string,
  order: number,
  price: number,
  extra: Partial<MarketStudyCompetitorRow> = {},
): MarketStudyCompetitorRow {
  return {
    id,
    price,
    property_type: 'house',
    rooms_count: 7,
    bedrooms_count: 4,
    surface_area: 210,
    city: 'Mougins',
    district: 'Les Collines',
    display_order: order,
    created_at: '2026-10-01T09:00:00.000Z',
    energy_rating: 'B',
    ges_rating: 'A',
    general_condition: 'excellent',
    outdoor_spaces: ['terrace', 'garden'],
    parking_types: ['garage'],
    exposure: 'south',
    photo_urls: [`https://cdn.portail.test/${id}.jpg`],
    price_drop_amount: null,
    price_drop_percentage: null,
    days_on_market: null,
    listing_published_at: '2026-09-15T00:00:00.000Z',
    listing_gone_at: null,
    synthesis_hide_photo: false,
    ...extra,
  };
}

// Le dossier de M. Lefebvre tel que Jean-Guy l'a imprimé : cinq concurrents, dont deux aux
// nombreuses différences (le concurrent 3 en a huit), un prix retenu ensemble, pas de quartier.
function lefebvre(extra: Partial<MarketStudyInput> = {}): MarketStudyInput {
  return {
    madeAt: MADE_AT,
    sellerName: 'M. Lefebvre',
    property: {
      property_type: 'Maison',
      city: 'Mougins',
      district: 'Les Collines',
      surface_area: 210,
      land_area: 1800,
      rooms_count: 7,
      bedrooms_count: 4,
      energy_rating: 'B',
      ges_rating: 'A',
      general_condition: 'excellent',
      outdoor_spaces: ['terrace', 'garden'],
      parking_types: ['garage'],
      exposure: 'south',
    },
    coverPhotoUrl: null,
    competitors: [
      competitor('c1', 0, 1690000, {
        surface_area: 225,
        bedrooms_count: 5,
        ges_rating: 'B',
        exposure: 'south_west',
      }),
      competitor('c2', 1, 1699000, { surface_area: 212 }),
      competitor('c3', 2, 1475000, {
        surface_area: 160,
        rooms_count: 5,
        bedrooms_count: 3,
        energy_rating: 'E',
        ges_rating: 'E',
        general_condition: 'to_renovate',
        outdoor_spaces: ['garden'],
        exposure: 'west',
      }),
      competitor('c4', 3, 1650000, { surface_area: 205 }),
      competitor('c5', 4, 1480000, {
        surface_area: 180,
        rooms_count: 6,
        bedrooms_count: 3,
        energy_rating: 'D',
        ges_rating: 'D',
        general_condition: 'good',
      }),
    ],
    studyPrice: { amount: 1639500, proposed: false },
    agency: {
      name: 'Agence Horizon Côte d’Azur',
      logoUrl: null,
      postalAddress: '70 rue du Bonheur, 06140 Vence',
      professionalCard: 'CPI 0000 0000 000 000 000',
      professionalCardIssuer: 'CCI Nice Côte d’Azur',
      financialGuarantee: null,
      advisorName: 'Claire Dumas',
      advisorPhone: '06 39 98 00 01',
      advisorEmail: 'claire.dumas@example.com',
      advisorPhotoUrl: null,
      advisorQr: null,
    },
    brandDeclarations: '',
    quartier: null,
    ...extra,
  };
}

const quartier = {
  blocks: parseNeighbourhoodBlocks(clientView)!,
  keys: [...NEIGHBOURHOOD_BLOCK_KEYS],
  takenAt: '2026-11-17T18:00:00Z',
};

// Le dossier de Mme Garcia : prête, sans prix, tous les blocs du quartier cochés, ventes comprises.
function garcia(extra: Partial<MarketStudyInput> = {}): MarketStudyInput {
  const base = lefebvre();
  return {
    ...base,
    sellerName: 'Mme Garcia',
    property: { ...base.property!, city: 'Vence', surface_area: 135, rooms_count: 5 },
    competitors: base.competitors.map((row) => ({ ...row, city: 'Vence' })),
    studyPrice: null,
    quartier,
    ...extra,
  };
}

export const CASES: [string, MarketStudyInput][] = [
  ['M. Lefebvre', lefebvre()],
  ['Mme Garcia', garcia()],
  ['Mme Garcia, en anglais', { ...garcia(), language: 'en' }],
  ['M. Lefebvre, avec le quartier', lefebvre({ quartier })],
  ['un seul concurrent', lefebvre({ competitors: lefebvre().competitors.slice(0, 1) })],
];

const firstGroup = (units: PrintUnit[]): number => {
  let height = 0;
  for (const unit of units) {
    height += unit.mm;
    if (!unit.keepWithNext) break;
  }
  return height;
};

describe('l’Étude imprimée : des pages pleines', () => {
  it.each(CASES)('%s : un bloc ne passe à la page suivante que s’il n’y tient pas', (_, data) => {
    const pages = buildMarketStudy(data).story.print.pages;
    expect(pages[0]!.units.map((unit) => unit.kind)).toEqual(['cover']);
    for (let i = 1; i < pages.length; i += 1) {
      const page = pages[i]!;
      // Rien ne déborde d'une feuille, sauf un bloc plus haut qu'une page à lui seul.
      // (le dernier bloc n'a pas d'espace après lui).
      if (page.units.length > 1) expect(page.mm - PRINT_GAP_MM).toBeLessThanOrEqual(PRINT_ROOM_MM);
      // La page suivante commence par un bloc qui n'y tenait pas.
      const next = pages[i + 1];
      if (next)
        expect(page.mm + firstGroup(next.units) - PRINT_GAP_MM).toBeGreaterThan(
          PRINT_ROOM_MM - PRINT_SAFETY_MM,
        );
      // Un titre de chapitre n'est jamais seul en bas d'une page.
      expect(page.units.at(-1)!.keepWithNext ?? false).toBe(false);
    }
  });

  it('M. Lefebvre : le résumé partage sa page avec le début des biens en vente', () => {
    const pages = buildMarketStudy(lefebvre()).story.print.pages;
    const second = pages[1]!.units.map((unit) => unit.kind);
    expect(second.slice(0, 3)).toEqual(['summary-head', 'summary-items', 'summary-how']);
    expect(second).toContain('band');
    expect(second).toContain('card');
  });

  it('M. Lefebvre : les fiches se suivent, l’avis ne renvoie jamais une fiche plus loin', () => {
    const pages = buildMarketStudy(lefebvre()).story.print.pages;
    // Sept pages avant ; moins maintenant, et aucune page n'a une seule fiche suivie d'un blanc
    // alors que la fiche suivante y tenait.
    expect(pages.length).toBeLessThan(7);
    const cards = pages.flatMap((page, index) =>
      page.units.filter((unit) => unit.kind === 'card').map(() => index),
    );
    expect(cards).toHaveLength(5);
  });

  it('chaque chapitre commence là où le résumé le dit', () => {
    for (const [, data] of CASES) {
      const story = buildMarketStudy(data).story;
      for (const item of story.summary.items) {
        const page = story.print.pages.findIndex((p) =>
          p.units.some((unit) => unit.kind === 'band' && unit.chapter === item.chapter),
        );
        expect(item.page).toMatch(new RegExp(`\\b${page + 1}$`));
      }
    }
  });

  it('le paginateur pur : un titre reste avec son premier bloc', () => {
    const units: PrintUnit[] = [
      { kind: 'card', index: 0, mm: 200 },
      { kind: 'band', chapter: 'sales', mm: 50, keepWithNext: true },
      { kind: 'sales-frise', mm: 60 },
    ];
    expect(paginateUnits(units, 270).map((page) => page.units.length)).toEqual([1, 2]);
    expect(
      paginateUnits(
        [
          { kind: 'card', index: 0, mm: 100 },
          { kind: 'card', index: 1, mm: 100 },
          { kind: 'card', index: 2, mm: 100 },
        ],
        270,
      ).map((page) => page.units.length),
    ).toEqual([2, 1]);
  });
});

describe('l’Étude imprimée : un numéro dans chaque page', () => {
  it('chaque page après la couverture dit « N / T », la couverture aucun', () => {
    const study = buildMarketStudy(lefebvre());
    const html = renderToStaticMarkup(createElement(MarketStudyDocument, { document: study }));
    const total = study.story.print.pages.length;
    const pages = [...html.matchAll(/data-print-page="(\d+)"/g)].map((match) => Number(match[1]));
    expect(pages).toEqual(Array.from({ length: total }, (_, i) => i + 1));
    const footers = [
      ...html.matchAll(/data-print-footer="[^"]*">([^<]*(?:<[^>]+>[^<]*)*?)<\/footer>/g),
    ];
    expect(footers).toHaveLength(total - 1);
    const numbers = [...html.matchAll(/data-print-number="">(\d+) \/ (\d+)</g)].map((match) => [
      Number(match[1]),
      Number(match[2]),
    ]);
    expect(numbers).toEqual(Array.from({ length: total - 1 }, (_, i) => [i + 2, total]));
    // Plus de numéro confié au navigateur : il ne l'imprimait pas chez Jean-Guy.
    expect(html).not.toContain('counter(page)');
  });
});

describe('la frise des ventes : jamais un prix sur l’axe des années', () => {
  it('le prix le plus bas et le plus haut s’écrivent au-dessus de l’axe', () => {
    const sales = buildMarketStudy(garcia()).story.sales!;
    for (const width of [640, 360]) {
      const svg = renderToStaticMarkup(createElement(SalesFrise, { sales, width, className: '' }));
      const axis = Number(/<line[^>]*y1="([\d.]+)"/.exec(svg)![1]);
      const labels = [...svg.matchAll(/<text data-price-label=""[^>]*\by="([\d.]+)"/g)].map(
        (match) => Number(match[1]),
      );
      expect(labels).toHaveLength(2);
      // Une ligne de 10 px se lit au-dessus de sa ligne de base : elle doit finir avant l'axe.
      for (const y of labels) expect(y).toBeLessThanOrEqual(axis - 4);
    }
  });
});

describe('les mots qui disent vrai', () => {
  it('« les six ventes qui ressemblent le plus à votre maison », et ce qui les rapproche', () => {
    const story = buildMarketStudy(garcia()).story;
    const sales = story.sales!;
    expect(sales.tableTitle).toBe('Les six ventes qui ressemblent le plus à votre maison');
    expect(sales.tableNote).toMatch(
      /^Choisies d’abord sur le nombre de pièces, puis sur la surface : .*pièces?.*m²\.$/,
    );
    const item = story.summary.items.find((entry) => entry.chapter === 'sales')!;
    expect(item.sub).toMatch(/celles qui ressemblent le plus à votre maison : .*pièces?/);
    const all = JSON.stringify(story);
    expect(all).not.toMatch(/plus proches/);
    const english = buildMarketStudy({ ...garcia(), language: 'en' }).story.sales!;
    expect(english.tableTitle).toBe('The six sales most like your house');
    expect(JSON.stringify(english)).not.toMatch(/closest/);
  });

  it('sans pièces ni surface du bien : les six ventes les plus récentes', () => {
    const base = garcia();
    const story = buildMarketStudy({
      ...base,
      property: { ...base.property!, rooms_count: null, surface_area: null },
    }).story;
    expect(story.sales!.tableTitle).toBe('Les six ventes les plus récentes');
    expect(story.sales!.tableNote).toBeNull();
  });

  it('la ligne des sources suit les blocs présents : « Habitants » sans risques', () => {
    const story = buildMarketStudy(
      garcia({ quartier: { ...quartier, keys: ['urbanisme', 'population'] } }),
    ).story;
    const labels = story.next.sources.map((row) => row.label);
    expect(labels).toContain('Urbanisme');
    expect(labels).toContain('Habitants');
    expect(labels.join(' ')).not.toMatch(/Risques|permis/i);
    const all = buildMarketStudy(garcia()).story.next.sources.map((row) => row.label);
    expect(all).toContain('Urbanisme et permis');
    expect(all).toContain('Risques et habitants');
  });

  it('plus de « 1 source, citée page 7 » : depuis combien de temps la moitié attend', () => {
    const story = buildMarketStudy(lefebvre()).story;
    expect(story.summary.kpis.map((kpi) => kpi.label).join(' ')).not.toMatch(/source/);
    const days = story.summary.kpis.find((kpi) => kpi.rest === 'jours')!;
    // Les cinq annonces publiées le 15/09, l'étude du 19/11 : 65 jours.
    expect(days.value).toBe('65');
    expect(days.label).toBe(
      'la moitié des maisons en vente attendent un acheteur depuis au moins ce temps',
    );
  });
});
