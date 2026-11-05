import { describe, expect, it } from 'vitest';

import {
  cardStep,
  nothingTodayLabel,
  taskLine,
  type CardStepContext,
  type TaskContext,
} from '@/features/meeting-conclusion/services/suivi-step-labels';
import type { SuiviTask } from '@/features/meeting-conclusion/services/suivi-tasks';

// Mission 130 — ce que disent « À faire aujourd'hui » et la prochaine étape d'une carte : un
// bouton plein seulement pour une étape due, aucun pour un dossier clos, jamais plein sur
// l'exemple.
const TODAY = '2026-11-05';

const task = (over: Partial<SuiviTask>): SuiviTask => ({
  kind: 'follow_up',
  projectId: 'p1',
  sellerName: 'M. et Mme Martin',
  dueOn: TODAY,
  datePosed: true,
  ...over,
});

const context: CardStepContext = {
  outcome: 'follow_up',
  sellerName: 'M. et Mme Martin',
  isExample: false,
  competitorCount: 4,
  toConfirmCount: 0,
  declinedCount: 0,
  latestPoint: null,
  outcomeChangedOn: null,
  datePosed: true,
  lastContactNote: null,
};

const lineContext: TaskContext = {
  motiveLabel: 'Réfléchit au prix',
  lastContactDays: 8,
  signedOn: '2026-10-15',
  propertyLabel: 'Maison · 7 pièces · 210 m² · Mougins',
};

describe('« À faire aujourd’hui »', () => {
  it('une relance du jour', () => {
    expect(taskLine(task({}), lineContext, TODAY)).toEqual({
      title: 'Relancer M. et Mme Martin',
      detail: 'Réfléchit au prix · dernier contact il y a 8 jours · relance prévue aujourd’hui',
      late: null,
      button: 'Relancer',
      href: '/suivi?relancer=p1#suivi-p1',
    });
  });

  it('une relance en retard : la fin en orange ; sans date posée, la règle le dit', () => {
    const line = taskLine(task({ dueOn: '2026-11-02', datePosed: false }), lineContext, TODAY);
    expect(line.detail).toContain('relance prévue le 02/11 (8 jours après le dernier contact), ');
    expect(line.late).toBe('en retard de 3 jours');
    expect(taskLine(task({ dueOn: '2026-11-04' }), lineContext, TODAY).late).toBe(
      'en retard d’un jour',
    );
  });

  it('le premier Point marché, mensuel', () => {
    const line = taskLine(
      task({ kind: 'market_update', sellerName: 'M. Lefebvre', lastPointOn: null }),
      lineContext,
      TODAY,
    );
    expect(line.title).toBe('Point marché de M. Lefebvre');
    expect(line.detail).toBe('Mandat signé le 15/10 · premier Point marché dû (tous les mois)');
    expect(line.button).toBe('Faire le point');
  });

  it('démarcher et organiser une visite : jamais en retard', () => {
    const prospect = taskLine(
      task({ kind: 'prospect', dueOn: '2026-10-15', count: 3, sellerName: 'Martin' }),
      lineContext,
      TODAY,
    );
    expect(prospect).toMatchObject({
      title: 'Démarcher 3 concurrents de Martin',
      detail: '3 adresses prêtes · courriers à imprimer',
      late: null,
      button: 'Prospecter',
      href: '/prospection?bien=p1',
    });
    const visit = taskLine(
      task({ kind: 'visit', dueOn: '2026-11-03', count: 1, buyerName: 'Famille Keller' }),
      lineContext,
      TODAY,
    );
    expect(visit.title).toBe('Organiser la visite de Famille Keller chez M. et Mme Martin');
    expect(visit.late).toBeNull();
    expect(visit.href).toBe('/visites');
  });

  it('rien à faire : la prochaine tâche, ou aucune', () => {
    expect(nothingTodayLabel(task({ dueOn: '2026-11-12' }))).toBe(
      'Rien à faire aujourd’hui. Prochaine tâche : relancer M. et Mme Martin le 12/11.',
    );
    expect(nothingTodayLabel(null)).toBe('Rien à faire aujourd’hui, et aucune tâche prévue.');
  });
});

describe('la prochaine étape d’une carte', () => {
  it('due : bouton plein, au nom complet du vendeur', () => {
    const step = cardStep(task({}), context, TODAY);
    expect(step.when).toBe('aujourd’hui');
    expect(step.button).toEqual({
      label: 'Relancer M. et Mme Martin',
      action: { kind: 'relance' },
      primary: true,
    });
  });

  it('à venir : bouton en contour, la date dans l’en-tête', () => {
    const step = cardStep(task({ dueOn: '2026-11-23' }), context, TODAY);
    expect(step.when).toBe('le 23/11');
    expect(step.button?.primary).toBe(false);
  });

  it('en retard : l’en-tête le dit, en orange', () => {
    const step = cardStep(task({ dueOn: '2026-11-02' }), context, TODAY);
    expect(step).toMatchObject({ when: 'en retard de 3 jours', whenLate: true });
  });

  it('vendu ailleurs ou retiré : aucune étape, aucun bouton', () => {
    for (const outcome of ['sold_elsewhere', 'withdrawn'] as const) {
      const step = cardStep(null, { ...context, outcome, outcomeChangedOn: '2026-10-28' }, TODAY);
      expect(step.button).toBeNull();
      expect(step.when).toBe('aucune');
      expect(step.phrase).toContain('(noté le 28/10)');
    }
  });

  it('le dossier d’exemple : jamais de bouton plein, jamais de date', () => {
    const step = cardStep(task({ dueOn: '2026-11-01' }), { ...context, isExample: true }, TODAY);
    expect(step.button?.primary).toBe(false);
    expect(step.whenLate).toBe(false);
    expect(step.phrase).toContain('Dossier d’exemple');
  });

  it('le Point marché dû se lance ; fait, il s’ouvre seulement', () => {
    const signed = { ...context, outcome: 'signed' as const, sellerName: 'M. Lefebvre' };
    const due = cardStep(task({ kind: 'market_update' }), signed, TODAY);
    expect(due.title).toBe('Faire son premier Point marché');
    expect(due.phrase).toBe(
      'ACM relit les annonces des concurrents (gratuit), puis vous envoyez le document au vendeur.',
    );
    expect(due.button).toMatchObject({
      label: 'Faire le point marché',
      action: { kind: 'market_update' },
      primary: true,
    });
    const done = cardStep(
      task({ kind: 'market_update', dueOn: '2026-12-05' }),
      {
        ...signed,
        latestPoint: { id: 'pt', madeOn: TODAY, line: '5 annonces relues · 2 baisses' },
      },
      TODAY,
    );
    expect(done.title).toBe('Prochain Point marché');
    expect(done.button).toMatchObject({
      label: 'Voir le Point du 05/11',
      action: { kind: 'point_panel' },
      primary: false,
    });
  });

  it('un mandat sans concurrent : rien à faire, aucun bouton', () => {
    const step = cardStep(null, { ...context, outcome: 'signed', competitorCount: 0 }, TODAY);
    expect(step.title).toBe('Rien à faire pour l’instant');
    expect(step.button).toBeNull();
  });
});
