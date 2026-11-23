import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';

import { MarketStudyDocument } from '@/features/market-study/components/market-study-document';
import {
  buildMarketStudy,
  type MarketStudyCompetitorRow,
  type MarketStudyInput,
} from '@/features/market-study/services/build-market-study';
import {
  NEIGHBOURHOOD_BLOCK_KEYS,
  parseNeighbourhoodBlocks,
} from '@/features/neighbourhood-link/services/neighbourhood-blocks';
import clientView from '@/test-fixtures/academia-vue-bien-client.json';

// Le banc de l'Étude imprimée, première moitié : un millier d'Études fabriquées, rendues en HTML
// avec la feuille de style du dernier `npm run build`. `banc.mjs` les ouvre ensuite dans Chromium,
// à l'impression, et mesure chaque bloc face à la hauteur que `study-print.ts` lui a estimée.
// `BANC_POLICE` : la police de charte de l'agence (sinon Montserrat et Rajdhani).
const FONT = process.env.BANC_POLICE || null;
const OUT = path.resolve('tests/print/.banc', FONT ?? 'defaut');
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
    photo_urls: [],
    price_drop_amount: null,
    price_drop_percentage: null,
    days_on_market: null,
    listing_published_at: '2026-09-15T00:00:00.000Z',
    listing_gone_at: null,
    synthesis_hide_photo: false,
    ...extra,
  };
}

// Des fiches aux nombreuses différences (jusqu'à huit lignes), des communes longues, une baisse.
const VARIED = [
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
    city: 'Mouans-Sartoux',
    district: 'Tournamy',
  }),
  competitor('c4', 3, 1650000, {
    surface_area: 205,
    price_drop_amount: 40000,
    price_drop_percentage: 2.4,
  }),
  competitor('c5', 4, 1480000, {
    surface_area: 180,
    rooms_count: 6,
    bedrooms_count: 3,
    energy_rating: 'D',
    ges_rating: 'D',
    general_condition: 'good',
    city: 'Saint-Paul-de-Vence',
  }),
];
// Les fiches simples d'un dossier ordinaire : une ou deux différences.
const SIMPLE = [
  competitor('s1', 0, 1640000, {
    exposure: 'south_east',
    city: 'Saint-Paul-de-Vence',
    district: null,
  }),
  competitor('s2', 1, 1629000, { surface_area: 220, exposure: 'south_west' }),
  competitor('s3', 2, 1649000, { city: 'La Colle-sur-Loup', district: null }),
  competitor('s4', 3, 1615000, { surface_area: 204 }),
  competitor('s5', 4, 1660000, { surface_area: 230 }),
];

function base(): MarketStudyInput {
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
    competitors: VARIED,
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
    brandDeclarations: FONT
      ? `--font-sans: var(--font-${FONT}); --font-title: var(--font-${FONT});`
      : '',
    quartier: null,
  };
}

const blocks = parseNeighbourhoodBlocks(clientView)!;
const link = {
  url: 'https://app.myacademia.ai/l/abc',
  validUntil: '2026-12-23T00:00:00.000Z',
  qr: { size: 21, path: 'M0 0h1v1H0z' },
  printAddress: true,
};

// Sans quartier, tous les blocs, puis chaque bloc seul et les paires qui partagent une case.
const KEYSETS: ((typeof NEIGHBOURHOOD_BLOCK_KEYS)[number][] | null)[] = [
  null,
  [...NEIGHBOURHOOD_BLOCK_KEYS],
  ['urbanisme'],
  ['permis'],
  ['urbanisme', 'permis'],
  ['risques'],
  ['population'],
  ['risques', 'population'],
  ['copropriete'],
  ['ventes'],
  ['permis', 'ventes'],
  ['urbanisme', 'permis', 'risques', 'population', 'copropriete'],
];

it('fabrique les Études du banc', () => {
  const chunks = path.resolve('.next/static/chunks');
  const sheets = readdirSync(chunks).filter((file) => file.endsWith('.css'));
  expect(
    sheets.length,
    'Lancez d’abord `npm run build` : sa feuille de style manque',
  ).toBeGreaterThan(0);
  const css = sheets
    .map((file) => `<link rel="stylesheet" href="file://${chunks}/${file}">`)
    .join('');
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  let count = 0;
  for (const language of ['fr', 'en'] as const)
    for (const n of FONT ? [1, 5, 12] : [1, 3, 5, 8, 12])
      for (const priced of [true, false])
        for (const keys of KEYSETS)
          for (const cards of ['variees', 'egales', 'simples'] as const)
            for (const vivre of [false, true])
              for (const flat of [false, true]) {
                if (cards === 'simples' && n !== 5) continue;
                if (cards === 'egales' && vivre) continue;
                const whole = keys == null || keys.length === 6 || keys.join() === 'ventes';
                if (flat && (!whole || cards !== 'variees')) continue;
                const source = cards === 'simples' ? SIMPLE : VARIED;
                const data: MarketStudyInput = {
                  ...base(),
                  language,
                  studyPrice: priced ? base().studyPrice : null,
                  quartier: keys ? { blocks, keys, takenAt: '2026-11-17T18:00:00Z' } : null,
                  neighbourhood: vivre ? link : null,
                  property: flat
                    ? { ...base().property!, property_type: 'Appartement' }
                    : base().property,
                  competitors: Array.from({ length: n }, (_, i) => ({
                    ...(cards === 'egales' ? VARIED[1]! : source[i % 5]!),
                    id: `m${i}`,
                    display_order: i,
                    price: 1400000 + i * 10000,
                    property_type: flat ? 'apartment' : 'house',
                  })),
                };
                const html = renderToStaticMarkup(
                  createElement(MarketStudyDocument, { document: buildMarketStudy(data) }),
                );
                const name = [
                  language,
                  `${n}c`,
                  priced ? 'prix' : 'sansprix',
                  keys ? keys.join('+') : 'sansquartier',
                  cards,
                  vivre ? 'vivre' : 'sansvivre',
                  flat ? 'appartement' : 'maison',
                ].join('_');
                writeFileSync(
                  path.join(OUT, `${name}.html`),
                  `<!doctype html><html lang="${language}" class="h-full antialiased"><head><meta charset="utf-8">${css}</head><body class="flex min-h-full flex-col"><div class="flex min-h-screen flex-col gap-6 bg-zinc-100 p-4 lg:p-6 print:block print:bg-white print:p-0">${html}</div></body></html>`,
                );
                count += 1;
              }
  expect(count).toBeGreaterThan(500);
});
