import { describe, expect, it } from 'vitest';

import type { BuyerLoopProperty } from '@/features/buyers/services/property-buyers';
import type { Buyer } from '@/features/buyers/types';
import type { ProspectingRow } from '@/features/competitor-locator/services/build-prospecting-rows';
import type { SuiviTask } from '@/features/meeting-conclusion/services/suivi-tasks';
import { doneToday, type DoneFact } from '@/features/today/services/done-today';
import {
  cardAlert,
  cardAlertLabel,
  dateKept,
  followUpAlert,
  prospectBuyersTasks,
  withFollowUpAlerts,
  withTaskProperty,
  type AlertCard,
  type FollowUpAlert,
} from '@/features/today/services/mandate-alerts';
import {
  mineOnly,
  seriesDetail,
  seriesTitle,
  todayBoard,
  type TaskOwners,
} from '@/features/today/services/today-board';

// Mission 145 (partie B) — « Aujourd'hui » : les blocs, les séries, « Mes tâches », « Fait
// aujourd'hui », et les alertes pour rentrer un mandat (décisions de Jean-Guy, 07/11).
const TODAY = '2026-11-10';
const NOW = new Date('2026-11-10T10:00:00Z');
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();

const task = (over: Partial<SuiviTask>): SuiviTask => ({
  kind: 'follow_up',
  projectId: 'p1',
  sellerName: 'M. et Mme Martin',
  dueOn: TODAY,
  datePosed: true,
  ...over,
});

describe('le vendeur à relancer que veulent des acquéreurs prêts', () => {
  const input = {
    dueOn: '2026-11-20',
    readyBuyers: 1,
    keptAt: null,
    keptReady: null,
    lastContactAt: daysAgo(8),
  };

  it('relance due : l’argument ; pas encore due : « Relancer plus tôt ? » ; aucun prêt : rien', () => {
    expect(followUpAlert({ ...input, dueOn: TODAY }, TODAY)).toEqual({
      kind: 'due',
      readyBuyers: 1,
    });
    expect(followUpAlert(input, TODAY)).toEqual({
      kind: 'early',
      readyBuyers: 1,
      plannedOn: '2026-11-20',
    });
    expect(followUpAlert({ ...input, readyBuyers: 0 }, TODAY)).toBeNull();
  });

  it('« Garder la date » cache la ligne ; un prêt de plus ou une relance la font revenir', () => {
    const kept = { ...input, keptAt: daysAgo(1), keptReady: 1 };
    expect(dateKept(kept)).toBe(true);
    expect(followUpAlert(kept, TODAY)).toBeNull();
    expect(followUpAlert({ ...kept, readyBuyers: 2 }, TODAY)?.kind).toBe('early');
    expect(followUpAlert({ ...kept, lastContactAt: daysAgo(0) }, TODAY)?.kind).toBe('early');
    // Une relance notée pose la date gardée à son heure : la ligne ne revient pas le jour même.
    const relanced = { ...input, lastContactAt: daysAgo(0), keptAt: daysAgo(0), keptReady: 1 };
    expect(followUpAlert(relanced, TODAY)).toBeNull();
    expect(followUpAlert({ ...relanced, readyBuyers: 2 }, TODAY)?.kind).toBe('early');
    // La date venue, la relance est due, gardée ou non.
    expect(followUpAlert({ ...kept, dueOn: TODAY }, TODAY)?.kind).toBe('due');
  });

  it('les tâches : l’argument sur la relance due, la relance à venir devient « plus tôt »', () => {
    const alerts = new Map<string, FollowUpAlert>([
      ['p1', { kind: 'due', readyBuyers: 2 }],
      ['p2', { kind: 'early', readyBuyers: 1, plannedOn: '2026-11-20' }],
    ]);
    const result = withFollowUpAlerts(
      [task({})],
      [
        task({ projectId: 'p2', dueOn: '2026-11-20' }),
        task({ projectId: 'p3', dueOn: '2026-11-21' }),
      ],
      alerts,
      TODAY,
    );
    expect(result.map((entry) => [entry.kind, entry.projectId, entry.readyBuyers])).toEqual([
      ['follow_up', 'p1', 2],
      ['follow_up_early', 'p2', 1],
    ]);
    expect(result[1]).toMatchObject({ dueOn: TODAY, plannedOn: '2026-11-20' });
  });

  // M146 B (B5) — l'argument d'une relance dit le type du bien. La refonte, lot B — une visite
  // demandée dit aussi le bien, pour la carte de son acquéreur.
  it('le bien du dossier : sur la relance qui porte l’argument et sur la visite demandée, pas ailleurs', () => {
    const propertyOf = new Map([
      ['p1', { propertyType: 'Maison', city: 'Mougins', surfaceArea: 220 }],
      ['p2', null],
    ]);
    const [argued, plain, visit, unknown, absent, point] = withTaskProperty(
      [
        task({ readyBuyers: 2 }),
        task({}),
        task({ kind: 'visit', count: 1 }),
        task({ kind: 'visit', projectId: 'p2' }),
        task({ kind: 'visit', projectId: 'p3' }),
        task({ kind: 'market_update' }),
      ],
      propertyOf,
    );
    expect(argued!.property).toEqual({ propertyType: 'Maison', city: 'Mougins' });
    expect(visit!.property).toEqual({ propertyType: 'Maison', city: 'Mougins' });
    expect(visit!.count).toBe(1);
    // Un bien non saisi, ou un dossier inconnu : ni type ni commune, jamais ceux d'un autre bien.
    expect(unknown!.property).toEqual({ propertyType: null, city: null });
    expect(absent!.property).toEqual({ propertyType: null, city: null });
    expect(plain!.property).toBeUndefined();
    expect(point!.property).toBeUndefined();
  });
});

describe('les biens en prospection que veulent des acquéreurs prêts', () => {
  const FLAT: BuyerLoopProperty = {
    propertyType: 'apartment',
    roomsCount: 3,
    surfaceArea: 70,
    city: 'Antibes',
    bedroomsCount: 2,
    floor: 2,
    hasElevator: null,
    hasPool: null,
    outdoorSpaces: ['balcony'],
    parkingTypes: ['garage'],
    energyRating: 'D',
    generalCondition: null,
  };
  let seq = 0;
  const buyer = (over: Partial<Buyer> = {}): Buyer => {
    seq += 1;
    return {
      language: 'fr',
      id: `b-${seq}`,
      agencyId: 'a',
      advisorId: 'adv',
      createdAt: daysAgo(21),
      updatedAt: daysAgo(2),
      archivedAt: null,
      status: 'searching',
      statusChangedAt: daysAgo(21),
      demo: false,
      ignoredSuggestions: [],
      financing: 'validated',
      financingChangedAt: daysAgo(10),
      contactedAt: daysAgo(3),
      financingMode: 'not_said',
      loanContribution: null,
      loanAmount: null,
      loanAgreement: null,
      condominiumAccepted: null,
      condominiumMustHave: false,
      softCriteria: [],
      fieldsToVerify: [],
      name: `Famille Test ${seq}`,
      phone: '06 39 98 00 00',
      email: 'test@example.com',
      purpose: null,
      timeline: null,
      notes: null,
      propertyTypes: ['apartment'],
      cities: ['Antibes'],
      budgetIdeal: 380_000,
      budgetMax: 400_000,
      roomsMin: 3,
      bedroomsMin: null,
      surfaceMin: 60,
      outdoor: null,
      parking: null,
      pool: null,
      floorMin: null,
      elevator: null,
      energyRatingMax: null,
      worksAccepted: null,
      mustHave: ['cities', 'budget'],
      dealBreakers: null,
      ...over,
    };
  };
  const row = (over: Partial<ProspectingRow> = {}): ProspectingRow => ({
    id: 'c1',
    title: 'EXCLUSIVITÉ Agence Dupont 12 rue des Lilas',
    address: null,
    label: null,
    confirmed: false,
    canAcceptAddress: false,
    confirmedByAdvisor: false,
    price: 390_000,
    surfaceArea: 70,
    roomsCount: 3,
    onlineSince: null,
    priceDrop: null,
    listingUrl: null,
    listingKey: 'seloger:123',
    listingNumber: '123',
    opposedOn: null,
    goneSinceMeeting: false,
    propertyType: 'apartment',
    city: 'Antibes',
    portal: 'seloger',
    status: 'ready',
    handedAt: null,
    meetingAt: null,
    mandateAt: null,
    declinedAt: null,
    collaborationAt: null,
    collaborationDeclinedAt: null,
    step: 'owner',
    mandate: {
      id: 'c1',
      project_id: 'p1',
      sold_by: 'agency',
      sold_by_source: null,
      exclusivity: 'no',
      exclusivity_source: null,
    },
    loopProperty: FLAT,
    ...over,
  });
  const card = (over: Partial<ProspectingRow> = {}, extra: Partial<AlertCard> = {}): AlertCard => ({
    kind: 'competitor',
    row: row(over),
    projectIds: ['p1'],
    label: 'Appartement · 3 pièces · 70 m² · Antibes · 390 000 €',
    originBuyerIds: [],
    letterOriginId: null,
    ...extra,
  });
  const ready = buyer();
  const notReady = buyer({ financing: 'in_progress' });
  const buyers = [ready, notReady];
  const alertOf = (target: AlertCard, dismissals?: Map<string, Set<string>>) =>
    cardAlert(target, buyers, new Map(), dismissals, NOW);

  it('mandat simple ou particulier : une alerte ; seuls les prêts comptent', () => {
    expect(alertOf(card())).toEqual({ readyBuyers: 1, mention: 'owner' });
    expect(alertOf(card({ status: 'to_confirm' }))).toEqual({ readyBuyers: 1, mention: 'owner' });
  });

  it('« À vérifier » : une mention ; exclusivité, opposition, carte remise : rien', () => {
    expect(alertOf(card({ step: 'check' }))).toEqual({ readyBuyers: 1, mention: 'check' });
    expect(alertOf(card({ step: 'colleague' }))).toBeNull();
    expect(alertOf(card({ opposedOn: '2026-11-01' }))).toBeNull();
    expect(alertOf(card({ status: 'handed' }))).toBeNull();
    expect(alertOf(card({ loopProperty: null }))).toBeNull();
  });

  it('les acquéreurs d’origine d’un bien démarché et les acquéreurs qui l’ont écarté ne comptent pas', () => {
    expect(alertOf(card({}, { kind: 'buyer_prospect', originBuyerIds: [ready.id] }))).toBeNull();
    expect(alertOf(card(), new Map([['listing:seloger:123', new Set([ready.id])]]))).toBeNull();
  });

  it('la mention dit un nombre, jamais un nom ; courrier ou passage', () => {
    expect(cardAlertLabel({ readyBuyers: 1, mention: 'owner' })).toBe(
      '1 acquéreur prêt correspond · courrier ou passage',
    );
    expect(cardAlertLabel({ readyBuyers: 3, mention: 'check' })).toBe(
      '3 acquéreurs prêts correspondent\u00a0: précisez le mandat',
    );
  });

  it('une tâche « Démarcher » par carte en mandat simple ou chez un particulier, jamais « à vérifier »', () => {
    const owner = card();
    const check = card({ id: 'c2', step: 'check' });
    const alerts = new Map([
      [owner, { readyBuyers: 2, mention: 'owner' as const }],
      [check, { readyBuyers: 1, mention: 'check' as const }],
    ]);
    const tasks = prospectBuyersTasks([owner, check], alerts, TODAY);
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      kind: 'prospect_buyers',
      count: 2,
      dueOn: TODAY,
      prospectCard: { id: 'c1', toConfirm: false },
    });
    expect(JSON.stringify(tasks)).not.toContain(ready.name);
  });
});

describe('la page « Aujourd’hui »', () => {
  it('quatre blocs dans l’ordre ; l’Urgent jamais regroupé ; une ligne par sorte dès deux tâches', () => {
    const board = todayBoard(
      [
        task({ kind: 'prospect', projectId: 'p9', count: 3 }),
        task({ kind: 'offer_answer', offerId: 'o1', buyerId: 'b1' }),
        task({ kind: 'offer_answer', offerId: 'o2', buyerId: 'b2' }),
        task({ projectId: 'p1' }),
        task({ projectId: 'p2', dueOn: '2026-11-05' }),
        task({ kind: 'buyer_recontact', buyerId: 'b3', projectId: '' }),
      ],
      TODAY,
    );
    expect(board.blocks.map((block) => [block.key, block.lines.length])).toEqual([
      ['urgent', 2],
      ['sellers', 1],
      ['buyers', 1],
      ['prospecting', 1],
    ]);
    const sellers = board.blocks[1]!.lines[0]!;
    expect(sellers.tasks.map((entry) => entry.projectId)).toEqual(['p2', 'p1']);
    expect(sellers.late).toBe(1);
    expect(board.lineCount).toBe(5);
    expect(board.taskCount).toBe(6);
  });

  it('une relance qui porte l’argument a sa ligne, en tête des Vendeurs', () => {
    const board = todayBoard(
      [
        task({ projectId: 'p1' }),
        task({ projectId: 'p2' }),
        task({ projectId: 'p3', readyBuyers: 1 }),
      ],
      TODAY,
    );
    const lines = board.blocks[0]!.lines;
    expect(lines.map((line) => line.tasks.map((entry) => entry.projectId))).toEqual([
      ['p3'],
      ['p1', 'p2'],
    ]);
  });

  it('« Démarcher N autres concurrents » quand des alertes ont leur ligne ; jamais un téléphone', () => {
    const tasks = [task({ kind: 'prospect', count: 3 }), task({ kind: 'prospect', count: 2 })];
    expect(seriesTitle('prospect', tasks, false)).toBe('Démarcher 5 concurrents de 2 mandats');
    expect(seriesTitle('prospect', tasks, true)).toBe(
      'Démarcher 5 autres concurrents de 2 mandats',
    );
    expect(seriesDetail('prospect', tasks)).toContain(
      'par courrier ou passage, jamais par téléphone',
    );
  });

  it('« Mes tâches » : le conseiller attitré du dossier, de l’acquéreur, ou des acquéreurs d’origine', () => {
    const owners: TaskOwners = {
      projectAdvisor: new Map([
        ['p1', 'julien'],
        ['p2', 'natacha'],
      ]),
      buyerAdvisor: new Map([
        ['b1', 'natacha'],
        ['b2', 'julien'],
      ]),
    };
    const tasks = [
      task({ projectId: 'p1' }),
      task({ projectId: 'p2' }),
      task({ kind: 'buyer_recontact', projectId: '', buyerId: 'b1' }),
      task({
        kind: 'prospect_buyers',
        projectId: '',
        prospectCard: {
          kind: 'buyer_prospect',
          id: 'x',
          label: '',
          toConfirm: false,
          originBuyerIds: ['b2'],
          letterOriginId: 'o',
        },
      }),
    ];
    expect(mineOnly(tasks, 'natacha', owners).map((entry) => entry.kind)).toEqual([
      'follow_up',
      'buyer_recontact',
    ]);
    expect(mineOnly(tasks, 'julien', owners).map((entry) => entry.kind)).toEqual([
      'follow_up',
      'prospect_buyers',
    ]);
  });

  it('« Fait aujourd’hui » : mon périmètre ; toute l’agence avec le prénom, ou « dossier de … »', () => {
    const facts: DoneFact[] = [
      {
        at: '2026-11-10T09:12:00Z',
        title: 'Relancer M. et Mme Martin',
        authorId: 'natacha',
        ownerIds: ['natacha'],
      },
      {
        at: '2026-11-10T08:00:00Z',
        title: 'Visite faite',
        authorId: null,
        ownerIds: ['julien'],
      },
    ];
    const firstNames = new Map([
      ['natacha', 'Natacha'],
      ['julien', 'Julien'],
    ]);
    const mine = doneToday(facts, { scope: 'mine', advisorId: 'natacha', firstNames, now: NOW });
    expect(mine.map((line) => line.title)).toEqual(['Relancer M. et Mme Martin']);
    expect(mine[0]!.detail).not.toContain('Natacha');
    const agency = doneToday(facts, {
      scope: 'agency',
      advisorId: 'natacha',
      firstNames,
      now: NOW,
    });
    expect(agency.map((line) => line.detail)).toEqual([
      expect.stringContaining('dossier de Julien'),
      expect.stringContaining('par Natacha'),
    ]);
  });
});
