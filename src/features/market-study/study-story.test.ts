import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { MarketStudyDocument } from '@/features/market-study/components/market-study-document';
import {
  buildMarketStudy,
  type MarketStudyCompetitorRow,
  type MarketStudyInput,
} from '@/features/market-study/services/build-market-study';
import {
  cardHeight,
  closestSales,
  packCards,
  quartierHeight,
  rankingChunks,
  rankingPages,
  studyCivility,
  studyKind,
} from '@/features/market-study/services/study-story';
import type { StudyCard } from '@/features/market-study/types';
import {
  NEIGHBOURHOOD_BLOCK_KEYS,
  parseNeighbourhoodBlocks,
} from '@/features/neighbourhood-link/services/neighbourhood-blocks';
import { ENGLISH_STUDY } from '@/lib/client-texts/study-en';
import { FRENCH_STUDY } from '@/lib/client-texts/study-fr';
import type { StudyKind, StudyTexts } from '@/lib/client-texts/study-types';
import clientView from '@/test-fixtures/academia-vue-bien-client.json';

// Mission 163 A — l'Étude en fil conducteur (maquette M163-fil-conducteur) : les pages dans l'ordre,
// les titres-conclusions composés depuis les chiffres, un chapitre sans données qui disparaît du
// résumé et de la numérotation, et des avis qui ne disent que ce que portent les chiffres.

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
    rooms_count: 5,
    bedrooms_count: 3,
    surface_area: 135,
    city: 'Vence',
    district: 'Les Collines',
    display_order: order,
    created_at: '2026-10-01T09:00:00.000Z',
    energy_rating: 'C',
    ges_rating: null,
    general_condition: null,
    outdoor_spaces: ['garden'],
    parking_types: [],
    exposure: 'south',
    photo_urls: [`https://cdn.portail.test/${id}.jpg`],
    price_drop_amount: null,
    price_drop_percentage: null,
    days_on_market: null,
    listing_published_at: '2026-10-15T00:00:00.000Z',
    listing_gone_at: null,
    synthesis_hide_photo: false,
    ...extra,
  };
}

const quartier = {
  blocks: parseNeighbourhoodBlocks(clientView)!,
  keys: [...NEIGHBOURHOOD_BLOCK_KEYS],
  takenAt: '2026-11-17T18:00:00Z',
};

function input(extra: Partial<MarketStudyInput> = {}): MarketStudyInput {
  return {
    madeAt: MADE_AT,
    sellerName: 'Mme Garcia',
    property: {
      property_type: 'Maison',
      city: 'Vence',
      district: 'Les Collines',
      surface_area: 135,
      land_area: 900,
      rooms_count: 5,
      bedrooms_count: 3,
      energy_rating: 'C',
      ges_rating: null,
      general_condition: null,
      outdoor_spaces: ['garden'],
      parking_types: [],
      exposure: 'south',
    },
    coverPhotoUrl: null,
    competitors: [
      competitor('c1', 0, 740000, { exposure: 'south_east' }),
      competitor('c2', 1, 729000, { surface_area: 142, exposure: 'south_west' }),
      competitor('c3', 2, 749000),
      competitor('c4', 3, 715000, { surface_area: 130 }),
      competitor('c5', 4, 760000, { surface_area: 150 }),
    ],
    agreedPrice: 745000,
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
    quartier,
    ...extra,
  };
}

const plain = (text: string) => text.replace(/[  ]/g, ' ');

describe('le fil de l’Étude : les pages dans l’ordre', () => {
  it('couverture, résumé, biens en vente, ventes, prix, quartier, la suite : 8 pages', () => {
    const study = buildMarketStudy(input());
    const story = study.story;
    expect(story.competitors?.pages.map((page) => page.length)).toEqual([3, 2]);
    expect(story.competitors?.band.number).toBe('01');
    expect(story.sales?.band.number).toBe('02');
    expect(story.ranking?.band.number).toBe('03');
    expect(story.quartier?.band.number).toBe('04');
    // La place du prix en tête du résumé, encadrée à la couleur de son tiers.
    expect(story.summary.items.map((item) => [item.chapter, item.page, item.tier])).toEqual([
      ['ranking', 'page 6', 'orange'],
      ['competitors', 'page 3', null],
      ['sales', 'page 5', null],
      ['quartier', 'page 7', null],
    ]);
    expect(story.summary.title).toBe('Quatre choses que cette étude vous apprend sur votre maison');
    expect(story.summary.kpis.map((kpi) => [kpi.value, kpi.sup, kpi.rest])).toEqual([
      ['5', null, null],
      ['11', null, null],
      ['4', 'e', 'sur 6'],
      // Les annonces, DVF, l'urbanisme, les permis, Géorisques, l'Insee, la copropriété.
      ['7', null, null],
    ]);
    expect(story.summary.kpis[3]!.label).toBe('sources, toutes citées page 8');

    const html = renderToStaticMarkup(createElement(MarketStudyDocument, { document: study }));
    const pages = [...html.matchAll(/data-study-page="([a-z]+)"/g)].map((match) => match[1]);
    expect(pages).toEqual([
      'cover',
      'summary',
      'competitors',
      'competitors',
      'sales',
      'ranking',
      'quartier',
      'next',
    ]);
  });

  it('les titres-conclusions, recomposés depuis les chiffres', () => {
    const story = buildMarketStudy(input()).story;
    expect(plain(story.cover.title)).toBe('Votre maison à Vence face au marché');
    expect(plain(story.cover.line!)).toBe(
      'Maison · 5 pièces · 135 m² · 900 m² de terrain · Les Collines',
    );
    expect(plain(story.competitors!.band.title)).toBe(
      'Cinq maisons comme la vôtre sont en vente aujourd’hui',
    );
    expect(plain(story.competitors!.band.lead)).toMatch(/^De 715 000 € à 760 000 €\./);
    expect(plain(story.ranking!.band.title)).toBe(
      'À 745 000 €, trois maisons en vente sont moins chères que la vôtre',
    );
    expect(plain(story.sales!.band.title)).toBe(
      'Onze maisons comme la vôtre se sont vendues autour de chez vous'.replace('Onze', '11'),
    );
    expect(plain(story.quartier!.band.title)).toMatch(/^Ce que votre acheteur demandera : /);
    expect(story.summary.lead.startsWith('Madame, voici ce que disent')).toBe(true);
    expect(story.summary.value).toContain('nous l’avons retenu ensemble : 745');
  });

  it('la couverture n’a plus de verdict ; le conseiller y est nommé sans mot qui dise son genre', () => {
    const study = buildMarketStudy(input());
    const html = renderToStaticMarkup(createElement(MarketStudyDocument, { document: study }));
    const cover = html.slice(0, html.indexOf('data-study-page="summary"'));
    expect(cover).not.toMatch(/Attention|vous êtes|data-tier/);
    expect(cover).toContain('Préparée pour');
    expect(html).toContain('L’avis de Claire Dumas');
    expect(html).not.toMatch(/conseill(er|ère)\(ère\)|votre conseillère|votre conseiller,/i);
  });

  it('une fiche ne montre que les lignes qui diffèrent, puis « Équivalent sur : … »', () => {
    const story = buildMarketStudy(input()).story;
    const [first, second, third] = story.competitors!.pages[0]!;
    expect(first!.diffs.map((line) => [line.label, line.status])).toEqual([
      ['Exposition', 'competitor_weakness'],
    ]);
    expect(first!.equivalentOn).toMatch(/^Équivalent sur : surface/);
    expect(second!.diffs.map((line) => line.label)).toEqual(['Surface', 'Exposition']);
    expect(plain(second!.diffs[0]!.value)).toBe('142 m² (vous : 135 m²)');
    expect(third!.diffs).toEqual([]);
    expect(third!.equivalentAll).toBe('Équivalente à votre maison sur tous les critères.');
  });
});

describe('un chapitre sans données disparaît du résumé et de la numérotation', () => {
  it('sans quartier ni ventes : 01 les biens, 02 le prix, et la suite', () => {
    const story = buildMarketStudy(input({ quartier: null })).story;
    expect(story.sales).toBeNull();
    expect(story.quartier).toBeNull();
    expect(story.competitors?.band.number).toBe('01');
    expect(story.ranking?.band.number).toBe('02');
    expect(story.summary.title).toBe('Deux choses que cette étude vous apprend sur votre maison');
    expect(story.summary.lead).not.toContain('et les ventes');
    expect(story.next.sources.map((row) => row.label)).toEqual(['Les biens en vente']);
  });

  it('ventes non cochées : le chapitre des ventes sort, le quartier reste', () => {
    const story = buildMarketStudy(
      input({ quartier: { ...quartier, keys: ['urbanisme', 'risques'] } }),
    ).story;
    expect(story.sales).toBeNull();
    expect(story.quartier?.band.number).toBe('03');
    expect(story.quartier?.permits).toBeNull();
    expect(story.summary.items.map((item) => item.chapter)).toEqual([
      'ranking',
      'competitors',
      'quartier',
    ]);
  });

  it('sans prix convenu : ni classement ni prix retenu, « nous le fixerons ensemble au rendez-vous »', () => {
    const story = buildMarketStudy(input({ agreedPrice: null })).story;
    expect(story.ranking).toBeNull();
    expect(story.summary.items[0]!.chapter).toBe('competitors');
    expect(story.summary.value).toContain('Le prix, nous le fixerons ensemble au rendez-vous.');
    expect(story.summary.kpis.some((kpi) => kpi.sup)).toBe(false);
  });

  it('un appartement : ses mots et ses papiers ; un autre type : « bien »', () => {
    const flat = buildMarketStudy(
      input({
        property: { ...input().property!, property_type: 'Appartement', land_area: 900 },
        competitors: [competitor('a1', 0, 400000, { property_type: 'apartment' })],
        quartier: null,
      }),
    ).story;
    expect(plain(flat.cover.title)).toBe('Votre appartement à Vence face au marché');
    expect(flat.cover.line).not.toContain('terrain');
    expect(flat.next.papers).toContain('Le règlement de copropriété');
    expect(flat.next.papers).not.toContain('L’attestation d’assainissement');
    expect(flat.competitors!.band.title).toBe(
      'Un appartement comme le vôtre est en vente aujourd’hui',
    );
    expect(studyKind('Terrain')).toBe('bien');
  });
});

describe('les règles de mise en page', () => {
  const card = (diffs: number): StudyCard => ({
    id: String(diffs),
    kicker: '',
    label: '',
    photoUrl: null,
    price: '',
    perSquareMeter: null,
    since: null,
    drop: null,
    diffs: Array.from({ length: diffs }, (_, i) => ({
      label: String(i),
      value: '',
      status: 'competitor_advantage' as const,
    })),
    equivalentOn: diffs ? 'x' : null,
    equivalentAll: diffs ? null : 'x',
  });

  it('trois fiches par page au plus, l’avis avec la dernière', () => {
    const shape = (n: number) =>
      packCards(Array.from({ length: n }, () => card(1))).map((p) => p.length);
    expect(shape(1)).toEqual([1]);
    expect(shape(2)).toEqual([2]);
    expect(shape(3)).toEqual([2, 1]);
    expect(shape(5)).toEqual([3, 2]);
    expect(shape(6)).toEqual([3, 3]);
    expect(shape(7)).toEqual([3, 3, 1]);
  });

  it('une fiche aux nombreuses différences prend plus de place', () => {
    expect(cardHeight(card(9))).toBeGreaterThan(cardHeight(card(1)));
    expect(packCards([card(9), card(9), card(9)]).map((p) => p.length)).toEqual([2, 1]);
  });

  it('le classement se coupe à 9 lignes, puis par 18 : le résumé cite les vraies pages', () => {
    expect(rankingPages(6)).toBe(1);
    expect(rankingPages(9)).toBe(1);
    expect(rankingPages(10)).toBe(2);
    expect(rankingPages(27)).toBe(2);
    expect(rankingPages(28)).toBe(3);
    const rows = Array.from({ length: 12 }, (_, i) => i);
    expect(rankingChunks(rows).map((chunk) => chunk.length)).toEqual([9, 3]);
    expect(rankingChunks(rows.slice(0, 4))).toEqual([[0, 1, 2, 3]]);
  });

  it('le quartier trop long pour une feuille passe sur deux pages, et le résumé le compte', () => {
    expect(
      quartierHeight({ tileLines: 4, riskCells: 6, condominium: true, vivreIci: true, avis: true }),
    ).toBeGreaterThan(
      quartierHeight({
        tileLines: 2,
        riskCells: 2,
        condominium: false,
        vivreIci: false,
        avis: true,
      }),
    );
    const long = buildMarketStudy(input({ neighbourhood: undefined })).story;
    const study = buildMarketStudy(
      input({
        neighbourhood: {
          url: 'https://app.myacademia.ai/l/x',
          validUntil: null,
          qr: { size: 21, path: '' },
          printAddress: true,
        },
      }),
    );
    // Le fichier d'exemple tient sur une page, Vivre ici compris.
    expect(long.quartier?.split).toBe(false);
    expect(study.story.quartier?.split).toBe(false);
    const html = renderToStaticMarkup(createElement(MarketStudyDocument, { document: study }));
    expect(html.split('data-study-page="quartier"').length - 1).toBe(1);
  });

  it('les six ventes les plus proches : pièces, puis surface, puis la plus récente', () => {
    const sale = (month: string, rooms: number | null, surface: number | null) => ({
      month,
      type: 'maison' as const,
      rooms,
      surface,
      price: 1,
      distance: null,
      street: null,
    });
    const list = [
      sale('2021-01', 7, 135),
      sale('2022-01', 5, 150),
      sale('2023-01', 5, 134),
      sale('2024-01', 5, 134),
      sale('2025-01', null, 135),
    ];
    expect(closestSales(list, { rooms: 5, surface: 135 }, 3)).toEqual([3, 2, 1]);
  });
});

describe('la formule de politesse, tirée du nom du dossier', () => {
  it('Madame, Monsieur, les deux, ou rien', () => {
    expect(studyCivility('Mme Garcia')).toBe('madame');
    expect(studyCivility('Madame Garcia')).toBe('madame');
    expect(studyCivility('M. Lefebvre')).toBe('monsieur');
    expect(studyCivility('M. et Mme Lopez')).toBe('both');
    expect(studyCivility('Mr and Mrs Bernard')).toBe('both');
    expect(studyCivility('M. Martin et Mme Durand')).toBe('both');
    expect(studyCivility('Famille Keller')).toBeNull();
    expect(studyCivility('Mathilde Roux')).toBeNull();
    const none = buildMarketStudy(input({ sellerName: 'Famille Keller' })).story;
    expect(none.summary.lead.startsWith('Voici ce que disent')).toBe(true);
  });
});

// Les phrases, dans toutes leurs variantes : jamais « estimation », jamais une valeur du bien, ni
// pression ni urgence (M85) (Jean-Guy, 20/11).
describe('les variantes des phrases', () => {
  const KINDS: StudyKind[] = ['maison', 'appartement', 'bien'];
  const COUNTS = [0, 1, 2, 3, 5, 12];
  const FORBIDDEN =
    /estim|valuation|valued|urgent|vite|dépêch|tardez|dernière chance|immédiat|hurry|act fast|right away|garanti|guarantee/i;
  const range = { from: '1 €', to: '2 €' };

  function variants(t: StudyTexts): string[] {
    const out: string[] = [];
    for (const kind of KINDS) {
      out.push(t.coverTitle(kind, 'Vence'), t.coverTitle(kind, null), t.footer(kind, null, 'x'));
      out.push(t.summary.valueTitle(kind), ...t.next.papers(kind));
      for (const step of t.next.steps(kind)) out.push(step.title, step.text);
      out.push(t.ranking.source('x', kind));
      for (const flag of [true, false])
        out.push(t.summary.how(flag, flag, !flag, kind), t.next.is(kind, 'x', flag, !flag));
      for (const n of COUNTS) {
        out.push(t.summary.title(n, kind), t.summary.kpiCompetitors(n, kind));
        out.push(t.summary.kpiSales(n, kind, 2021));
        out.push(t.competitors.title(n, kind), t.competitors.lead(n, kind, range));
        out.push(t.competitors.item(n, kind, null), t.sales.title(Math.max(n, 1), kind));
        out.push(t.sales.item(Math.max(n, 1), kind, range, 2021));
        out.push(t.sales.itemSub(Math.max(n, 1), Math.min(Math.max(n, 1), 6), kind));
        out.push(t.sales.avis(Math.max(n, 1), kind, '5 pièces', '135 m²'));
        out.push(t.ranking.title('1 €', n, kind), t.ranking.lead(Math.max(n, 1), kind));
        out.push(t.ranking.itemAfter(n + 1, n, kind), t.ranking.itemSub('1 €', n, kind));
        for (const strengths of [null, 'son exposition sud'])
          out.push(t.ranking.avis(n, kind, strengths));
        for (const advantaged of [0, 1, 2])
          for (const onlySurface of [true, false])
            for (const strengths of [null, 'son exposition sud'])
              out.push(
                t.competitors.avis(
                  Math.max(n, 1),
                  kind,
                  advantaged,
                  advantaged ? 'la surface' : null,
                  onlySurface,
                  strengths,
                ),
                t.competitors.itemSub(
                  Math.max(n, 1),
                  advantaged,
                  advantaged ? 'la surface' : null,
                  advantaged,
                  advantaged ? 'l’exposition' : null,
                  kind,
                ),
              );
        out.push(t.quartier.avisPermits(n, n ? 3 : null, '300 m'), t.quartier.avisParcel(n));
        out.push(t.quartier.permits(n, '300 m'), t.quartier.parcelCount(Math.max(n, 1)));
      }
    }
    out.push(t.summary.value('745 000 €'), t.summary.value(null), t.quartier.avisFlood);
    out.push(t.quartier.avisRisks, ...t.sales.read, t.ranking.verdictNote);
    return out;
  }

  it('en français et en anglais : ni estimation, ni valeur, ni pression', () => {
    for (const texts of [FRENCH_STUDY, ENGLISH_STUDY]) {
      const offenders = variants(texts).filter(
        (text) => FORBIDDEN.test(text) || text.includes('undefined'),
      );
      expect(offenders).toEqual([]);
    }
  });

  it('l’avis des biens en vente ne dit que ce que portent les chiffres', () => {
    const t = FRENCH_STUDY.competitors;
    expect(t.avis(5, 'maison', 0, null, false, null)).toBe(
      'Vos acheteurs ne verront pas votre maison seule : ils la compareront à ces cinq-là. Aucune n’a d’avantage sur la vôtre dans ce que disent les annonces. L’annonce doit montrer ce qui fera choisir la vôtre.',
    );
    expect(t.avis(5, 'maison', 2, 'la surface', true, 'son exposition sud')).toBe(
      'Vos acheteurs ne verront pas votre maison seule : ils la compareront à ces cinq-là. Deux sont plus grandes ; la vôtre a pour elle son exposition sud. C’est ce que l’annonce doit montrer.',
    );
  });

  it('un atout du bien n’est jamais un critère où un bien en vente est meilleur', () => {
    const story = buildMarketStudy(
      input({
        competitors: [
          competitor('c1', 0, 740000, { surface_area: 160 }),
          competitor('c2', 1, 729000, { surface_area: 100, exposure: 'north' }),
        ],
      }),
    ).story;
    expect(story.competitors!.avis).not.toMatch(/135/);
    expect(story.competitors!.avis).toContain('son exposition sud');
    expect(story.ranking!.avis).not.toMatch(/135/);
  });

  it('une annonce retirée a sa fiche, mais ne compte pas dans les phrases', () => {
    const story = buildMarketStudy(
      input({
        competitors: [
          competitor('c1', 0, 740000),
          competitor('c2', 1, 729000, {
            surface_area: 170,
            listing_gone_at: '2026-11-10T00:00:00.000Z',
          }),
        ],
      }),
    ).story;
    expect(story.competitors!.pages.flat()).toHaveLength(2);
    expect(story.competitors!.avis).toContain('à celle-ci');
    expect(story.competitors!.avis).toContain('n’a pas d’avantage');
    const gone = buildMarketStudy(
      input({
        competitors: [competitor('c1', 0, 740000, { listing_gone_at: '2026-11-10T00:00:00.000Z' })],
      }),
    ).story;
    expect(gone.competitors!.avis).toBeNull();
    expect(gone.summary.kpis.some((kpi) => kpi.value === '0')).toBe(false);
  });

  it('« en tout » seulement quand chaque permis dit son nombre de logements', () => {
    const blocks = structuredClone(quartier.blocks);
    blocks.permis!.build = blocks.permis!.build.map((permit, i) => ({
      ...permit,
      dwellings: i === 0 ? null : permit.dwellings,
    }));
    const story = buildMarketStudy(
      input({ quartier: { ...quartier, blocks: { ...blocks, risques: null } } }),
    ).story;
    expect(story.quartier!.avis).not.toContain('en tout');
  });

  it('dans le fil, l’avantage partagé entre deux biens se dit « ou », jamais « et »', () => {
    const story = buildMarketStudy(
      input({
        competitors: [
          competitor('c1', 0, 740000, { surface_area: 160 }),
          competitor('c2', 1, 729000, { energy_rating: 'A' }),
        ],
      }),
    ).story;
    expect(story.competitors!.avis).toContain('Deux ont l’avantage sur la surface ou le DPE');
  });
});
