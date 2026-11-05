import { describe, expect, it } from 'vitest';

import {
  addOneMonth,
  buildSuiviTaskList,
  dossierTasks,
  followUpDueOn,
  nextMarketUpdateOn,
  nextStep,
  taskLateDays,
  type SuiviTaskInput,
} from '@/features/meeting-conclusion/services/suivi-tasks';

// Mission 130 — les tâches du jour : relance due, Point marché à un mois de la signature puis du
// dernier point, concurrents prêts, visite demandée ; la plus ancienne d'abord.
const NOW = new Date('2026-11-05T10:00:00+01:00');

const input = (over: Partial<SuiviTaskInput>): SuiviTaskInput => ({
  projectId: 'p1',
  sellerName: 'M. et Mme Martin',
  outcome: 'signed',
  isExample: false,
  concludedAt: '2026-10-05T09:00:00Z',
  signedAt: '2026-10-05T09:00:00Z',
  firstFollowUpOn: null,
  contacts: [],
  lastPointAt: null,
  competitorCount: 4,
  readyCount: 0,
  visits: [],
  ...over,
});

describe('un mois plus tard', () => {
  it('le même jour du mois suivant ; le 31 donne le dernier jour du mois', () => {
    expect(addOneMonth('2026-10-15')).toBe('2026-11-15');
    expect(addOneMonth('2026-10-31')).toBe('2026-11-30');
    expect(addOneMonth('2026-12-20')).toBe('2027-01-20');
    expect(addOneMonth('2027-01-31')).toBe('2027-02-28');
  });
});

describe('la relance', () => {
  it('la date posée avec la dernière relance décide', () => {
    expect(
      followUpDueOn(
        '2026-10-01T09:00:00Z',
        [
          { contactedAt: '2026-10-20T09:00:00Z', nextFollowUpOn: '2026-11-20' },
          { contactedAt: '2026-10-10T09:00:00Z', nextFollowUpOn: '2026-10-17' },
        ],
        '2026-10-08',
      ),
    ).toEqual({ day: '2026-11-20', posed: true });
  });

  it('avant toute relance, la date posée à la conclusion (M108)', () => {
    expect(followUpDueOn('2026-10-01T09:00:00Z', [], '2026-10-08')).toEqual({
      day: '2026-10-08',
      posed: true,
    });
  });

  it('sans date, 8 jours après le dernier contact (au-delà de 7 jours, M96)', () => {
    expect(followUpDueOn('2026-10-01T09:00:00Z', [], null)).toEqual({
      day: '2026-10-09',
      posed: false,
    });
    expect(
      followUpDueOn('2026-10-01T09:00:00Z', [{ contactedAt: '2026-10-20T09:00:00Z' }], null),
    ).toEqual({ day: '2026-10-28', posed: false });
  });

  it('due aujourd’hui ou en retard ; à venir sinon', () => {
    const due = input({ outcome: 'follow_up', firstFollowUpOn: '2026-11-02' });
    const list = buildSuiviTaskList([due], NOW);
    expect(list.dues.map((task) => task.kind)).toEqual(['follow_up']);
    expect(taskLateDays(list.dues[0], '2026-11-05')).toBe(3);
    const later = buildSuiviTaskList([{ ...due, firstFollowUpOn: '2026-11-12' }], NOW);
    expect(later.dues).toEqual([]);
    expect(later.next?.dueOn).toBe('2026-11-12');
  });
});

describe('le Point marché, mensuel', () => {
  it('le premier un mois après la signature, puis un mois après le dernier point', () => {
    expect(nextMarketUpdateOn('2026-10-15T09:00:00Z', '2026-10-15T09:00:00Z', null)).toBe(
      '2026-11-15',
    );
    expect(
      nextMarketUpdateOn('2026-10-15T09:00:00Z', '2026-10-15T09:00:00Z', '2026-11-16T10:00:00Z'),
    ).toBe('2026-12-16');
  });

  it('un mandat d’avant la M90 part de la date du rendez-vous', () => {
    expect(nextMarketUpdateOn(null, '2026-09-30T09:00:00Z', null)).toBe('2026-10-30');
  });

  it('un mois après la signature, le point est dû ; avant, il est à venir', () => {
    expect(buildSuiviTaskList([input({})], NOW).dues.map((task) => task.kind)).toEqual([
      'market_update',
    ]);
    const recent = buildSuiviTaskList([input({ signedAt: '2026-10-23T09:00:00Z' })], NOW);
    expect(recent.dues).toEqual([]);
    expect(recent.next).toMatchObject({ kind: 'market_update', dueOn: '2026-11-23' });
  });

  it('des points illisibles : aucun « premier point dû » n’est déduit (M98)', () => {
    expect(dossierTasks(input({ pointsUnknown: true }))).toEqual([]);
  });

  it('un mandat sans concurrent retenu n’a rien à relire', () => {
    expect(dossierTasks(input({ competitorCount: 0 }))).toEqual([]);
  });
});

describe('le démarchage et les visites', () => {
  it('des concurrents prêts : dus dès la signature', () => {
    const tasks = dossierTasks(input({ signedAt: '2026-10-23T09:00:00Z', readyCount: 3 }));
    expect(tasks.map((task) => [task.kind, task.dueOn])).toEqual([
      ['prospect', '2026-10-23'],
      ['market_update', '2026-11-23'],
    ]);
    expect(nextStep(tasks, '2026-11-05')).toMatchObject({ kind: 'prospect', count: 3 });
    // Dû dès qu'une carte est prête, jamais « en retard » depuis la signature.
    expect(taskLateDays(tasks[0], '2026-11-05')).toBe(0);
  });

  it('le démarchage : daté de la plus ancienne adresse prête, au plus tôt de la signature', () => {
    const later = dossierTasks(
      input({
        signedAt: '2026-10-23T09:00:00Z',
        readyCount: 2,
        readySince: '2026-10-28T09:00:00Z',
      }),
    ).find((task) => task.kind === 'prospect')!;
    expect(later).toMatchObject({ dueOn: '2026-10-28', readyOn: '2026-10-28' });
    const before = dossierTasks(
      input({
        signedAt: '2026-10-23T09:00:00Z',
        readyCount: 2,
        readySince: '2026-10-10T09:00:00Z',
      }),
    ).find((task) => task.kind === 'prospect')!;
    expect(before).toMatchObject({ dueOn: '2026-10-23', readyOn: '2026-10-10' });
    const unknown = dossierTasks(
      input({ signedAt: '2026-10-23T09:00:00Z', readyCount: 2, readySince: null }),
    ).find((task) => task.kind === 'prospect')!;
    expect(unknown).toMatchObject({ dueOn: '2026-10-23', readyOn: null });
  });

  it('une visite demandée est due dès sa demande, jamais en retard', () => {
    const tasks = dossierTasks(
      input({
        signedAt: '2026-10-23T09:00:00Z',
        visits: [
          { requestedAt: '2026-11-03T09:00:00Z', buyerName: 'Famille Keller' },
          { requestedAt: '2026-11-04T09:00:00Z', buyerName: 'M. et Mme Rossi' },
        ],
      }),
    );
    const visit = tasks.find((task) => task.kind === 'visit')!;
    expect(visit).toMatchObject({ dueOn: '2026-11-03', count: 2, buyerName: 'Famille Keller' });
    expect(taskLateDays(visit, '2026-11-05')).toBe(0);
  });
});

describe('« À faire aujourd’hui »', () => {
  it('toute l’agence, la plus ancienne d’abord, sans le dossier d’exemple', () => {
    const list = buildSuiviTaskList(
      [
        input({ projectId: 'mougins', sellerName: 'M. Lefebvre' }),
        input({
          projectId: 'antibes',
          outcome: 'follow_up',
          firstFollowUpOn: '2026-11-05',
        }),
        input({ projectId: 'martin', signedAt: '2026-10-23T09:00:00Z', readyCount: 3 }),
        input({ projectId: 'exemple', isExample: true, readyCount: 2 }),
      ],
      NOW,
    );
    // Par valeur, puis par ancienneté (Jean-Guy, 05/11) : relancer, Point marché, démarcher.
    expect(list.dues.map((task) => [task.projectId, task.kind])).toEqual([
      ['antibes', 'follow_up'],
      ['mougins', 'market_update'],
      ['martin', 'prospect'],
    ]);
    expect(list.next).toBeNull();
  });

  it('la carte montre sa tâche due de plus grande valeur, sinon la plus proche à venir', () => {
    const tasks = dossierTasks(
      input({
        readyCount: 2,
        visits: [{ requestedAt: '2026-11-03T09:00:00Z', buyerName: 'Famille Keller' }],
      }),
    );
    expect(nextStep(tasks, '2026-11-05')?.kind).toBe('visit');
    const later = dossierTasks(input({ signedAt: '2026-10-23T09:00:00Z' }));
    expect(nextStep(later, '2026-11-05')).toMatchObject({
      kind: 'market_update',
      dueOn: '2026-11-23',
    });
  });

  it('un dossier vendu ailleurs ou retiré n’a aucune étape', () => {
    expect(dossierTasks(input({ outcome: 'sold_elsewhere', readyCount: 2 }))).toEqual([]);
    expect(dossierTasks(input({ outcome: 'withdrawn' }))).toEqual([]);
  });

  it('rien à faire, rien à venir', () => {
    expect(buildSuiviTaskList([], NOW)).toEqual({ dues: [], next: null });
  });
});
