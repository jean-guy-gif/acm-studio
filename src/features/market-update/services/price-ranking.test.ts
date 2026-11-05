import { describe, expect, it } from 'vitest';

import type { MarketUpdateCompetitor } from '@/features/market-update/services/market-update-summary';
import {
  buildPriceRanking,
  dangerousInForce,
  seenBeforeMeeting,
  subjectRank,
} from '@/features/market-update/services/price-ranking';

// Mission 129 — le classement de la maquette v2 (Biot, 30/10) : 5 concurrents du rendez-vous,
// 2 nouveaux venus moins chers, le vendeur à 830 000 €.
let next = 0;
const id = () => `00000000-0000-4000-8000-${String((next += 1)).padStart(12, '0')}`;
const competitor = (patch: Partial<MarketUpdateCompetitor>): MarketUpdateCompetitor => ({
  id: id(),
  position: next,
  label: 'Maison · 6 pièces · 126 m² · Valbonne',
  surfaceArea: 126,
  dangerous: false,
  shownAtMeeting: true,
  readToday: true,
  newcomer: false,
  seenSince: null,
  meetingPrice: 850_000,
  meetingPriceSource: 'revealed',
  currentPrice: 850_000,
  gapAmount: 0,
  gapPercent: 0,
  state: 'unchanged',
  daysOnMarket: 121,
  daysApproximate: false,
  goneAt: null,
  conclusion: null,
  ...patch,
});
const MEETING = '2026-10-21T13:31:00.000Z';
// Les montants et les pourcentages portent des espaces insécables (formateur M74).
const plain = (text: string | null) => (text ?? '').replace(/[\u00a0\u202f]/g, ' ');
const at = (price: number, patch: Partial<MarketUpdateCompetitor> = {}) =>
  competitor({ meetingPrice: price, currentPrice: price, ...patch });
const newcomer = (
  price: number,
  seenSince: string | null,
  patch: Partial<MarketUpdateCompetitor> = {},
) =>
  competitor({
    newcomer: true,
    seenSince,
    meetingPrice: null,
    meetingPriceSource: null,
    currentPrice: price,
    state: 'newcomer',
    daysOnMarket: null,
    label: 'Maison · 3 pièces · 99 m² · Biot',
    ...patch,
  });

const biot = () => {
  const dangerous = at(800_000, {
    dangerous: true,
    label: 'Maison · 5 pièces · 165 m² · Mougins',
    daysOnMarket: 11,
  });
  const competitors = [
    newcomer(795_000, '2026-10-22'),
    newcomer(798_000, null, { label: 'Maison · 5 pièces · 110 m² · Biot' }),
    dangerous,
    at(850_000),
    at(890_000),
    at(898_000),
    at(898_000),
  ];
  return { competitors, dangerous };
};

describe('le classement « Où en est votre prix » (M129)', () => {
  it('la maquette v2 : 2e sur 6 au rendez-vous, 2e sur 6 aujourd’hui, 4e sur 8 avec les nouveaux venus', () => {
    const { competitors } = biot();
    const ranking = buildPriceRanking(
      { competitors, agreedPrice: 830_000, meetingDate: MEETING, dangerousToday: null },
      'Maison · 5 pièces · 113 m² · Biot',
    )!;
    expect(ranking.steps.meeting).toMatchObject({ rank: 2, total: 6, tier: 'green' });
    expect(ranking.steps.today).toMatchObject({ rank: 2, total: 6, tier: 'green' });
    expect(ranking.steps.newcomers).toMatchObject({ rank: 4, total: 8, tier: 'orange' });
    expect(ranking.verdict).toMatchObject({ word: 'Attention', rank: 4, total: 8, tier: 'orange' });
    expect(ranking.verdict.sentence).toBe(
      'Aucun concurrent n’a baissé depuis le rendez-vous, mais 2 biens sont arrivés sur le marché moins chers que le vôtre.',
    );
    expect(ranking.verdict.emphasis).toBe(
      '2 biens sont arrivés sur le marché moins chers que le vôtre',
    );
    expect(
      ranking.rows.map((row) => [row.rank, row.subject ? 'vous' : row.currentPrice, row.tier]),
    ).toEqual([
      [1, 795_000, 'green'],
      [2, 798_000, 'green'],
      [3, 800_000, 'green'],
      [4, 'vous', 'orange'],
      [5, 850_000, 'orange'],
      [6, 890_000, 'orange'],
      [7, 898_000, 'red'],
      [8, 898_000, 'red'],
    ]);
    const dangerousRow = ranking.rows[2];
    expect(dangerousRow).toMatchObject({ dangerous: 'meeting', meetingChoice: true });
    expect(dangerousRow.detail).toBe('votre choix au rendez-vous · en vente depuis 11 jours');
    expect(ranking.rows[0].detail).toBe('arrivé le 22/10');
    expect(ranking.rows[1].detail).toBe('arrivé après le rendez-vous');
    expect(ranking.rows[0].meetingPrice).toBeNull();
    expect(ranking.rows[3]).toMatchObject({
      detail: 'prix retenu ensemble',
      meetingPrice: 830_000,
    });
  });

  it('à égalité de prix, le vendeur prend le meilleur rang', () => {
    expect(subjectRank([800_000, 830_000, 830_000, 900_000], 830_000)).toBe(2);
  });

  it('les disparus sortent du classement, et la phrase les dit', () => {
    const competitors = [
      at(800_000),
      at(820_000, {
        conclusion: {
          kind: 'probable_sale',
          label: 'Vente probable',
          negotiationMinPercent: 5,
          negotiationMaxPercent: 10,
          estimatedMin: 1,
          estimatedMax: 2,
        },
        state: 'probable_sale',
      }),
      at(900_000, { state: 'gone' }),
      at(880_000, { state: 'dropped', currentPrice: 860_000, gapPercent: -2.3 }),
    ];
    const ranking = buildPriceRanking(
      { competitors, agreedPrice: 830_000, meetingDate: MEETING, dangerousToday: null },
      'Votre bien',
    )!;
    expect(ranking.rows.map((row) => (row.subject ? 'vous' : row.currentPrice))).toEqual([
      800_000,
      'vous',
      860_000,
    ]);
    expect(ranking.steps.newcomers).toBeNull();
    expect(ranking.verdict.sentence).toBe(
      '1 concurrent a baissé depuis le rendez-vous, 2 ont quitté le marché.',
    );
    expect(plain(ranking.rows[2].detail)).toBe('a baissé de 2,3 % · en vente depuis 121 jours');
  });

  it('le bien de Biot vu le 17/06/2025, retenu après le rendez-vous du 21/10/2026, ne compte pas', () => {
    expect(seenBeforeMeeting({ newcomer: true, seenSince: '2025-06-17' }, MEETING)).toBe(true);
    expect(seenBeforeMeeting({ newcomer: true, seenSince: '2026-10-22' }, MEETING)).toBe(false);
    const competitors = [at(850_000), newcomer(798_000, '2025-06-17')];
    const ranking = buildPriceRanking(
      { competitors, agreedPrice: 830_000, meetingDate: MEETING, dangerousToday: null },
      'Votre bien',
    )!;
    expect(ranking.steps.newcomers).toBeNull();
    expect(ranking.rows).toHaveLength(2);
    expect(ranking.verdict.sentence).not.toContain('arrivé');
  });

  it('« avant le rendez-vous » se lit en jours de Paris, minuit compris', () => {
    const meeting = '2026-10-21T08:00:00Z';
    // 23 h 30 UTC le 20/10 = 1 h 30 à Paris le 21/10 : le jour même, pas avant.
    expect(seenBeforeMeeting({ newcomer: true, seenSince: '2026-10-20T23:30:00Z' }, meeting)).toBe(
      false,
    );
    expect(seenBeforeMeeting({ newcomer: true, seenSince: '2026-10-20T21:30:00Z' }, meeting)).toBe(
      true,
    );
  });

  it('le plus dangereux change : un nouveau venu le devient, l’ancien garde « votre choix au rendez-vous »', () => {
    const { competitors, dangerous } = biot();
    const chosen = competitors[0];
    const ranking = buildPriceRanking(
      {
        competitors,
        agreedPrice: 830_000,
        meetingDate: MEETING,
        dangerousToday: { competitorId: chosen.id, chosenAt: '2026-10-30T10:00:00.000Z' },
      },
      'Votre bien',
    )!;
    const newRow = ranking.rows.find((row) => row.key === chosen.id)!;
    const oldRow = ranking.rows.find((row) => row.key === dangerous.id)!;
    expect(newRow.dangerous).toBe('today');
    expect(oldRow).toMatchObject({ dangerous: null, meetingChoice: true });
    expect(plain(ranking.verdict.sentence)).toContain(
      'Un nouveau venu devient le plus dangereux : Maison · 3 pièces · 99 m² · Biot, à 795 000 €, 35 000 € sous votre prix.',
    );
  });

  it('le plus dangereux du rendez-vous a disparu : on propose d’en désigner un autre', () => {
    const gone = at(800_000, { dangerous: true, state: 'gone' });
    expect(
      dangerousInForce({ competitors: [gone, at(850_000)], dangerousToday: null }),
    ).toMatchObject({
      currentId: null,
      needsNew: true,
    });
    const other = at(850_000);
    expect(
      dangerousInForce({
        competitors: [gone, other],
        dangerousToday: { competitorId: other.id, chosenAt: '2026-10-30' },
      }),
    ).toMatchObject({ currentId: other.id, changed: true, needsNew: false });
  });

  it('sans prix retenu ensemble, aucun classement', () => {
    expect(
      buildPriceRanking(
        { competitors: [at(1)], agreedPrice: null, meetingDate: MEETING, dangerousToday: null },
        'x',
      ),
    ).toBeNull();
  });
});
