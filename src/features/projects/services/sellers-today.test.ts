import { describe, expect, it } from 'vitest';

import type { SuiviTask } from '@/features/meeting-conclusion/services/suivi-tasks';
import {
  selectedSeller,
  sellersToday,
  sellerTaskButton,
  sellerTaskKey,
  sellerTaskTone,
  sellerTaskWhat,
  sellerTodayHref,
} from '@/features/projects/services/sellers-today';
import { todayBoard } from '@/features/today/services/today-board';

// La refonte, lot E (maquettes REFONTE-7 et 8) — « À faire aujourd'hui » de Vendeurs.

const TODAY = '2026-11-26';

const task = (partial: Partial<SuiviTask> & Pick<SuiviTask, 'kind'>): SuiviTask => ({
  projectId: 'p1',
  sellerName: 'M. Lambert',
  dueOn: TODAY,
  ...partial,
});

const relance = task({ kind: 'follow_up', projectId: 'p-lambert', sellerName: 'M. Lambert' });
const point = task({
  kind: 'market_update',
  projectId: 'p-petit',
  sellerName: 'Mme Petit',
  lastPointOn: null,
});
// Le tableau d'« Aujourd'hui » : Vendeurs lit son bloc « Vendeurs », dans son ordre.
const board = (...tasks: SuiviTask[]) => todayBoard(tasks, TODAY);

const context = (projectId: string) =>
  projectId === 'p-lambert'
    ? { motiveLabel: 'Réfléchit au prix', signedOn: null }
    : projectId === 'p-petit'
      ? { motiveLabel: null, signedOn: '2026-10-26' }
      : undefined;

describe('ce qu’il y a à faire, sans redire son nom', () => {
  it('une relance : son motif ; des acquéreurs prêts : l’argument', () => {
    expect(sellerTaskWhat(relance, context('p-lambert'))).toBe('À relancer · Réfléchit au prix');
    expect(sellerTaskWhat(relance, undefined)).toBe('À relancer');
    expect(
      sellerTaskWhat(
        { ...relance, readyBuyers: 2, property: { propertyType: 'Maison', city: 'Antibes' } },
        context('p-lambert'),
      ),
    ).toBe('À relancer : 2 acquéreurs prêts correspondent à la maison');
  });

  it('« Relancer plus tôt ? » : des acquéreurs prêts, et la relance prévue', () => {
    expect(
      sellerTaskWhat(
        task({ kind: 'follow_up_early', readyBuyers: 1, plannedOn: '2026-12-03' }),
        undefined,
      ),
    ).toBe('Relancer plus tôt ? 1 acquéreur prêt correspond · relance prévue le 03/12');
  });

  it('un Point marché : le mandat signé, ou le dernier point', () => {
    expect(sellerTaskWhat(point, context('p-petit'))).toBe(
      'Mandat signé le 26/10 · premier Point marché',
    );
    expect(sellerTaskWhat({ ...point, lastPointOn: '2026-10-26' }, undefined)).toBe(
      'Dernier point le 26/10 · Point marché du mois',
    );
    expect(sellerTaskWhat(point, undefined)).toBe('Mandat signé · premier Point marché');
  });

  it('jamais le nom du vendeur dans ce qu’il y a à faire', () => {
    for (const item of [relance, point]) {
      expect(sellerTaskWhat(item, context(item.projectId))).not.toContain(item.sellerName);
    }
  });

  it('les boutons, dans les mots de la maquette', () => {
    expect(sellerTaskButton(relance)).toBe('Préparer la relance');
    expect(sellerTaskButton(point)).toBe('Faire le point marché');
    expect(sellerTaskButton(task({ kind: 'follow_up_early' }))).toBe('Relancer');
  });

  it('la teinte suit la tâche : un mandat signé en vert, un retard en orange', () => {
    expect(sellerTaskTone(point, 0)).toBe('good');
    expect(sellerTaskTone(relance, 0)).toBe('plain');
    expect(sellerTaskTone(relance, 3)).toBe('watch');
    expect(sellerTaskTone(point, 2)).toBe('watch');
  });
});

describe('une carte par vendeur', () => {
  it('les seules tâches du bloc « Vendeurs » d’« Aujourd’hui »', () => {
    const buyer = task({ kind: 'buyer_watch', buyerId: 'b1', projectId: '' });
    const offer = task({ kind: 'offer_answer', buyerId: 'b1', offerId: 'o1' });
    const prospect = task({ kind: 'prospect', projectId: 'p-petit', count: 3 });
    const items = sellersToday(board(buyer, offer, prospect, relance, point), context, TODAY);
    expect(items.map((item) => item.projectId)).toEqual(['p-lambert', 'p-petit']);
    expect(items.flatMap((item) => item.others)).toEqual([]);
  });

  it('dans l’ordre d’« Aujourd’hui » : la relance qui porte l’argument en tête (M145 B)', () => {
    const older = { ...relance, dueOn: '2026-11-20' };
    const argued = task({
      kind: 'follow_up',
      projectId: 'p-durand',
      sellerName: 'Mme Durand',
      readyBuyers: 2,
    });
    const items = sellersToday(board(older, point, argued), context, TODAY);
    expect(items.map((item) => item.projectId)).toEqual(['p-durand', 'p-lambert', 'p-petit']);
  });

  it('un vendeur ne paraît qu’une fois : ses autres tâches suivent la première', () => {
    const early = task({
      kind: 'follow_up_early',
      projectId: 'p-petit',
      sellerName: 'Mme Petit',
      readyBuyers: 1,
    });
    const items = sellersToday(board(point, early), context, TODAY);
    expect(items).toHaveLength(1);
    expect(items[0]!.name).toBe('Mme Petit');
    expect(items[0]!.others).toHaveLength(1);
  });

  it('le retard se dit à part, en orange', () => {
    const late = { ...relance, dueOn: '2026-11-23' };
    const [item] = sellersToday(board(late), context, TODAY);
    expect(item!.late).toBe('en retard de 3 jours');
    expect(item!.tone).toBe('watch');
  });

  it('sans dossier connu, aucune carte : rien n’est deviné', () => {
    expect(sellersToday(board({ ...relance, projectId: '' }), context, TODAY)).toEqual([]);
  });

  it('le détail : le vendeur de l’adresse, sinon le premier', () => {
    const items = sellersToday(board(relance, point), context, TODAY);
    expect(selectedSeller(items, 'p-petit')?.projectId).toBe('p-petit');
    expect(selectedSeller(items, 'inconnu')?.projectId).toBe('p-lambert');
    expect(selectedSeller(items, undefined)?.projectId).toBe('p-lambert');
    expect(selectedSeller([], 'p-petit')).toBeNull();
    expect(sellerTodayHref({ projectId: 'p-petit' })).toBe('/vendeurs?vendeur=p-petit');
  });

  it('deux tâches d’un même vendeur ne partagent pas leur clé', () => {
    const early = task({ kind: 'follow_up_early', projectId: 'p-lambert' });
    expect(sellerTaskKey(relance)).not.toBe(sellerTaskKey(early));
    expect(sellerTaskKey({ ...relance })).toBe(sellerTaskKey(relance));
  });
});
