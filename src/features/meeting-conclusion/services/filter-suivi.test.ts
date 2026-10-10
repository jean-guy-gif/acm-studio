import { describe, expect, it } from 'vitest';

import type { SuiviDossier } from '@/features/meeting-conclusion/queries/get-suivi-dossiers';
import {
  averageJourneyGap,
  filterSuiviByGroup,
  parseSuiviGroup,
  suiviCounts,
  suiviGroup,
  whatHoldsBack,
} from '@/features/meeting-conclusion/services/filter-suivi';
import type { ConclusionOutcome } from '@/features/meeting-conclusion/types';

function dossier(
  id: string,
  outcome: ConclusionOutcome,
  prices: { start?: number | null; end?: number | null } = {},
): SuiviDossier {
  return {
    project: { id, seller_name: id } as unknown as SuiviDossier['project'],
    property: null,
    conclusion: {
      marketComputed: null,
      advisorAnalysis: null,
      advisorPrice: null,
      commercializationPrice: prices.end ?? null,
      sellerPerceivedPrice: prices.start ?? null,
      launchReadinessFirst: null,
      launchReadinessLast: null,
      launchReadinessMissing: null,
      outcome,
      followUpReason: null,
      concludedAt: null,
      outcomeChangedAt: null,
    },
  };
}

describe('le Suivi en trois groupes (mission 86)', () => {
  const all = [
    dossier('a', 'signed'),
    dossier('b', 'follow_up'),
    dossier('c', 'sold_elsewhere'),
    dossier('d', 'withdrawn'),
    dossier('e', 'signed'),
  ];
  const ids = (dossiers: SuiviDossier[]) => dossiers.map((d) => d.project.id);

  it('réunit « vendu ailleurs » et « retiré » dans un seul groupe', () => {
    expect(suiviGroup('signed')).toBe('signed');
    expect(suiviGroup('follow_up')).toBe('follow_up');
    expect(suiviGroup('sold_elsewhere')).toBe('lost');
    expect(suiviGroup('withdrawn')).toBe('lost');
    expect(suiviGroup(null)).toBeNull();
  });

  it('rend exactement les dossiers du groupe filtré', () => {
    expect(ids(filterSuiviByGroup(all, 'signed'))).toEqual(['a', 'e']);
    expect(ids(filterSuiviByGroup(all, 'follow_up'))).toEqual(['b']);
    expect(ids(filterSuiviByGroup(all, 'lost'))).toEqual(['c', 'd']);
  });

  it('« Tous » (null) rend tous les dossiers, aucun masqué', () => {
    expect(filterSuiviByGroup(all, null)).toHaveLength(all.length);
  });

  it('compte chaque groupe sur tout le Suivi', () => {
    expect(suiviCounts(all)).toEqual({ signed: 2, follow_up: 1, lost: 2 });
    expect(suiviCounts([])).toEqual({ signed: 0, follow_up: 0, lost: 0 });
  });

  it('lit le filtre de l’adresse, anciens liens par issue compris', () => {
    expect(parseSuiviGroup('signed')).toBe('signed');
    expect(parseSuiviGroup('lost')).toBe('lost');
    expect(parseSuiviGroup('withdrawn')).toBe('lost');
    expect(parseSuiviGroup('sold_elsewhere')).toBe('lost');
    expect(parseSuiviGroup('nimporte')).toBeNull();
    expect(parseSuiviGroup(undefined)).toBeNull();
  });
});

describe('averageJourneyGap — écart moyen prix du vendeur → prix de commercialisation', () => {
  it('fait la moyenne des écarts des mandats signés, en %', () => {
    const gap = averageJourneyGap([
      dossier('a', 'signed', { start: 400000, end: 360000 }), // −10 %
      dossier('b', 'signed', { start: 200000, end: 192000 }), // −4 %
    ]);
    expect(gap).toBeCloseTo(-7, 5);
  });

  it('ignore les autres issues et les dossiers sans les deux prix', () => {
    const gap = averageJourneyGap([
      dossier('a', 'signed', { start: 400000, end: 360000 }),
      dossier('b', 'follow_up', { start: 400000, end: 200000 }),
      dossier('c', 'signed', { start: 300000 }),
      dossier('d', 'signed', { end: 300000 }),
    ]);
    expect(gap).toBeCloseTo(-10, 5);
  });

  it('ne dit rien sans mandat signé chiffrable', () => {
    expect(averageJourneyGap([])).toBeNull();
    expect(averageJourneyGap([dossier('a', 'follow_up', { start: 1, end: 1 })])).toBeNull();
    expect(averageJourneyGap([dossier('a', 'signed')])).toBeNull();
  });
});

describe('whatHoldsBack — « Ce qui le retient »', () => {
  it('préfère ce que le vendeur a dit lui manquer, sinon le motif du conseiller', () => {
    expect(
      whatHoldsBack({ launchReadinessMissing: ' le délai ', followUpReason: 'réfléchit' }),
    ).toBe('le délai');
    expect(whatHoldsBack({ launchReadinessMissing: null, followUpReason: 'réfléchit' })).toBe(
      'réfléchit',
    );
    expect(whatHoldsBack({ launchReadinessMissing: '  ', followUpReason: null })).toBeNull();
    expect(whatHoldsBack(null)).toBeNull();
  });
});
