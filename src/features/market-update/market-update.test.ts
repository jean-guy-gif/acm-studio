import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { MarketUpdateDocument } from '@/features/market-update/components/market-update-document';
import { competitorFactLine } from '@/features/market-update/components/market-update-panel';
import { Grid } from '@/features/seller-synthesis/components/seller-synthesis-document';
import { loadMarketUpdate } from '@/features/market-update/queries/load-market-update';
import {
  goneConclusionLabel,
  goneListingConclusion,
} from '@/features/market-update/services/gone-listing-rule';
import {
  buildMarketUpdateSummary,
  droppedSinceMeetingLabel,
  marketUpdateLine,
  parseMarketUpdateSummary,
  type MarketUpdateCompetitorRow,
} from '@/features/market-update/services/market-update-summary';
import { daysLabel, daysOnMarketAt } from '@/features/market-update/services/meeting-days';
import { buildPriceLines, NO_NEWCOMER_LABEL } from '@/features/market-update/services/price-lines';
import {
  hashMarketUpdateToken,
  MARKET_UPDATE_TOKEN_PATTERN,
  newMarketUpdateToken,
} from '@/features/market-update/services/market-update-token';
import { isPublicPath } from '@/lib/supabase/public-paths';

// Mission 127 — le Point marché : la règle des annonces disparues, les trois lignes, le point daté,
// le document qui ne contient jamais ce qu'une annonce dit (titre piège de la M107), le lien.

const TRAP_TITLE = 'EXCLUSIVITÉ Agence Dupont 12 rue des Lilas';
const TRAP_URL = 'https://www.agence-dupont-immobilier.fr/annonce/vente-12-rue-des-lilas';
const MADE_AT = new Date('2026-11-15T10:00:00.000Z');
// Les montants formatés portent des espaces insécables (M74) : on compare en espaces simples.
const plain = (value: string | null | undefined): string =>
  (value ?? '').replace(/[\u202f\u00a0]/g, ' ');

const row = (
  id: string,
  order: number,
  price: number,
  over: Partial<MarketUpdateCompetitorRow> = {},
): MarketUpdateCompetitorRow => ({
  id,
  price,
  property_type: 'house',
  rooms_count: 7,
  surface_area: 210,
  city: 'Mougins',
  district: null,
  display_order: order,
  created_at: '2026-09-01T00:00:00.000Z',
  excluded_from_live: false,
  read_today: true,
  meeting_frozen_at: '2026-10-12T15:00:00.000Z',
  listing_published_at: '2026-06-26',
  days_on_market: null,
  listing_gone_at: null,
  meeting_price: price,
  meeting_price_source: 'conclusion',
  ...over,
});

const ids = [
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555',
];

const input = () => ({
  competitors: [
    row(ids[0], 0, 1690000, { meeting_price: 1690000, meeting_price_source: 'current' }),
    row(ids[1], 1, 1699000, {
      listing_gone_at: '2026-11-03T09:00:00.000Z',
      listing_published_at: '2026-06-06',
      read_today: false,
    }),
    row(ids[2], 2, 1720000, {
      listing_gone_at: '2026-10-20T09:00:00.000Z',
      listing_published_at: '2025-12-04',
      read_today: false,
    }),
    row(ids[3], 3, 1590000, { meeting_price: 1650000 }),
    row(ids[4], 4, 1695000, { meeting_price: 1745000 }),
  ],
  dangerousCompetitorId: ids[0],
  meetingDate: '2026-10-12T15:00:00.000Z',
  agreedPrice: 1639500,
  advisorAnalysis: 1642000,
  madeAt: MADE_AT,
});

describe('la règle des annonces disparues (mission 127)', () => {
  it('conclut d’après les jours au retrait, aux bornes près', () => {
    expect(goneListingConclusion(99, 1000000)).toMatchObject({
      kind: 'probable_sale',
      negotiationMinPercent: 0,
      negotiationMaxPercent: 5,
    });
    expect(goneListingConclusion(100, 1000000)).toMatchObject({
      negotiationMinPercent: 5,
      negotiationMaxPercent: 10,
    });
    expect(goneListingConclusion(199, 1000000)).toMatchObject({
      negotiationMinPercent: 5,
      negotiationMaxPercent: 10,
    });
    expect(goneListingConclusion(200, 1000000)).toMatchObject({
      negotiationMinPercent: 10,
      negotiationMaxPercent: 15,
    });
    expect(goneListingConclusion(300, 1000000)).toMatchObject({ kind: 'probable_sale' });
    expect(goneListingConclusion(301, 1000000)).toEqual({ kind: 'withdrawn' });
  });

  it('le prix de vente estimé est une fourchette au millier, jamais un chiffre seul', () => {
    const conclusion = goneListingConclusion(150, 1699000);
    expect(conclusion).toMatchObject({ estimatedMin: 1529000, estimatedMax: 1614000 });
    expect(goneConclusionLabel(conclusion)).toBe('Vente probable, négociation estimée de 5 à 10 %');
    expect(goneConclusionLabel({ kind: 'withdrawn' })).toBe('Retiré du marché sans vente');
  });
});

describe('les jours de commercialisation', () => {
  it('exacts depuis la date de publication, « environ » depuis les jours de l’import', () => {
    expect(
      daysOnMarketAt(
        { listing_published_at: '2026-06-26', days_on_market: null, created_at: '2026-09-01' },
        '2026-11-15',
      ),
    ).toEqual({ days: 142, approximate: false });
    const approx = daysOnMarketAt(
      { listing_published_at: null, days_on_market: 30, created_at: '2026-10-16T08:00:00Z' },
      '2026-11-15T20:00:00Z',
    );
    expect(approx).toEqual({ days: 60, approximate: true });
    expect(daysLabel(approx!)).toBe('environ 60 jours');
    expect(
      daysOnMarketAt(
        { listing_published_at: null, days_on_market: null, created_at: '2026-10-16' },
        '2026-11-15',
      ),
    ).toBeNull();
  });
});

describe('les trois lignes de prix', () => {
  const competitors = [
    { meetingPrice: 1690000, currentPrice: 1690000, gone: null, dangerous: true },
    {
      meetingPrice: 1699000,
      currentPrice: 1699000,
      gone: 'probable_sale' as const,
      dangerous: false,
    },
    { meetingPrice: 1720000, currentPrice: 1720000, gone: 'withdrawn' as const, dangerous: false },
    { meetingPrice: 1650000, currentPrice: 1590000, gone: null, dangerous: false },
    { meetingPrice: 1745000, currentPrice: 1695000, gone: null, dangerous: false },
  ];

  it('plus bas, médiane, plus haut, le plus dangereux, le prix du vendeur ; les disparus à part', () => {
    const lines = buildPriceLines(competitors, 1639500);
    expect(lines.meeting).toMatchObject({
      lowest: 1650000,
      median: 1699000,
      highest: 1745000,
      dangerousPrice: 1690000,
      subjectPrice: 1639500,
    });
    expect(lines.meeting?.sentence).toBe(
      'Au rendez-vous, votre prix retenu était sous le plus bas des 5 concurrents : le moins cher des 6 biens comparés.',
    );
    expect(lines.today).toMatchObject({ prices: [1590000, 1690000, 1695000], median: 1690000 });
    expect(lines.todayGone).toEqual({ probableSale: 1, withdrawn: 1, unknown: 0 });
    expect(lines.today?.sentence).toBe(
      'Aujourd’hui, 1 concurrent sur 3 est sous votre prix, dont 1 passé dessous depuis le rendez-vous : vous êtes le 2e moins cher des 4 biens encore en vente. 2 annonces ont disparu : 1 vente probable, 1 retirée sans vente.',
    );
    expect(lines.newcomers).toBeNull();
    expect(lines.newcomersCount).toBe(0);
    expect(lines.scale).toEqual({ min: 1590000, max: 1745000 });
  });

  it('« passé dessous » ne compte que ce qui était au niveau ou au-dessus du prix retenu', () => {
    const lines = buildPriceLines(
      [
        { meetingPrice: 1600000, currentPrice: 1590000, gone: null, dangerous: false },
        { meetingPrice: 1700000, currentPrice: 1690000, gone: null, dangerous: false },
      ],
      1639500,
    );
    expect(lines.today?.sentence).toBe(
      'Aujourd’hui, 1 concurrent sur 2 est sous votre prix : vous êtes dans la moyenne des 3 biens encore en vente.',
    );
  });

  it('une annonce disparue sans durée connue sort de la ligne 2, comptée à part', () => {
    const lines = buildPriceLines(
      [
        { meetingPrice: 1600000, currentPrice: 1600000, gone: 'unknown', dangerous: false },
        { meetingPrice: 1700000, currentPrice: 1700000, gone: null, dangerous: false },
      ],
      1639500,
    );
    expect(lines.today?.prices).toEqual([1700000]);
    expect(lines.todayGone).toEqual({ probableSale: 0, withdrawn: 0, unknown: 1 });
    expect(lines.today?.sentence).toContain('1 annonce a disparu : 1 retirée, durée inconnue.');
  });

  it('un plus dangereux disparu ne marque pas la ligne d’aujourd’hui', () => {
    const lines = buildPriceLines(
      competitors.map((item, index) => ({ ...item, dangerous: index === 2 })),
      1639500,
    );
    expect(lines.meeting?.dangerousPrice).toBe(1720000);
    expect(lines.today?.dangerousPrice).toBeNull();
  });

  it('les nouveaux venus : une phrase de fait, sinon rien', () => {
    const lines = buildPriceLines(competitors, 1639500, [1830000, 1580000]);
    expect(plain(lines.newcomers?.sentence)).toBe(
      '2 nouveaux venus à votre prix ou moins : le moins cher à 1 580 000 €, 59 500 € sous le vôtre.',
    );
    expect(NO_NEWCOMER_LABEL).toBe('Aucun nouveau venu retenu depuis le rendez-vous');
  });

  it('sans aucun prix, pas de ligne', () => {
    expect(buildPriceLines([], null)).toMatchObject({ meeting: null, today: null, scale: null });
  });
});

describe('le point daté', () => {
  it('conclut chaque concurrent, compte, et se relit tel quel', () => {
    const summary = buildMarketUpdateSummary(input());
    expect(summary.competitors.map((item) => item.state)).toEqual([
      'unread',
      'probable_sale',
      'withdrawn',
      'dropped',
      'dropped',
    ]);
    const probable = summary.competitors[1];
    expect(probable.daysOnMarket).toBe(150);
    expect(probable.conclusion).toMatchObject({
      kind: 'probable_sale',
      estimatedMin: 1529000,
      estimatedMax: 1614000,
    });
    expect(summary.competitors[2].daysOnMarket).toBe(320);
    expect(summary.competitors[3]).toMatchObject({ gapAmount: -60000, gapPercent: -3.6 });
    expect(summary.competitors[0].dangerous).toBe(true);
    expect(summary.counts).toMatchObject({
      read: 3,
      dropped: 2,
      probableSale: 1,
      withdrawn: 1,
      unread: 1,
      unreadable: 0,
      goneUnknown: 0,
    });
    expect(marketUpdateLine(summary)).toBe(
      '3 annonces relues · 2 baisses · 1 vente probable · 1 retiré sans vente · 1 prix au rendez-vous non relu',
    );
    expect(droppedSinceMeetingLabel(summary)).toBe('Ont baissé depuis le rendez-vous : 2 sur 4');
    expect(parseMarketUpdateSummary(JSON.parse(JSON.stringify(summary)))).toEqual(summary);
    expect(parseMarketUpdateSummary({ version: 2 })).toBeNull();
    // Un point écrit avant les champs ajoutés ensuite se relit, avec leurs valeurs par défaut.
    const early = JSON.parse(JSON.stringify(summary)) as Record<string, unknown>;
    const without = (value: unknown, keys: string[]): Record<string, unknown> =>
      Object.fromEntries(
        Object.entries(value as Record<string, unknown>).filter(([key]) => !keys.includes(key)),
      );
    const earlyCompetitors = (early.competitors as unknown[]).map((item) =>
      without(item, ['shownAtMeeting', 'readToday']),
    );
    const earlyCounts = without(early.counts, ['goneUnknown']);
    const earlyLines = early.lines as Record<string, unknown>;
    const earlyGone = without(earlyLines.todayGone, ['unknown']);
    const reread = parseMarketUpdateSummary({
      ...early,
      competitors: earlyCompetitors,
      counts: earlyCounts,
      lines: { ...earlyLines, todayGone: earlyGone },
    });
    expect(reread?.competitors[0]).toMatchObject({ shownAtMeeting: true, readToday: null });
    expect(reread?.counts.goneUnknown).toBe(0);
    expect(reread?.lines.todayGone.unknown).toBe(0);
    expect(plain(competitorFactLine(summary.competitors[3], MADE_AT.toISOString()))).toBe(
      '1 650 000 € au rendez-vous → 1 590 000 € aujourd’hui · −3,6 % · baisse vue le 15/11/2026 · en vente depuis 142 jours',
    );
    expect(plain(competitorFactLine(summary.competitors[0], MADE_AT.toISOString()))).toMatch(
      /^Prix au rendez-vous non relu ; prix du jour : 1 690 000 €/,
    );
  });

  it('une annonce disparue sans durée connue (M101) n’est jamais « toujours en vente »', () => {
    const summary = buildMarketUpdateSummary({
      ...input(),
      competitors: [
        row(ids[0], 0, 1500000, {
          listing_gone_at: '2026-11-03T09:00:00.000Z',
          listing_published_at: null,
          days_on_market: null,
          read_today: false,
        }),
      ],
    });
    expect(summary.competitors[0]).toMatchObject({ state: 'gone', conclusion: null });
    expect(summary.counts).toMatchObject({ read: 0, unreadable: 0, goneUnknown: 1 });
    expect(summary.lines.today).toBeNull();
    expect(marketUpdateLine(summary)).toBe('0 annonce relue · 1 retirée, durée inconnue');
    expect(competitorFactLine(summary.competitors[0], MADE_AT.toISOString())).toBe(
      'Retirée le 03/11/2026 : durée en vente inconnue, aucune conclusion',
    );
  });

  it('relues et illisibles viennent de la base, jamais du navigateur', () => {
    const summary = buildMarketUpdateSummary({
      ...input(),
      competitors: [
        row(ids[0], 0, 1500000, { read_today: false }),
        row(ids[1], 1, 1500000, { read_today: null }),
        row(ids[2], 2, 1500000, { read_today: true }),
      ],
    });
    expect(summary.counts).toMatchObject({ read: 1, unreadable: 1 });
    expect(marketUpdateLine(summary)).toContain('1 illisible');
  });

  it('un prix du rendez-vous non relu ne devient jamais une baisse de 0 %', () => {
    const summary = buildMarketUpdateSummary({
      ...input(),
      competitors: [
        row(ids[0], 0, 1500000, { meeting_price: 1690000, meeting_price_source: 'current' }),
      ],
    });
    expect(summary.competitors[0]).toMatchObject({ state: 'unread', gapPercent: null });
  });
});

// Le client factice : chaque table rend ses lignes, quels que soient les filtres (ils sont
// prouvés en base par les tests SQL).
function fakeClient(tables: Record<string, unknown[] | unknown>) {
  const from = (name: string) => {
    const rows = tables[name];
    const query: Record<string, unknown> = {};
    const chain = () => query;
    for (const method of ['select', 'eq', 'neq', 'in', 'gt', 'order', 'not']) {
      query[method] = chain;
    }
    query.maybeSingle = async () => ({
      data: Array.isArray(rows) ? (rows[0] ?? null) : (rows ?? null),
      error: null,
    });
    query.then = (resolve: (value: { data: unknown; error: null }) => void) =>
      resolve({ data: Array.isArray(rows) ? rows : [], error: null });
    return query;
  };
  return {
    from,
    storage: {
      from: () => ({
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn.test/${path}` } }),
        createSignedUrls: async (paths: string[]) => ({
          data: paths.map((path) => ({ path, signedUrl: `https://signed.test/${path}?sig=1` })),
          error: null,
        }),
      }),
    },
  } as unknown as Parameters<typeof loadMarketUpdate>[0];
}

const AGENCY = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PROJECT = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const UPDATE = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

async function loadFixture() {
  const summary = {
    ...buildMarketUpdateSummary(input()),
    // Une proposition payée gardée sur le point (127 B) : adresse d'annonce et titre piège, qui ne
    // doivent jamais atteindre le document ni la page du vendeur.
    newcomersSearch: {
      madeAt: MADE_AT.toISOString(),
      found: 1,
      billed: 20,
      limitedToPrice: true,
      excludedNoDate: 0,
      proposed: [
        {
          url: TRAP_URL,
          label: 'Maison · 6 pièces · 190 m² · Mougins',
          price: 1495000,
          pricePerSqm: null,
          surfaceArea: 190,
          roomsCount: 6,
          propertyType: 'house',
          city: 'Mougins',
          photoUrls: [],
          seenSince: '2026-10-15T00:00:00.000Z',
          energyClass: null,
          snapshot: { title: TRAP_TITLE },
        },
      ],
    },
  };
  const client = fakeClient({
    project_market_updates: [
      { id: UPDATE, made_at: MADE_AT.toISOString(), summary, project_id: PROJECT },
    ],
    projects: [
      { id: PROJECT, seller_name: 'M. Lefebvre', advisor_id: null, status: 'meeting_completed' },
    ],
    subject_properties: [
      {
        property_type: 'house',
        city: 'Mougins',
        district: null,
        surface_area: 210,
        rooms_count: 7,
        bedrooms_count: 4,
        energy_rating: 'C',
        ges_rating: 'B',
        general_condition: 'good',
        outdoor_spaces: ['garden', 'terrace'],
        parking_types: ['garage'],
        exposure: 'south',
        photo_urls: [],
      },
    ],
    comparables: ids.map((id, index) => ({
      id,
      surface_area: 210 + index,
      rooms_count: 7,
      bedrooms_count: 4,
      energy_rating: 'D',
      ges_rating: null,
      general_condition: null,
      outdoor_spaces: ['garden'],
      parking_types: [],
      exposure: null,
      photo_urls: [`https://cdn.portail.test/${id}-1.jpg`, `https://cdn.portail.test/${id}-2.jpg`],
      synthesis_hide_photo: index === 3,
      // Ce que la base pourrait rendre de plus : rien de cela ne doit sortir.
      title: TRAP_TITLE,
      listing_url: TRAP_URL,
      address: '12 rue des Lilas',
      locator_address: '12 rue des Lilas, 06600 Antibes',
      sold_by: 'agency',
      exclusivity: 'yes',
    })),
    agencies: [{ name: 'Agence Test' }],
    agency_branding: [],
    profiles: [],
  });
  const document = await loadMarketUpdate(client, PROJECT, AGENCY, UPDATE);
  if (!document) throw new Error('document attendu');
  const html = renderToStaticMarkup(createElement(MarketUpdateDocument, { document }));
  return { document, html };
}

describe('le document Point marché', () => {
  it('ne contient ni adresse, ni titre, ni lien d’annonce, ni « Vendu par », ni « estimation »', async () => {
    const { document, html } = await loadFixture();
    const serialized = JSON.stringify(document);
    expect(document.summary.newcomersSearch?.proposed).toEqual([]);
    for (const forbidden of [
      'Dupont',
      'rue des Lilas',
      'agence-dupont',
      'Vendu par',
      'Exclusivit',
      'sold_by',
    ]) {
      expect(serialized).not.toContain(forbidden);
      expect(html).not.toContain(forbidden);
    }
    expect(html).not.toMatch(/[Ee]stimation|Publié le|disponible/);
    expect(html).toContain('Déduit de la durée de commercialisation au retrait');
  });

  it('une fiche par concurrent dans l’ordre, le bloc des prix, le classement (M129), le cadre doré', async () => {
    const { document, html } = await loadFixture();
    expect(document.competitors.map((item) => item.position)).toEqual([1, 2, 3, 4, 5]);
    expect(html.split('data-testid="market-update-competitor"').length - 1).toBe(5);
    // Mission 129 — le classement remplace les trois lignes.
    expect(html).not.toContain('data-testid="price-lines-figure"');
    expect(html).toContain('data-testid="ranking-verdict"');
    // Jean-Guy, 05/11 — le verdict dès la couverture (document, PDF et lien).
    expect(html).toContain('data-testid="market-update-cover-verdict"');
    expect(html.split('data-testid="ranking-step"').length - 1).toBe(3);
    const listed = document.summary.competitors.filter(
      (item) => item.conclusion == null && item.state !== 'gone' && item.currentPrice != null,
    ).length;
    expect(html.split('data-testid="ranking-row"').length - 1).toBe(listed + 1);
    expect(html).toContain('VOTRE BIEN');
    // Sans nouveau venu retenu, la troisième étape ne compte rien.
    expect(html).toContain('Aucun nouveau venu retenu');
    expect(html).not.toContain('NaN');
    expect(html).toContain('Vente probable, négociation estimée de 5 à 10 %');
    expect(html).toContain('Retiré du marché sans vente');
    expect(html).toContain('Non relu');
    // Une seule couleur à lire, celle de la place : la couleur M116 du prix disparaît de la page.
    expect(html).not.toContain('Prix aligné sur le marché');
    // Le plus dangereux : cadre doré et bandeau sur sa fiche, et sur sa ligne du classement.
    expect(html).toContain('data-testid="market-update-dangerous-band"');
    expect(html).toContain('Le plus dangereux, selon vous');
    expect(html).toContain('data-testid="ranking-dangerous"');
  });

  it('un concurrent hors Live compte dans les lignes, pas dans les pages (M110, M113)', async () => {
    const summary = buildMarketUpdateSummary({
      ...input(),
      competitors: [row(ids[0], 0, 1690000), row(ids[1], 1, 1700000, { excluded_from_live: true })],
    });
    expect(summary.lines.meeting?.prices).toEqual([1690000, 1700000]);
    const html = renderToStaticMarkup(
      createElement(MarketUpdateDocument, {
        document: {
          updateId: UPDATE,
          madeAt: MADE_AT.toISOString(),
          sellerName: '',
          propertyLabel: null,
          subjectLabel: 'Votre bien',
          commune: null,
          coverPhotoUrl: null,
          summary,
          competitors: [],
          agency: {
            name: 'Agence Test',
            logoUrl: null,
            postalAddress: null,
            professionalCard: null,
            professionalCardIssuer: null,
            financialGuarantee: null,
            advisorName: null,
            advisorPhone: null,
            advisorEmail: null,
            advisorPhotoUrl: null,
            advisorQr: null,
          },
          brandDeclarations: '',
        },
      }),
    );
    expect(html.split('data-testid="market-update-competitor"').length - 1).toBe(1);
    expect(html).not.toContain('Pour </p>');
  });

  it('un bien retenu après le rendez-vous mais en vente avant : sa section, hors des nouveaux venus (cas de Biot)', () => {
    const summary = buildMarketUpdateSummary({
      ...input(),
      competitors: [
        ...input().competitors,
        row('66666666-6666-4666-8666-666666666666', 5, 1500000, {
          meeting_frozen_at: null,
          meeting_price: null,
          meeting_price_source: null,
          listing_published_at: '2025-06-17',
        }),
      ],
    });
    const html = renderToStaticMarkup(
      createElement(MarketUpdateDocument, {
        document: {
          updateId: UPDATE,
          madeAt: MADE_AT.toISOString(),
          sellerName: '',
          propertyLabel: null,
          subjectLabel: 'Votre bien',
          commune: null,
          coverPhotoUrl: null,
          summary,
          competitors: [],
          agency: {
            name: 'Agence Test',
            logoUrl: null,
            postalAddress: null,
            professionalCard: null,
            professionalCardIssuer: null,
            financialGuarantee: null,
            advisorName: null,
            advisorPhone: null,
            advisorEmail: null,
            advisorPhotoUrl: null,
            advisorQr: null,
          },
          brandDeclarations: '',
        },
      }),
    );
    expect(html).toContain('data-testid="market-update-earlier"');
    expect(html).toContain('Retenus depuis le rendez-vous');
    expect(html).toContain('En vente avant le rendez-vous, non montré alors');
    expect(html).not.toContain('data-testid="market-update-newcomers"');
    expect(html).not.toContain('Nouveaux venus retenus');
  });

  it('« Sans photo » retire les photos du document et de ce que reçoit la page ; 3 photos au plus', async () => {
    const { document, html } = await loadFixture();
    expect(document.competitors[3].photoUrls).toEqual([]);
    expect(document.competitors[3]).toMatchObject({ hasPhoto: true, photoHidden: true });
    expect(html).not.toContain(`${ids[3]}-1.jpg`);
    expect(html).toContain(`${ids[0]}-1.jpg`);
    expect(document.competitors[0].photoUrls.length).toBeLessThanOrEqual(3);
  });

  it('« Avantage pour vous » est vert, « Avantage pour lui » orange, partout où la grille s’affiche', () => {
    const competitor = {
      id: ids[0],
      position: 1,
      label: 'Maison · 7 pièces · 210 m² · Mougins',
      surfaceArea: 210,
      photoUrl: null,
      hasPhoto: false,
      photoHidden: false,
      features: [
        {
          label: 'Surface',
          value: '200 m²',
          sellerValue: '210 m²',
          status: 'competitor_weakness' as const,
        },
        {
          label: 'Piscine',
          value: 'Oui',
          sellerValue: 'Non',
          status: 'competitor_advantage' as const,
        },
      ],
      serious: null,
      revealed: null,
    };
    const cell = (html: string, label: string) =>
      html.match(new RegExp(`class="([^"]*)">${label}<`))?.[1] ?? '';
    const html = renderToStaticMarkup(createElement(Grid, { competitor }));
    expect(cell(html, 'Avantage pour vous')).toContain('emerald');
    expect(cell(html, 'Avantage pour lui')).toContain('amber');
  });

  it('le code du document ne lit ni titre, ni lien, ni adresse, ni vendeur', () => {
    const sources = [
      'src/features/market-update/components/market-update-document.tsx',
      'src/features/market-update/components/price-ranking.tsx',
      'src/features/market-update/services/price-ranking.ts',
      'src/features/market-update/components/market-update-panel.tsx',
      'src/features/market-update/services/market-update-summary.ts',
      'src/features/market-update/queries/load-market-update.ts',
    ].map((path) => readFileSync(path, 'utf8'));
    for (const source of sources) {
      expect(source).not.toMatch(
        /\.title\b|['"]title['"]|listing_url|listingUrl|locator_address|\.address\b|['"]address['"]|sold_by|exclusivity/,
      );
    }
  });
});

describe('le lien du Point marché', () => {
  it('un jeton de 43 caractères, dont seul le condensat est gardé', () => {
    const token = newMarketUpdateToken();
    expect(token).toMatch(MARKET_UPDATE_TOKEN_PATTERN);
    expect(hashMarketUpdateToken(token)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('seule la forme exacte du lien s’ouvre sans compte', () => {
    const token = newMarketUpdateToken();
    expect(isPublicPath(`/point-marche/${token}`)).toBe(true);
    expect(isPublicPath('/point-marche/')).toBe(false);
    expect(isPublicPath(`/point-marche/${token}/x`)).toBe(false);
    expect(isPublicPath('/builder/x/point-marche')).toBe(false);
  });
});
