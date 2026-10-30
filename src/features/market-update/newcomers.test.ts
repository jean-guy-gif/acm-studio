import { describe, expect, it } from 'vitest';

import type { CompetitorCandidate } from '@/features/competitor-search/types';
import {
  marketUpdateShareHrefs,
  marketUpdateShareMessage,
} from '@/features/market-update/services/market-update-share';
import {
  buildMarketUpdateSummary,
  marketUpdateLine,
  parseMarketUpdateSummary,
  type MarketUpdateCompetitorRow,
} from '@/features/market-update/services/market-update-summary';
import { filterNewcomers } from '@/features/market-update/services/newcomers-filter';
import { buildPriceLines } from '@/features/market-update/services/price-lines';

// Mission 127 B — les nouveaux venus : le filtre « vu sur le marché après le rendez-vous, absent du
// dossier, à votre prix ou moins », le point qui les porte, le message de partage.

const CONCLUDED = '2026-10-08T15:00:00.000Z';
const candidate = (
  url: string,
  price: number | null,
  onlineSince: string | null,
  over: Partial<CompetitorCandidate> = {},
): CompetitorCandidate => ({
  key: url,
  url,
  title: 'EXCLUSIVITÉ Agence Dupont 12 rue des Lilas',
  price,
  surfaceArea: 200,
  roomsCount: 7,
  propertyType: 'house',
  pricePerSqm: null,
  landArea: null,
  city: 'Mougins',
  photoUrls: ['https://cdn.portail.test/a.jpg', 'http://insecure.test/b.jpg'],
  isNewBuild: false,
  streamEstate: {
    propertyId: url,
    originSite: 'SeLoger',
    onlineSince,
    lastSeenAt: null,
    priceDrops: [],
  },
  ...over,
});

describe('le filtre des nouveaux venus', () => {
  it('garde les biens vus après le rendez-vous, inconnus du dossier, à votre prix ou moins', () => {
    const outcome = filterNewcomers(
      [
        candidate(
          'https://www.seloger.com/annonces/achat/maison/mougins-06/A1.htm',
          1620000,
          '2026-10-18T00:00:00.000Z',
        ),
        candidate(
          'https://www.seloger.com/annonces/achat/maison/mougins-06/A2.htm',
          1495000,
          '2026-10-15T00:00:00.000Z',
        ),
        // Déjà dans le dossier (la même adresse, autrement écrite).
        candidate(
          'https://www.seloger.com/annonces/achat/maison/mougins-06/A3.htm?utm=x',
          1500000,
          '2026-10-20T00:00:00.000Z',
        ),
        // Vu avant le rendez-vous.
        candidate(
          'https://www.seloger.com/annonces/achat/maison/mougins-06/A4.htm',
          1500000,
          '2026-09-01T00:00:00.000Z',
        ),
        // Sans date de première vue : écarté et compté (M61).
        candidate('https://www.seloger.com/annonces/achat/maison/mougins-06/A5.htm', 1500000, null),
        // Au-dessus du prix de commercialisation.
        candidate(
          'https://www.seloger.com/annonces/achat/maison/mougins-06/A6.htm',
          1700000,
          '2026-10-20T00:00:00.000Z',
        ),
        // Sans prix.
        candidate(
          'https://www.seloger.com/annonces/achat/maison/mougins-06/A7.htm',
          null,
          '2026-10-20T00:00:00.000Z',
        ),
      ],
      {
        concludedAt: CONCLUDED,
        knownUrls: ['https://www.seloger.com/annonces/achat/maison/mougins-06/A3.htm'],
        priceCeiling: 1639500,
      },
    );
    expect(outcome.newcomers.map((item) => item.price)).toEqual([1495000, 1620000]);
    expect(outcome).toMatchObject({
      excludedKnown: 1,
      excludedBefore: 1,
      excludedNoDate: 1,
      excludedOverPrice: 1,
      excludedNoPrice: 1,
    });
    const first = outcome.newcomers[0];
    expect(first.label.replace(/[\u202f\u00a0]/g, ' ')).toBe(
      'Maison · 7 pièces · 200 m² · Mougins',
    );
    expect(first.photoUrls).toEqual(['https://cdn.portail.test/a.jpg']);
    expect(first.pricePerSqm).toBe(Math.round(1495000 / 200));
    // Le titre de l'annonce ne sert que l'import en attente (le snapshot de M101, côté conseiller) :
    // rien de ce que la carte montre ne le porte.
    const { snapshot, ...shown } = first;
    expect(JSON.stringify(shown)).not.toContain('rue des Lilas');
    expect(snapshot.source).toBe('stream_estate');
  });

  it('le même bien deux fois ne compte qu’une fois', () => {
    const url = 'https://www.seloger.com/annonces/achat/maison/mougins-06/B1.htm';
    const outcome = filterNewcomers(
      [
        candidate(url, 1500000, '2026-10-20T00:00:00.000Z'),
        candidate(url, 1500000, '2026-10-20T00:00:00.000Z'),
      ],
      { concludedAt: CONCLUDED, knownUrls: [], priceCeiling: 1639500 },
    );
    expect(outcome.newcomers).toHaveLength(1);
  });
});

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
  meeting_frozen_at: '2026-10-08T15:00:00.000Z',
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
];
const MADE_AT = new Date('2026-10-29T10:00:00.000Z');

describe('le point avec des nouveaux venus', () => {
  it('un retenu après la conclusion est un nouveau venu : ligne 3 seulement, après les autres', () => {
    const summary = buildMarketUpdateSummary({
      competitors: [
        row(ids[2], 0, 1495000, {
          meeting_frozen_at: null,
          meeting_price: null,
          meeting_price_source: null,
          created_at: '2026-10-29T09:00:00.000Z',
          listing_published_at: '2026-10-15',
        }),
        row(ids[0], 1, 1690000),
        row(ids[1], 2, 1650000),
      ],
      dangerousCompetitorId: ids[0],
      meetingDate: CONCLUDED,
      agreedPrice: 1639500,
      advisorAnalysis: 1642000,
      madeAt: MADE_AT,
      newcomersSearch: {
        madeAt: MADE_AT.toISOString(),
        found: 2,
        billed: 20,
        limitedToPrice: true,
        excludedNoDate: 0,
      },
    });
    expect(summary.competitors.map((item) => item.state)).toEqual([
      'unchanged',
      'unchanged',
      'newcomer',
    ]);
    const newcomer = summary.competitors[2];
    expect(newcomer).toMatchObject({ newcomer: true, seenSince: '2026-10-15', meetingPrice: null });
    expect(summary.lines.meeting?.prices).toEqual([1650000, 1690000]);
    expect(summary.lines.today?.prices).toEqual([1650000, 1690000]);
    expect(summary.lines.newcomers?.prices).toEqual([1495000]);
    expect(summary.lines.newcomersCount).toBe(1);
    expect(summary.counts.newcomers).toBe(1);
    expect(summary.newcomersSearch?.found).toBe(2);
    expect(marketUpdateLine(summary)).toBe('3 annonces relues · 1 nouveau venu');
    expect(parseMarketUpdateSummary(JSON.parse(JSON.stringify(summary)))).toEqual(summary);
  });

  it('une recherche faite sans retenue se dit « aucun nouveau venu » ; sans recherche, rien', () => {
    const base = {
      competitors: [row(ids[0], 0, 1690000)],
      dangerousCompetitorId: null,
      meetingDate: CONCLUDED,
      agreedPrice: 1639500,
      advisorAnalysis: null,
      madeAt: MADE_AT,
    };
    expect(marketUpdateLine(buildMarketUpdateSummary(base))).toBe('1 annonce relue');
    expect(
      marketUpdateLine(
        buildMarketUpdateSummary({
          ...base,
          newcomersSearch: {
            madeAt: MADE_AT.toISOString(),
            found: 0,
            billed: 60,
            limitedToPrice: true,
            excludedNoDate: 0,
          },
        }),
      ),
    ).toBe('1 annonce relue · aucun nouveau venu');
    // Un point d'avant la partie B se relit : pas de recherche, pas de nouveau venu.
    const early = JSON.parse(JSON.stringify(buildMarketUpdateSummary(base))) as Record<
      string,
      unknown
    >;
    delete early.newcomersSearch;
    const reread = parseMarketUpdateSummary(early);
    expect(reread?.newcomersSearch).toBeNull();
    expect(reread?.competitors[0]).toMatchObject({ newcomer: false, seenSince: null });
  });

  it('les lignes : un nouveau venu n’entre ni au rendez-vous ni aujourd’hui', () => {
    const lines = buildPriceLines(
      [
        { newcomer: true, meetingPrice: null, currentPrice: 1500000, gone: null, dangerous: false },
        { meetingPrice: 1700000, currentPrice: 1700000, gone: null, dangerous: false },
      ],
      1639500,
      [1500000],
    );
    expect(lines.meeting?.prices).toEqual([1700000]);
    expect(lines.today?.prices).toEqual([1700000]);
    expect(lines.newcomers?.prices).toEqual([1500000]);
  });
});

describe('le message de partage du Point marché', () => {
  it('dit le rendez-vous, le lien et le prénom, sans montant', () => {
    const text = marketUpdateShareMessage(
      'https://acm.test/point-marche/abc',
      '08/10/2026',
      'Natacha',
    );
    expect(text).toBe(
      'Bonjour, voici le Point marché depuis notre rendez-vous du 08/10/2026 : https://acm.test/point-marche/abc\nIl montre ce qui a bougé chez les biens que nous avons regardés ensemble, et où en est votre prix.\nNatacha',
    );
    expect(marketUpdateShareMessage('https://acm.test/x', null, null)).not.toContain('\n\n');
    const hrefs = marketUpdateShareHrefs(text, '29/10/2026');
    expect(hrefs.sms).toMatch(/^sms:\?&body=/);
    expect(hrefs.whatsapp).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(decodeURIComponent(hrefs.email)).toContain('subject=Point marché du 29/10/2026');
  });
});

describe('le jour du point (Paris)', () => {
  it('un point de la nuit reste celui de son jour de Paris', async () => {
    const { isPointOfDay, parisDay } = await import('@/features/market-update/services/point-day');
    expect(parisDay('2026-10-29T23:30:00.000Z')).toBe('30/10/2026');
    expect(isPointOfDay('2026-10-29T23:30:00.000Z', new Date('2026-10-30T07:00:00.000Z'))).toBe(
      true,
    );
    expect(isPointOfDay('2026-10-29T10:00:00.000Z', new Date('2026-10-30T07:00:00.000Z'))).toBe(
      false,
    );
  });
});
