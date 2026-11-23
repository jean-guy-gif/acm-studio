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

const CASES: [string, MarketStudyInput][] = [
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
      expect(page.units.at(-1)!.keepWithNext).not.toBe(true);
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
      'la moitié de ces maisons attendent un acheteur depuis au moins ce temps',
    );
    // Sans date de publication, la durée est reconstituée : « environ », comme sur la fiche.
    const approx = buildMarketStudy(
      lefebvre({
        competitors: lefebvre().competitors.map((row) => ({
          ...row,
          listing_published_at: null,
          days_on_market: 40,
        })),
      }),
    ).story.summary.kpis.find((kpi) => kpi.rest?.startsWith('jours'))!;
    expect(approx.rest).toBe('jours environ');
  });
});

// Un dossier à `n` concurrents (les cinq de M. Lefebvre, répétés), à des prix tous différents.
const many = (n: number) =>
  lefebvre({
    competitors: Array.from({ length: n }, (_, i) => lefebvre().competitors[i % 5]!).map(
      (row, i) => ({ ...row, id: `m${i}`, display_order: i, price: 1400000 + i * 10000 }),
    ),
  });

describe('le classement ne se coupe jamais (Jean-Guy, 23/11)', () => {
  const rankingPages = (data: MarketStudyInput) =>
    buildMarketStudy(data)
      .story.print.pages.map((page, index) => ({ page, index }))
      .filter(({ page }) =>
        page.units.some((unit) => unit.chapter === 'ranking' && unit.kind !== 'avis'),
      );

  it('titre, verdict, réglette, toutes les lignes et la légende sur une même page', () => {
    for (const data of [
      lefebvre(),
      lefebvre({ quartier }),
      garcia({ studyPrice: lefebvre().studyPrice }),
    ]) {
      const pages = rankingPages(data);
      expect(pages).toHaveLength(1);
      const kinds = pages[0]!.page.units.map((unit) => unit.kind);
      expect(kinds).toContain('band');
      expect(kinds).toContain('ranking-head');
      expect(kinds).toContain('ranking-legend');
      expect(kinds.filter((kind) => kind === 'ranking-row')).toHaveLength(6);
    }
  });

  it('12 biens tiennent ensemble ; au-delà, la suite sur la page suivante', () => {
    // 11 concurrents et le bien : 12 lignes, une seule page.
    expect(rankingPages(many(11))).toHaveLength(1);
    // 13 concurrents et le bien : 14 lignes, le classement continue sur la page suivante.
    expect(rankingPages(many(13)).length).toBeGreaterThan(1);
  });
});

// La règle de Jean-Guy (23/11, après les planches de l'essai) : quand l'avis tient avec son chapitre,
// il y reste ; quand il ne tient pas, il ouvre la page suivante et le dernier bloc ne descend pas
// avec lui (faire descendre la dernière fiche ajoutait une page aux deux tiers blanche sur cinq
// dossiers de démo). Une seule exigence : un avis n'est jamais seul sur une page ; ce qui suit (le
// chapitre suivant ou « La suite ») commence sur la même page.
describe('l’avis du conseiller : avec son chapitre s’il tient, sinon en tête de la page suivante', () => {
  const kinds = (pages: { units: PrintUnit[] }[]) =>
    pages.map((page) => page.units.map((unit) => unit.kind));
  const card = (index: number, mm: number): PrintUnit => ({
    kind: 'card',
    chapter: 'competitors',
    index,
    mm,
  });
  const avis: PrintUnit = { kind: 'avis', chapter: 'competitors', mm: 40 };
  const band: PrintUnit = { kind: 'band', chapter: 'ranking', mm: 50, keepWithNext: true };

  it('quand il tient avec son chapitre, il y reste', () => {
    expect(kinds(paginateUnits([card(0, 100), card(1, 100), avis], 268))).toEqual([
      ['card', 'card', 'avis'],
    ]);
    // Même si le chapitre suivant, lui, ne tient pas : l'avis ne le suit pas sur la page d'après.
    expect(
      kinds(
        paginateUnits(
          [card(0, 100), card(1, 100), avis, band, { kind: 'ranking-head', mm: 150 }],
          268,
        ),
      ),
    ).toEqual([
      ['card', 'card', 'avis'],
      ['band', 'ranking-head'],
    ]);
  });

  it('quand il ne tient pas, il ouvre la page suivante : la dernière fiche ne descend pas, la suite commence sous lui', () => {
    expect(
      kinds(
        paginateUnits(
          [card(0, 130), card(1, 120), avis, band, { kind: 'ranking-head', mm: 150 }],
          268,
        ),
      ),
    ).toEqual([
      ['card', 'card'],
      ['avis', 'band', 'ranking-head'],
    ]);
  });

  it('jamais seul : si ce qui suit ne tient pas sous lui, le dernier bloc descend avec lui', () => {
    // Un classement entier trop haut pour suivre l'avis sur une page : la dernière fiche le suit.
    expect(
      kinds(
        paginateUnits(
          [card(0, 130), card(1, 120), avis, band, { kind: 'ranking-head', mm: 200 }],
          268,
        ),
      ),
    ).toEqual([['card'], ['card', 'avis'], ['band', 'ranking-head']]);
  });

  it('jamais seul : derrière un classement qui remplit sa page, « La suite » commence sous l’avis, quitte à finir sur la page d’après', () => {
    const whole: PrintUnit[] = [
      { kind: 'band', chapter: 'ranking', mm: 50, keepWithNext: true },
      { kind: 'ranking-head', chapter: 'ranking', mm: 200 },
    ];
    const closing: PrintUnit[] = [
      { kind: 'next-head', mm: 60, keepWithNext: true },
      { kind: 'next-papers', mm: 72, keepWithNext: 'soft' },
      { kind: 'next-contact', mm: 24, keepWithNext: true },
      { kind: 'next-is', mm: 70, keepWithNext: true },
      { kind: 'next-mentions', mm: 12 },
    ];
    const rankingAvis: PrintUnit = { kind: 'avis', chapter: 'ranking', mm: 40 };
    // L'avis ne tient pas derrière le classement ; « La suite » tient sous lui : entière.
    expect(kinds(paginateUnits([...whole, rankingAvis, ...closing], 280))).toEqual([
      ['band', 'ranking-head'],
      ['avis', 'next-head', 'next-papers', 'next-contact', 'next-is', 'next-mentions'],
    ]);
    // Elle n'y tient pas, et le classement ne peut pas descendre avec son avis : elle commence
    // quand même sous lui.
    expect(kinds(paginateUnits([...whole, rankingAvis, ...closing], 268))).toEqual([
      ['band', 'ranking-head'],
      ['avis', 'next-head', 'next-papers'],
      ['next-contact', 'next-is', 'next-mentions'],
    ]);
  });

  // Tous les dossiers qu'on peut imaginer : de 1 à 14 concurrents, avec ou sans prix, quartier,
  // lien « Vivre ici », maison ou appartement, fiches égales ou non, en français et en anglais.
  const neighbourhood = {
    url: 'https://app.myacademia.ai/l/x',
    validUntil: null,
    qr: { size: 21, path: '' },
    printAddress: true,
  };
  const sweep: [string, MarketStudyInput][] = [];
  for (const n of [1, 2, 3, 4, 5, 6, 8, 10, 11, 12, 14])
    for (const priced of [true, false])
      for (const withQuartier of [true, false])
        for (const flat of [false, true])
          for (const equal of [false, true]) {
            const data = many(n);
            const language = (n + (priced ? 1 : 0)) % 2 === 0 ? 'fr' : 'en';
            sweep.push([
              `${n} concurrents${priced ? ', un prix' : ''}${withQuartier ? ', le quartier' : ''}${
                flat ? ', un appartement' : ''
              }${equal ? ', des fiches égales' : ''}, ${language}`,
              {
                ...data,
                language,
                studyPrice: priced ? data.studyPrice : null,
                quartier: withQuartier ? quartier : null,
                neighbourhood: withQuartier === flat ? neighbourhood : null,
                property: flat
                  ? { ...data.property!, property_type: 'Appartement' }
                  : data.property,
                competitors: data.competitors.map((row) => ({
                  ...(equal ? data.competitors[1]! : row),
                  id: row.id,
                  display_order: row.display_order,
                  price: row.price,
                  property_type: flat ? 'apartment' : 'house',
                })),
              },
            ]);
          }

  it('dans toute Étude : jamais seul sur une page, et toujours à l’une de ses deux places', () => {
    expect(sweep.length).toBeGreaterThan(150);
    for (const [name, data] of [...CASES, ...sweep]) {
      const pages = buildMarketStudy(data).story.print.pages;
      let seen = 0;
      for (const page of pages) {
        page.units.forEach((unit, index) => {
          if (unit.kind !== 'avis') return;
          seen += 1;
          const previous = page.units[index - 1];
          const following = page.units[index + 1];
          if (index === 0) {
            // En tête de page : ce qui suit commence sur la même page.
            expect(following, `${name} : un avis seul sur sa page`).toBeDefined();
            expect(following!.chapter, name).not.toBe(unit.chapter);
          } else {
            // Sinon, derrière le dernier bloc de son chapitre.
            expect(previous!.chapter, name).toBe(unit.chapter);
            expect(previous!.kind, name).not.toBe('avis');
          }
        });
        // Rien ne déborde d'une feuille.
        expect(page.mm - PRINT_GAP_MM, name).toBeLessThanOrEqual(PRINT_ROOM_MM);
      }
      expect(seen, name).toBeGreaterThan(0);
    }
  });

  it('cinq fiches égales (les Lopez, les Bernard) : la dernière fiche reste avec les autres, l’avis ouvre la page du chapitre suivant', () => {
    const base = lefebvre();
    const equal = (extra: Partial<MarketStudyInput>) =>
      lefebvre({
        competitors: base.competitors.map((row) => ({
          ...base.competitors[1]!,
          id: row.id,
          display_order: row.display_order,
          price: row.price,
        })),
        ...extra,
      });
    for (const [data, follows] of [
      [equal({}), 'band'],
      [equal({ studyPrice: null }), 'next-head'],
    ] as [MarketStudyInput, string][]) {
      const pages = buildMarketStudy(data).story.print.pages;
      const at = pages.findIndex((page) =>
        page.units.some((unit) => unit.kind === 'avis' && unit.chapter === 'competitors'),
      );
      const last = pages.findIndex((page) =>
        page.units.some((unit) => unit.kind === 'card' && unit.index === 4),
      );
      // Quatre fiches remplissent leur page : l'avis n'y tient pas, la cinquième ne descend pas.
      expect(pages[last]!.units.filter((unit) => unit.kind === 'card')).toHaveLength(4);
      expect(at).toBe(last + 1);
      expect(pages[at]!.units[0]!.kind).toBe('avis');
      expect(pages[at]!.units[1]!.kind).toBe(follows);
    }
  });

  it('un classement de 12 lignes remplit sa page : son avis ouvre la suivante, devant « La suite »', () => {
    const pages = buildMarketStudy(many(11)).story.print.pages;
    const ranking = pages.findIndex((page) =>
      page.units.some((unit) => unit.kind === 'ranking-legend'),
    );
    expect(pages[ranking]!.units.filter((unit) => unit.kind === 'ranking-row')).toHaveLength(12);
    expect(
      pages[ranking]!.units.some((unit) => unit.kind === 'avis' && unit.chapter === 'ranking'),
    ).toBe(false);
    const next = pages[ranking + 1]!.units.map((unit) => unit.kind);
    expect(next[0]).toBe('avis');
    expect(next[1]).toBe('next-head');
    // Avec 11 lignes, le classement et son avis tiennent ensemble.
    const eleven = buildMarketStudy(many(10)).story.print.pages.find((page) =>
      page.units.some((unit) => unit.kind === 'ranking-legend'),
    )!;
    expect(eleven.units.some((unit) => unit.kind === 'avis' && unit.chapter === 'ranking')).toBe(
      true,
    );
  });
});

describe('« La suite » ne se coupe pas', () => {
  // Les Bernard, tels qu'imprimés sur l'essai le 23/11 : cinq fiches égales, pas de prix, en anglais.
  // La dernière fiche descendue avec son avis, « La suite » commençait sous eux et sa fin (« Ce que
  // cette étude est… », les sources, les mentions) restait seule sur une dernière page presque vide.
  const base = lefebvre();
  const bernard: MarketStudyInput = {
    ...lefebvre({
      studyPrice: null,
      competitors: base.competitors.map((row) => ({
        ...base.competitors[1]!,
        id: row.id,
        display_order: row.display_order,
        price: row.price,
      })),
    }),
    sellerName: 'Mr and Mrs Bernard',
    language: 'en',
  };

  it.each([...CASES, ['les Bernard', bernard] as [string, MarketStudyInput]])(
    '%s : les étapes, les papiers, le conseiller, les sources et les mentions sur une même page',
    (_, data) => {
      const pages = buildMarketStudy(data).story.print.pages;
      const next = pages.filter((page) => page.units.some((unit) => unit.kind.startsWith('next-')));
      expect(next).toHaveLength(1);
      const kinds = next[0]!.units.map((unit) => unit.kind);
      for (const kind of ['next-head', 'next-papers', 'next-contact', 'next-is', 'next-mentions'])
        expect(kinds).toContain(kind);
      // Rien ne déborde de cette page.
      expect(next[0]!.mm - PRINT_GAP_MM).toBeLessThanOrEqual(PRINT_ROOM_MM);
    },
  );
});
