import { createElement } from 'react';

import { frenchLeaks } from '@/test-fixtures/french-leaks';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { MarketStudyDocument } from '@/features/market-study/components/market-study-document';
import { loadMarketStudy } from '@/features/market-study/queries/load-market-study';
import {
  studyPrice,
  buildMarketStudy,
  type MarketStudyCompetitorRow,
  type MarketStudyInput,
} from '@/features/market-study/services/build-market-study';
import {
  marketStudyAdvisorPath,
  marketStudyPath,
  marketStudyShareHrefs,
  marketStudyShareMessage,
  newMarketStudyToken,
} from '@/features/market-study/services/market-study-link';
import { isPublicPath } from '@/lib/supabase/public-paths';

// Mission 131 — l'Étude de marché : une fiche par concurrent RETENU (hors Live compris), dans
// l'ordre du dossier, puis où en est le prix du vendeur au jour J ; jamais rien d'une annonce
// qu'un concurrent ne publie pas devant le vendeur.

const TRAP_TITLE = 'EXCLUSIVITÉ Agence Dupont 12 rue des Lilas';
const TRAP_URL = 'https://www.agence-dupont-immobilier.fr/annonce/vente-12-rue-des-lilas';
const MADE_AT = '2026-11-05T10:00:00.000Z';

const AGENCY_BLOCK: MarketStudyInput['agency'] = {
  name: 'Agence Test',
  logoUrl: null,
  postalAddress: '1 place du Marché, 06600 Antibes',
  professionalCard: 'CPI 0605 2026 000 000 001',
  professionalCardIssuer: 'CCI Nice Côte d’Azur',
  financialGuarantee: null,
  advisorName: 'Camille Martin',
  advisorPhone: '06 39 98 00 01',
  advisorEmail: 'camille@example.com',
  advisorPhotoUrl: null,
  advisorQr: null,
};

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
    surface_area: 120,
    city: 'Biot',
    district: null,
    display_order: order,
    created_at: '2026-10-01T09:00:00.000Z',
    energy_rating: 'D',
    ges_rating: null,
    general_condition: null,
    outdoor_spaces: ['garden'],
    parking_types: [],
    exposure: null,
    photo_urls: [`https://cdn.portail.test/${id}-1.jpg`, `https://cdn.portail.test/${id}-2.jpg`],
    price_drop_amount: null,
    price_drop_percentage: null,
    days_on_market: null,
    listing_published_at: '2026-09-06T00:00:00.000Z',
    listing_gone_at: null,
    synthesis_hide_photo: false,
    ...extra,
  };
}

// Ce que la base pourrait rendre de plus : rien de cela ne doit sortir.
const traps = {
  title: TRAP_TITLE,
  listing_url: TRAP_URL,
  address: '12 rue des Lilas',
  locator_address: '12 rue des Lilas, 06410 Biot',
  sold_by: 'agency',
  exclusivity: 'yes',
};

function input(extra: Partial<MarketStudyInput> = {}): MarketStudyInput {
  return {
    madeAt: MADE_AT,
    sellerName: 'M. et Mme Garcia',
    property: {
      property_type: 'house',
      city: 'Biot',
      district: null,
      surface_area: 113,
      rooms_count: 5,
      bedrooms_count: 3,
      energy_rating: 'C',
      ges_rating: null,
      general_condition: null,
      outdoor_spaces: ['garden', 'terrace'],
      parking_types: ['garage'],
      exposure: null,
    },
    coverPhotoUrl: null,
    competitors: [
      { ...competitor('c3', 2, 640000), ...traps },
      { ...competitor('c1', 0, 590000, { price_drop_amount: 20000, price_drop_percentage: 3.3 }) },
      // Retenu mais hors Live : il est dans l'Étude comme les autres.
      { ...competitor('c2', 1, 610000, { synthesis_hide_photo: true }) },
    ] as MarketStudyCompetitorRow[],
    studyPrice: null,
    agency: AGENCY_BLOCK,
    brandDeclarations: '',
    ...extra,
  };
}

describe('le constructeur de l’Étude de marché', () => {
  it('une fiche par concurrent retenu, hors Live compris, dans l’ordre du dossier', () => {
    const study = buildMarketStudy(input());
    expect(study.competitors.map((item) => [item.id, item.position])).toEqual([
      ['c1', 1],
      ['c2', 2],
      ['c3', 3],
    ]);
    expect(study.competitors[0].label.replace(/\s/g, ' ')).toBe(
      'Maison · 5 pièces · 120 m² · Biot',
    );
    expect(study.competitors[0].pricePerSquareMeter).toBe(4917);
    expect(study.competitors[0].daysOnMarket).toEqual({ days: 60, approximate: false });
    expect(study.competitors[0].priceDrop).toEqual({ amount: 20000, percent: 3.3 });
    expect(study.competitors[1].priceDrop).toBeNull();
    expect(study.coverFigures.map((figure) => figure.label)).toEqual([
      'Surface',
      'Pièces',
      'Concurrents étudiés',
    ]);
  });

  it('« Sans photo » : la photo ne part pas, l’écran du conseiller sait qu’elle existe', () => {
    const study = buildMarketStudy(input());
    const hidden = study.competitors.find((item) => item.id === 'c2');
    expect(hidden).toMatchObject({ photoUrls: [], hasPhoto: true, photoHidden: true });
    expect(JSON.stringify(study)).not.toContain('c2-1.jpg');
    expect(study.competitors[0].photoUrls).toHaveLength(2);
  });

  it('la grille se lit du côté du vendeur (M129) : un critère sans donnée n’a pas de ligne', () => {
    const study = buildMarketStudy(input());
    const labels = study.competitors[0].features.map((feature) => feature.label);
    expect(labels).toContain('Surface');
    expect(study.competitors[0].features.every((feature) => feature.value !== '—')).toBe(true);
  });

  // Mission 163 C — seul le prix de commercialisation CONVENU classe le bien : un prix enregistré,
  // au Live ou à la conclusion, dossier conclu ou non (Jean-Guy, 20/11) ; jamais l'analyse.
  it('le prix convenu : un prix de commercialisation enregistré, sinon rien', () => {
    const signed = { outcome: 'signed', commercialization_price: 615000 };
    expect(studyPrice(signed)).toEqual({ amount: 615000, proposed: false });
    // Un prix du Live, dossier pas encore conclu : retenu ensemble (le remplir vaut accord, M85).
    expect(studyPrice({ ...signed, outcome: null })).toEqual({ amount: 615000, proposed: false });
    // Toute autre issue que le mandat signé : « le prix proposé », comme le Suivi (23/11).
    for (const outcome of ['follow_up', 'sold_elsewhere', 'withdrawn'])
      expect(studyPrice({ ...signed, outcome })).toEqual({ amount: 615000, proposed: true });
    // La base rend un `numeric` en texte.
    expect(studyPrice({ ...signed, commercialization_price: '615000' })?.amount).toBe(615000);
    expect(studyPrice({ ...signed, commercialization_price: null })).toBeNull();
    expect(studyPrice({ ...signed, commercialization_price: 0 })).toBeNull();
    expect(studyPrice(null)).toBeNull();

    const agreed = buildMarketStudy(input({ studyPrice: { amount: 615000, proposed: false } }));
    expect(agreed.ranking.subject).toMatchObject({ price: 615000, rank: 3 });
    expect(agreed.ranking.rows.map((row) => row.key)).toEqual(['c1', 'c2', 'subject', 'c3']);
    expect(agreed.ranking.rows.find((row) => row.subject)?.detail).toBe('prix retenu ensemble');

    const low = buildMarketStudy(input({ studyPrice: { amount: 580000, proposed: false } }));
    expect(low.ranking.subject).toMatchObject({ rank: 1, tier: 'green' });
    expect(low.ranking.subject?.word).toBe('Pas de problème');

    const none = buildMarketStudy(input());
    expect(none.ranking.subject).toBeNull();
    expect(none.ranking.rows.some((row) => row.subject)).toBe(false);
    expect(none.ranking.rows.map((row) => row.key)).toEqual(['c1', 'c2', 'c3']);
  });

  it('à égalité de prix, le vendeur prend le meilleur rang ; une annonce retirée sort du classement', () => {
    const study = buildMarketStudy(
      input({
        studyPrice: { amount: 610000, proposed: false },
        competitors: [
          competitor('c1', 0, 590000),
          competitor('c2', 1, 610000),
          competitor('c3', 2, 640000, { listing_gone_at: '2026-11-01T00:00:00.000Z' }),
        ],
      }),
    );
    expect(study.ranking.rows.map((row) => row.key)).toEqual(['c1', 'subject', 'c2']);
    expect(study.ranking.subject).toMatchObject({ rank: 2, total: 3 });
    expect(study.competitors.find((item) => item.id === 'c3')?.goneAt).toBe(
      '2026-11-01T00:00:00.000Z',
    );
  });

  it('aucun interdit dans la charge : ni titre, ni lien, ni adresse, ni « Vendu par », ni exclusivité', () => {
    const serialized = JSON.stringify(
      buildMarketStudy(input({ studyPrice: { amount: 615000, proposed: false } })),
    );
    for (const forbidden of [
      'Dupont',
      'rue des Lilas',
      'agence-dupont',
      'sold_by',
      'exclusivity',
      TRAP_TITLE,
      'listing_url',
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});

// Un client à tables, comme celui du Point marché : il rend ce que la base pourrait rendre de plus.
function fakeClient(tables: Record<string, unknown[]>) {
  const selected: Record<string, string> = {};
  const from = (name: string) => {
    const rows = tables[name];
    const query: Record<string, unknown> = {};
    const chain = () => query;
    for (const method of ['eq', 'neq', 'in', 'gt', 'order', 'not']) query[method] = chain;
    query.select = (columns: string) => {
      selected[name] = columns;
      return query;
    };
    query.maybeSingle = async () => ({ data: rows?.[0] ?? null, error: null });
    query.then = (resolve: (value: { data: unknown; error: null }) => void) =>
      resolve({ data: rows ?? [], error: null });
    return query;
  };
  const client = {
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
  } as unknown as Parameters<typeof loadMarketStudy>[0];
  return { client, selected };
}

const AGENCY = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PROJECT = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
// Mission 163 C — un montant d'analyse reconnaissable, cherché sous toutes ses écritures.
const ANALYSIS_TRAP = 987654;
const ANALYSIS_TRAP_PATTERN = /987\D?654/;
const CONCLUDED = {
  projects: [
    { id: PROJECT, seller_name: 'M. et Mme Garcia', advisor_id: null, status: 'meeting_completed' },
  ],
  // L'analyse figée à la conclusion, sur la ligne même que le chargeur lit : un second piège.
  project_meeting_conclusions: [
    {
      outcome: 'signed',
      commercialization_price: 615000,
      frozen_advisor_analysis: ANALYSIS_TRAP,
      frozen_advisor_price: ANALYSIS_TRAP,
    },
  ],
};

// Mission 140 — l'Étude d'un vendeur anglophone : tout en anglais, sauf les mentions légales.
describe('l’Étude de marché dans la langue du vendeur', () => {
  it('en anglais, rien ne reste du français hors des mentions légales et des noms propres', () => {
    const study = buildMarketStudy({ ...input(), language: 'en' });
    const html = renderToStaticMarkup(createElement(MarketStudyDocument, { document: study }));
    expect(html).toContain('Market study');
    expect(html).toContain('What this study tells you about your house');
    expect(
      frenchLeaks(html, [
        'M. et Mme Garcia',
        'Biot',
        'Agence Test',
        '1 place du Marché, 06600 Antibes',
        'Camille Martin',
      ]),
    ).toEqual([]);
  });

  // Mission 163 A — le titre-conclusion des biens en vente est sur la page de la première fiche ;
  // toutes les fiches restent, dans l'ordre ; sans concurrent, le chapitre disparaît.
  it('chaque fiche une fois, la première avec le titre de la section', () => {
    const all = input().competitors;
    for (const count of [all.length, 1, 0]) {
      const study = buildMarketStudy({ ...input(), competitors: all.slice(0, count) });
      const html = renderToStaticMarkup(createElement(MarketStudyDocument, { document: study }));
      const cards = html.match(/data-testid="market-study-competitor"/g) ?? [];
      expect(cards).toHaveLength(study.competitors.length);
      const title = html.indexOf('comme la vôtre');
      if (study.competitors.length === 0) expect(title).toBe(-1);
      else expect(title).toBeLessThan(html.indexOf('data-testid="market-study-competitor"'));
    }
  });

  it('en français, le message d’envoi ne change pas ; en anglais, il est en anglais', () => {
    expect(marketStudyShareMessage('https://x.test/e', 'Camille')).toContain(
      'Bonjour, voici l’Étude de marché de votre bien',
    );
    expect(marketStudyShareMessage('https://x.test/e', 'Camille', 'en')).toContain(
      'Hello, here is the market study for your property',
    );
  });
});

describe('le document de l’Étude de marché', () => {
  async function loadFixture(extra: Record<string, unknown[]> = {}) {
    const fake = fakeClient({
      projects: [
        { id: PROJECT, seller_name: 'M. et Mme Garcia', advisor_id: null, status: 'draft' },
      ],
      subject_properties: [{ ...input().property, photo_urls: [] }],
      comparables: input().competitors,
      // Mission 163 C — le piège : une analyse du conseiller en base, qu'aucune lecture ne prend.
      project_price_positionings: [{ advisor_comparative_market_price: ANALYSIS_TRAP }],
      project_meeting_conclusions: [],
      agencies: [{ name: 'Agence Test' }],
      agency_branding: [],
      profiles: [],
      ...extra,
    });
    const document = await loadMarketStudy(fake.client, PROJECT, AGENCY, new Date(MADE_AT));
    if (!document) throw new Error('document attendu');
    const html = renderToStaticMarkup(createElement(MarketStudyDocument, { document }));
    return { document, html, selected: fake.selected };
  }

  it('lit des colonnes autorisées seulement : ni titre, ni lien, ni adresse, ni vendeur, ni fourchette', async () => {
    const { selected } = await loadFixture();
    expect(selected.comparables).not.toMatch(
      /title|listing_url|address|sold_by|exclusivity|locator|advisor_notes|listing_description/,
    );
    // Mission 163 C — l'analyse du conseiller n'est jamais lue.
    expect(selected.project_price_positionings).toBeUndefined();
    expect(selected.project_meeting_conclusions).toBe('outcome, commercialization_price');
    expect(selected.subject_properties).not.toMatch(/advisor_|vigilance|weak/);
  });

  it('ne contient ni adresse, ni titre, ni lien d’annonce, ni « Vendu par », ni « estimation »', async () => {
    const { document, html } = await loadFixture();
    for (const forbidden of [
      'Dupont',
      'rue des Lilas',
      'agence-dupont',
      'Vendu par',
      'Exclusivit',
    ]) {
      expect(JSON.stringify(document)).not.toContain(forbidden);
      expect(html).not.toContain(forbidden);
    }
    expect(html).not.toMatch(/[Ee]stimation|disponible|[Dd]émo/);
    expect(html).toContain(
      'Les prix des biens en vente sont ceux des annonces, pas des prix de vente',
    );
  });

  it('une fiche par retenu, la ligne VOTRE BIEN au prix convenu et son verdict', async () => {
    const { html } = await loadFixture(CONCLUDED);
    expect(html.split('data-testid="market-study-competitor"').length - 1).toBe(3);
    expect(html).toContain('data-subject="true"');
    expect(html).toContain('le prix retenu ensemble');
    expect(html).not.toContain('le prix que je vous propose');
    expect(html).toContain('data-testid="market-study-verdict"');
    // Mission 163 A — la couverture n'a plus de verdict (le Point marché garde le sien).
    expect(html).not.toContain('market-study-cover-verdict');
    expect(html).toContain('Baisse de prix connue');
  });

  // Mission 163 C — sans prix convenu, le chapitre « Où se place votre prix » disparaît du résumé
  // et de la numérotation, même avec une analyse du conseiller en base, et son montant n'est nulle
  // part : ni dans la page, ni dans ce que reçoit le navigateur (remplace M131, « sinon à
  // l'analyse du conseiller », pour l'Étude).
  it('sans prix convenu : ni classement, ni ligne vendeur, ni verdict, ni l’analyse', async () => {
    for (const extra of <Record<string, unknown[]>[]>[
      {},
      // Un Live mené sans prix enregistré : la ligne de conclusion existe, sans prix.
      { project_meeting_conclusions: [{ commercialization_price: null }] },
    ]) {
      const { document, html } = await loadFixture(extra);
      expect(html).not.toContain('data-subject="true"');
      expect(html).not.toContain('market-study-verdict');
      expect(html).not.toContain('data-testid="market-study-ranking"');
      expect(document.ranking.subject).toBeNull();
      expect(document.story.summary.items.map((item) => item.chapter)).toEqual(['competitors']);
      expect(document.story.summary.value).toContain('Le prix, nous le fixerons ensemble.');
      for (const text of [JSON.stringify(document), html]) {
        expect(text).not.toMatch(ANALYSIS_TRAP_PATTERN);
        expect(text).not.toContain('que je vous propose');
      }
    }
  });

  // Mission 163 C — « Sur quel prix partons-nous ? » rempli au Live vaut accord (M85) : le bien est
  // classé, le dossier n'étant pas encore conclu (la ligne de conclusion sans issue, M111).
  it('un prix saisi au Live, dossier pas encore conclu : le bien est classé', async () => {
    const { document, html } = await loadFixture({
      projects: [
        {
          id: PROJECT,
          seller_name: 'M. et Mme Garcia',
          advisor_id: null,
          status: 'ready_for_meeting',
        },
      ],
      project_meeting_conclusions: [
        { outcome: null, commercialization_price: 615000, frozen_advisor_analysis: ANALYSIS_TRAP },
      ],
    });
    expect(document.ranking.subject?.price).toBe(615000);
    expect(document.story.summary.items[0]?.chapter).toBe('ranking');
    expect(html).toContain('data-testid="market-study-verdict"');
    for (const text of [JSON.stringify(document), html])
      expect(text).not.toMatch(ANALYSIS_TRAP_PATTERN);
  });

  // Mission 163 C — une conclusion « À relancer » avec un prix : « le prix proposé », comme le
  // Suivi ; « le prix retenu ensemble » reste pour un mandat signé (Jean-Guy, 23/11).
  it('à relancer avec un prix : classé au « prix proposé », jamais « retenu ensemble »', async () => {
    const { document, html } = await loadFixture({
      ...CONCLUDED,
      project_meeting_conclusions: [
        {
          outcome: 'follow_up',
          commercialization_price: 615000,
          frozen_advisor_analysis: ANALYSIS_TRAP,
        },
      ],
    });
    expect(document.ranking.subject).toMatchObject({ price: 615000, proposed: true });
    expect(html).toContain('prix proposé');
    expect(html).not.toContain('retenu ensemble');
    expect(document.story.summary.value).toContain('Le prix proposé\u00a0:');
    expect(document.story.next.is).toContain('elle situe le prix proposé');
    for (const text of [JSON.stringify(document), html])
      expect(text).not.toMatch(ANALYSIS_TRAP_PATTERN);
  });

  it('au prix convenu, l’analyse du conseiller n’apparaît pas non plus', async () => {
    const { document, html } = await loadFixture(CONCLUDED);
    expect(document.ranking.subject?.price).toBe(615000);
    expect(document.story.summary.value).toContain('nous l’avons retenu ensemble');
    for (const text of [JSON.stringify(document), html])
      expect(text).not.toMatch(ANALYSIS_TRAP_PATTERN);
  });

  it('un dossier archivé ou d’une autre agence n’a pas d’Étude', async () => {
    const fake = fakeClient({ projects: [] });
    expect(await loadMarketStudy(fake.client, PROJECT, AGENCY)).toBeNull();
  });

  it('chaque section commence une page neuve, une fiche ne se coupe jamais', async () => {
    const { html } = await loadFixture(CONCLUDED);
    const pages = [...html.matchAll(/<section class="([^"]*)" data-study-page="([a-z]+)"/g)];
    expect(pages.map((page) => page[2])).toEqual([
      'cover',
      'summary',
      'competitors',
      'competitors',
      'ranking',
      'next',
    ]);
    for (const [, classes, name] of pages)
      if (name !== 'cover') expect(classes).toContain('print:break-before-page');
    expect(html).toMatch(/break-inside-avoid[^"]*" data-testid="market-study-competitor"/);
  });
});

describe('le lien de l’Étude de marché', () => {
  it('s’ouvre sans compte par son jeton de 43 caractères, et rien d’autre', () => {
    const token = newMarketStudyToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(isPublicPath(marketStudyPath(token))).toBe(true);
    expect(isPublicPath('/etude-de-marche')).toBe(false);
    expect(isPublicPath('/etude-de-marche/')).toBe(false);
    expect(isPublicPath(`/etude-de-marche/${'A'.repeat(42)}`)).toBe(false);
    expect(isPublicPath(`/etude-de-marche/${'A'.repeat(43)}/autre`)).toBe(false);
    expect(isPublicPath(marketStudyAdvisorPath(PROJECT))).toBe(false);
  });

  it('le message prérempli : signé du prénom, sans montant ; l’outil n’envoie rien', () => {
    const message = marketStudyShareMessage('https://acm.test/etude-de-marche/x', 'Camille');
    expect(message).toContain('https://acm.test/etude-de-marche/x');
    expect(message.split('\n').at(-1)).toBe('Camille');
    expect(message).not.toMatch(/€|\d{3} \d{3}/);
    const hrefs = marketStudyShareHrefs(message, '05/11/2026');
    expect(hrefs.sms.startsWith('sms:')).toBe(true);
    expect(hrefs.whatsapp.startsWith('https://wa.me/?text=')).toBe(true);
    expect(decodeURIComponent(hrefs.email)).toContain('Étude de marché du 05/11/2026');
  });
});
