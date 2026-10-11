import { describe, expect, it } from 'vitest';

import type { SuiviDossier } from '@/features/meeting-conclusion/queries/get-suivi-dossiers';
import {
  averageJourneyGap,
  concludedAgoLabel,
  daysSince,
  exclusiveLabel,
  exclusiveSignedCount,
  sortSuivi,
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
      mandateType: null,
      signedAt: null,
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

// Mission 90 — la mesure de la bêta, et l'ordre des vendeurs à relancer.
describe('mandats signés : dont combien d’exclusifs', () => {
  const typed = (
    id: string,
    outcome: ConclusionOutcome,
    mandateType: 'exclusive' | 'simple' | null,
  ) => {
    const base = dossier(id, outcome);
    return { ...base, conclusion: { ...base.conclusion!, mandateType } };
  };

  it('ne compte que les mandats signés dont le type est « exclusif »', () => {
    const all = [
      typed('a', 'signed', 'exclusive'),
      typed('b', 'signed', 'simple'),
      typed('c', 'signed', null),
      typed('d', 'signed', 'exclusive'),
      typed('e', 'follow_up', null),
    ];
    expect(exclusiveSignedCount(all)).toBe(2);
    expect(exclusiveSignedCount([])).toBe(0);
  });

  it('un mandat signé sans type n’est réputé ni exclusif ni simple', () => {
    expect(exclusiveSignedCount([typed('a', 'signed', null)])).toBe(0);
  });

  it('accorde le libellé', () => {
    expect(exclusiveLabel(0)).toBe('dont aucun exclusif');
    expect(exclusiveLabel(1)).toBe('dont 1 exclusif');
    expect(exclusiveLabel(4)).toBe('dont 4 exclusifs');
  });
});

describe('sortSuivi — les « à relancer » du plus ancien au plus récent', () => {
  const dated = (id: string, outcome: ConclusionOutcome, concludedAt: string) => {
    const base = dossier(id, outcome);
    return { ...base, conclusion: { ...base.conclusion!, concludedAt } };
  };
  const ids = (dossiers: SuiviDossier[]) => dossiers.map((d) => d.project.id);

  it('réordonne les « à relancer » entre eux, les autres gardent leur place', () => {
    const sorted = sortSuivi([
      dated('signé-récent', 'signed', '2026-10-10T10:00:00Z'),
      dated('relance-récente', 'follow_up', '2026-10-09T10:00:00Z'),
      dated('retiré', 'withdrawn', '2026-10-08T10:00:00Z'),
      dated('relance-ancienne', 'follow_up', '2026-09-01T10:00:00Z'),
      dated('relance-moyenne', 'follow_up', '2026-09-20T10:00:00Z'),
    ]);
    expect(ids(sorted)).toEqual([
      'signé-récent',
      'relance-ancienne',
      'retiré',
      'relance-moyenne',
      'relance-récente',
    ]);
  });

  it('ne perd ni ne duplique aucun dossier', () => {
    const all = [
      dated('a', 'follow_up', '2026-10-02T00:00:00Z'),
      dated('b', 'follow_up', '2026-10-01T00:00:00Z'),
    ];
    expect(ids(sortSuivi(all))).toEqual(['b', 'a']);
    expect(ids(all)).toEqual(['a', 'b']);
  });
});

describe('« conclu il y a N jours »', () => {
  const NOW = new Date('2026-10-11T12:00:00Z');

  it('compte les jours pleins écoulés', () => {
    expect(daysSince('2026-10-11T08:00:00Z', NOW)).toBe(0);
    expect(daysSince('2026-10-10T11:00:00Z', NOW)).toBe(1);
    expect(daysSince('2026-09-20T12:00:00Z', NOW)).toBe(21);
    expect(daysSince(null, NOW)).toBeNull();
    expect(daysSince('pas une date', NOW)).toBeNull();
  });

  it('accorde le libellé', () => {
    expect(concludedAgoLabel(0)).toBe('conclu aujourd’hui');
    expect(concludedAgoLabel(1)).toBe('conclu il y a 1 jour');
    expect(concludedAgoLabel(21)).toBe('conclu il y a 21 jours');
  });
});
