import { describe, expect, it } from 'vitest';

import { answerSuggestions } from '@/features/buyer-deck/services/answer-suggestions';
import {
  buyersMonthLine,
  lastAnswerLabel,
  parisMonthStart,
} from '@/features/buyers/services/buyers-month';
import {
  bestBien,
  relaunchDue,
  relaunchMessage,
  type RelaunchFacts,
} from '@/features/buyers/services/link-relaunch';
import type { BuyerInput } from '@/features/buyers/types';
import {
  buildSuiviTaskList,
  type SuiviTask,
} from '@/features/meeting-conclusion/services/suivi-tasks';
import { taskLine } from '@/features/meeting-conclusion/services/suivi-step-labels';

// Mission 135 — des fiches qui font visiter : la relance d'un lien sans réponse, les refus qui
// affinent la recherche, « Ce mois-ci ».
const NOW = new Date('2026-11-06T10:00:00Z');
const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * 3_600_000).toISOString();
const daysAgo = (days: number) => hoursAgo(days * 24);

const facts = (over: Partial<RelaunchFacts> = {}): RelaunchFacts => ({
  buyerId: 'b1',
  status: 'searching',
  selectionId: 's1',
  sentAt: daysAgo(3),
  answered: false,
  relaunches: [],
  linkActive: true,
  ...over,
});

describe('un lien sans réponse devient une relance', () => {
  it('à 47 h, rien ; à 48 h, la relance', () => {
    expect(relaunchDue(facts({ sentAt: hoursAgo(47) }), NOW)).toBeNull();
    expect(relaunchDue(facts({ sentAt: hoursAgo(48) }), NOW)).toMatchObject({ rank: 1 });
  });

  it('une réponse, une sélection jamais envoyée, un acquéreur qui a acheté : rien', () => {
    expect(relaunchDue(facts({ answered: true }), NOW)).toBeNull();
    expect(relaunchDue(facts({ sentAt: null }), NOW)).toBeNull();
    expect(relaunchDue(facts({ status: 'bought' }), NOW)).toBeNull();
  });

  it('la 2e relance 5 jours après la 1re, puis plus rien', () => {
    expect(relaunchDue(facts({ sentAt: daysAgo(10), relaunches: [daysAgo(4)] }), NOW)).toBeNull();
    expect(
      relaunchDue(facts({ sentAt: daysAgo(10), relaunches: [daysAgo(5)] }), NOW),
    ).toMatchObject({ rank: 2 });
    expect(
      relaunchDue(facts({ sentAt: daysAgo(20), relaunches: [daysAgo(12), daysAgo(6)] }), NOW),
    ).toBeNull();
  });

  it('un lien expiré : la relance propose « Envoyer un nouveau lien »', () => {
    const due = relaunchDue(facts({ sentAt: daysAgo(31), linkActive: false }), NOW);
    expect(due?.expired).toBe(true);
    const task: SuiviTask = {
      kind: 'buyer_relaunch',
      projectId: '',
      sellerName: '',
      dueOn: due!.dueOn,
      buyerId: 'b1',
      buyerName: 'M. et Mme Lambert',
      count: 1,
      sentOn: due!.sentOn,
      linkExpired: true,
    };
    const line = taskLine(
      task,
      { motiveLabel: null, lastContactDays: null, signedOn: null, propertyLabel: null },
      '2026-11-06',
    );
    expect(line.button).toBe('Envoyer un nouveau lien');
  });

  it('« Relancer M. et Mme Lambert : sélection envoyée le 04/11, pas de réponse »', () => {
    const task: SuiviTask = {
      kind: 'buyer_relaunch',
      projectId: '',
      sellerName: '',
      dueOn: '2026-11-05',
      buyerId: 'b1',
      buyerName: 'M. et Mme Lambert',
      count: 1,
      sentOn: '2026-11-03',
    };
    const list = buildSuiviTaskList([], NOW, [task]);
    expect(list.dues).toHaveLength(1);
    const line = taskLine(
      list.dues[0]!,
      { motiveLabel: null, lastContactDays: null, signedOn: null, propertyLabel: null },
      '2026-11-06',
    );
    expect(line.title).toBe('Relancer M. et Mme Lambert');
    expect(line.detail).toMatch(/^sélection envoyée le 03\/11, pas de réponse/);
    expect(line.button).toBe('Relancer');
  });

  it('le message : la sélection, le bien et ce qu’il a, jamais « disponible » ni un prix', () => {
    const text = relaunchMessage({
      buyer: {
        name: 'M. et Mme Lambert',
        pool: true,
        outdoor: null,
        parking: null,
        elevator: null,
      },
      bien: {
        property: {
          propertyType: 'house',
          roomsCount: 5,
          surfaceArea: 140,
          city: 'Vence',
          bedroomsCount: 4,
          floor: null,
          hasElevator: null,
          hasPool: true,
          outdoorSpaces: [],
          parkingTypes: [],
          energyRating: null,
          generalCondition: null,
        },
      },
      fits: true,
      sentOn: '2026-11-03',
      url: 'https://acm/dossier/abc',
      advisorFirstName: 'Carl',
    });
    expect(text).toMatch(/^Bonjour M\. et Mme Lambert,/);
    expect(text).toMatch(/Avez-vous pu regarder la sélection envoyée le 03\/11 \?/);
    expect(text).toMatch(
      /La maison à Vence avec la piscine que vous vouliez coche ce que vous cherchez/,
    );
    expect(text).toMatch(/voulez-vous la visiter samedi \?/);
    expect(text).toContain('https://acm/dossier/abc');
    expect(text).not.toMatch(/disponible|€/);
  });
});

describe('le bien du message ne ment pas', () => {
  const property = (over: Record<string, unknown> = {}) => ({
    propertyType: 'house',
    roomsCount: 5,
    surfaceArea: 140,
    city: 'Vence',
    bedroomsCount: 4,
    floor: null,
    hasElevator: null,
    hasPool: true,
    outdoorSpaces: [],
    parkingTypes: [],
    energyRating: null,
    generalCondition: null,
    ...over,
  });
  const lambert = {
    name: 'M. et Mme Lambert',
    cities: ['Vence'],
    propertyTypes: ['house'],
    budgetMax: 790_000,
    pool: true,
    mustHave: ['cities', 'pool'],
  } as never;

  it('une ★ remplie et aucune contredite : il coche ce qu’il cherche', () => {
    const best = bestBien(lambert, [{ property: property(), price: 779_000 }]);
    expect(best?.fits).toBe(true);
  });

  it('une ★ contredite (pas de piscine), ou aucune remplie : il ne le dit pas', () => {
    expect(
      bestBien(lambert, [{ property: property({ hasPool: false }), price: 779_000 }])?.fits,
    ).toBe(false);
    // Une ★ commune remplie, mais le bien dépasse la ★ du budget : il ne « coche » pas.
    const overBudget = { ...(lambert as object), mustHave: ['cities', 'budget'] } as never;
    expect(bestBien(overBudget, [{ property: property(), price: 820_000 }])?.fits).toBe(false);
    // Hors de ses communes, avec la piscine : ne coche pas non plus.
    expect(
      bestBien(lambert, [{ property: property({ city: 'Antibes' }), price: 779_000 }])?.fits,
    ).toBe(false);
    const noStar = { ...(lambert as object), mustHave: ['budget'] } as never;
    // Un prix inconnu ne remplit jamais la ★ du budget.
    expect(bestBien(noStar, [{ property: property(), price: null }])?.fits).toBe(false);
    const text = relaunchMessage({
      buyer: {
        name: 'M. et Mme Lambert',
        pool: true,
        outdoor: null,
        parking: null,
        elevator: null,
      },
      bien: { property: property({ hasPool: false }) as never },
      fits: false,
      sentOn: '2026-11-03',
      url: 'u',
      advisorFirstName: null,
    });
    expect(text).not.toMatch(/coche/);
    expect(text).toMatch(/Dites-moi quels biens vous voulez visiter\./);
  });
});

const buyer = (over: Partial<BuyerInput> = {}): BuyerInput =>
  ({
    name: 'Famille Test',
    cities: ['Vence', 'La Colle-sur-Loup'],
    budgetIdeal: null,
    budgetMax: 800_000,
    surfaceMin: 100,
    outdoor: null,
    parking: null,
    worksAccepted: null,
    mustHave: [],
    ...over,
  }) as BuyerInput;

const no = (bienKey: string, reasons: string[], over: Record<string, unknown> = {}) => ({
  bienKey,
  answer: 'no' as const,
  reasons: reasons as never,
  answeredAt: daysAgo(1),
  surfaceArea: 110,
  price: 760_000,
  ...over,
});

describe('les refus affinent la recherche', () => {
  it('« Le quartier » deux fois dans la même commune : la retirer de sa recherche', () => {
    const [suggestion] = answerSuggestions(
      buyer(),
      [],
      [
        no('a', ['district'], { city: 'La Colle-sur-Loup' }),
        no('b', ['district'], { city: 'la colle sur loup' }),
      ],
    );
    expect(suggestion?.text).toMatch(/retirer La Colle-sur-Loup de sa recherche \?$/);
    expect(suggestion?.patch).toEqual({ cities: ['Vence'] });
  });

  it('« Le quartier » dans deux communes différentes, ou sur sa seule commune : le constat seul', () => {
    const [split] = answerSuggestions(
      buyer(),
      [],
      [
        no('a', ['district'], { city: 'Vence' }),
        no('b', ['district'], { city: 'La Colle-sur-Loup' }),
      ],
    );
    expect(split?.patch).toBeNull();
    const [single] = answerSuggestions(
      buyer({ cities: ['Vence'] }),
      [],
      [no('a', ['district'], { city: 'Vence' }), no('b', ['district'], { city: 'Vence' })],
    );
    expect(single?.patch).toBeNull();
  });

  it('« Le prix » garde la règle de la 122 : le plafond sous le plus bas prix refusé', () => {
    const [suggestion] = answerSuggestions(
      buyer({ budgetMax: 1_650_000 }),
      [],
      [no('a', ['price'], { price: 1_580_000 }), no('b', ['price'], { price: 1_650_000 })],
    );
    expect(suggestion?.patch).toMatchObject({ budgetMax: 1_579_000 });
  });

  it('la commune déjà retirée : la suggestion disparaît d’elle-même (M122)', () => {
    expect(
      answerSuggestions(
        buyer({ cities: ['Vence', 'Saint-Paul-de-Vence'] }),
        [],
        [
          no('a', ['district'], { city: 'La Colle-sur-Loup' }),
          no('b', ['district'], { city: 'La Colle-sur-Loup' }),
        ],
      ),
    ).toEqual([]);
  });

  it('un seul refus, ou « Autre » : rien à proposer', () => {
    expect(answerSuggestions(buyer(), [], [no('a', ['price'])])).toEqual([]);
    const [other] = answerSuggestions(buyer(), [], [no('a', ['other']), no('b', ['other'])]);
    expect(other?.patch).toBeNull();
  });
});

describe('« Ce mois-ci »', () => {
  it('le premier instant du mois de Paris', () => {
    expect(parisMonthStart(NOW).toISOString()).toBe('2026-10-31T23:00:00.000Z');
    expect(parisMonthStart(new Date('2026-07-15T10:00:00Z')).toISOString()).toBe(
      '2026-06-30T22:00:00.000Z',
    );
  });

  it('la ligne, et la dernière réponse', () => {
    expect(buyersMonthLine({ proposed: 24, answers: 9, visits: 4 })).toBe(
      'Ce mois-ci : 24 biens proposés · 9 réponses · 4 visites',
    );
    expect(buyersMonthLine({ proposed: 1, answers: 0, visits: 1 })).toBe(
      'Ce mois-ci : 1 bien proposé · 0 réponse · 1 visite',
    );
    expect(lastAnswerLabel({ at: '2026-11-04T10:00:00Z', answer: 'no', reasons: ['price'] })).toBe(
      'Dernière réponse le 04/11 : Pas pour moi · Le prix',
    );
  });
});
