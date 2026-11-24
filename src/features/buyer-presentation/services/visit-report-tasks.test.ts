import { describe, expect, it } from 'vitest';

import { visitReportTasks } from '@/features/buyer-presentation/services/visit-report-tasks';
import { taskLine } from '@/features/meeting-conclusion/services/suivi-step-labels';
import { pendingVisitsByProject } from '@/features/meeting-conclusion/services/suivi-task-inputs';
import {
  isTaskDue,
  sortDueTasks,
  taskLateDays,
  type SuiviTask,
} from '@/features/meeting-conclusion/services/suivi-tasks';
import { mineOnly, seriesTitle, todayBoard } from '@/features/today/services/today-board';

// Lancement, mission 7 (Jean-Guy, 23/11) — « compte rendu de visite saisi en trente secondes après
// la visite » : une visite confirmée dont l'heure est passée, pas encore marquée faite, fait naître
// « Saisir le compte rendu » dans « Aujourd'hui », le jour même.
const NOW = new Date('2026-11-24T15:00:00Z');
const TODAY = '2026-11-24';
const line = (over: Partial<Parameters<typeof visitReportTasks>[0][number]> = {}) => ({
  id: 'v1',
  buyerId: 'b1',
  buyerName: 'Famille Moreau',
  buyerArchived: false,
  itemLabel: 'Maison · 5 pièces · 145 m² · La Colle-sur-Loup',
  scheduledAt: '2026-11-24T09:00:00Z',
  visitedAt: null,
  ...over,
});

describe('le compte rendu à saisir', () => {
  it('une visite confirmée dont l’heure est passée : due le jour de la visite', () => {
    const [task] = visitReportTasks([line()], NOW);
    expect(task).toMatchObject({
      kind: 'visit_report',
      dueOn: TODAY,
      buyerId: 'b1',
      buyerName: 'Famille Moreau',
      visitId: 'v1',
      propertyLabel: 'Maison · 5 pièces · 145 m² · La Colle-sur-Loup',
    });
    expect(isTaskDue(task!, TODAY)).toBe(true);
    expect(taskLateDays(task!, TODAY)).toBe(0);
  });

  it('pas avant l’heure de la visite, ni sans date confirmée, ni une fois faite, ni archivé', () => {
    expect(visitReportTasks([line({ scheduledAt: '2026-11-24T16:00:00Z' })], NOW)).toEqual([]);
    expect(visitReportTasks([line({ scheduledAt: null })], NOW)).toEqual([]);
    expect(visitReportTasks([line({ scheduledAt: undefined })], NOW)).toEqual([]);
    expect(visitReportTasks([line({ visitedAt: '2026-11-24T10:00:00Z' })], NOW)).toEqual([]);
    expect(visitReportTasks([line({ buyerArchived: true })], NOW)).toEqual([]);
  });

  it('le lendemain et après : en retard, dit en jours, avec un seul « · » à l’écran', () => {
    const [task] = visitReportTasks([line({ scheduledAt: '2026-11-22T09:00:00Z' })], NOW);
    expect(task?.dueOn).toBe('2026-11-22');
    expect(taskLateDays(task!, TODAY)).toBe(2);
    const shown = taskLine(
      task!,
      { motiveLabel: null, lastContactDays: null, signedOn: null, propertyLabel: null },
      TODAY,
    );
    expect(shown.late).toBe('en retard de 2 jours');
    // L'écran pose lui-même le « · » devant le retard : le détail ne finit pas par un autre.
    expect(shown.detail).toBe(
      'Maison · 5 pièces · 145 m² · La Colle-sur-Loup · visite prévue il y a 2 jours',
    );
  });

  it('avant les visites à organiser, et pour le titulaire de la fiche (« Mes tâches »)', () => {
    const [report] = visitReportTasks([line()], NOW);
    const organise: SuiviTask = {
      kind: 'visit',
      projectId: 'p1',
      sellerName: 'M. et Mme Garnier',
      dueOn: '2026-11-20',
    };
    expect(sortDueTasks([organise, report!]).map((task) => task.kind)).toEqual([
      'visit_report',
      'visit',
    ]);
    const owners = {
      projectAdvisor: new Map([['p1', 'advisor-2']]),
      buyerAdvisor: new Map([['b1', 'advisor-1']]),
    };
    expect(mineOnly([organise, report!], 'advisor-1', owners)).toEqual([report]);
    expect(mineOnly([organise, report!], 'advisor-2', owners)).toEqual([organise]);
  });

  it('une visite confirmée dont l’heure est passée n’est plus « à organiser » : une seule ligne', () => {
    const visit = (scheduledAt: string | null) => ({
      itemSource: 'project',
      itemReference: 'p1',
      requestedAt: '2026-11-20T10:00:00Z',
      cancelledAt: null,
      visitedAt: null,
      buyerArchived: false,
      buyerName: 'Famille Moreau',
      scheduledAt,
    });
    const past = visit('2026-11-24T09:00:00Z');
    const future = visit('2026-11-25T09:00:00Z');
    const unconfirmed = visit(null);
    expect(pendingVisitsByProject([past, future, unconfirmed], NOW).get('p1')).toEqual([
      future,
      unconfirmed,
    ]);
    // Sans l'instant (le code d'avant), rien ne change.
    expect(pendingVisitsByProject([past]).get('p1')).toEqual([past]);
  });

  it('la ligne d’« Aujourd’hui » : qui, quel bien, et le geste « Visite faite »', () => {
    const [task] = visitReportTasks([line()], NOW);
    const shown = taskLine(
      task!,
      { motiveLabel: null, lastContactDays: null, signedOn: null, propertyLabel: null },
      TODAY,
    );
    expect(shown.title).toBe('Saisir le compte rendu de la visite de la famille Moreau');
    expect(shown.detail).toBe(
      'Maison · 5 pièces · 145 m² · La Colle-sur-Loup · visite prévue aujourd’hui',
    );
    expect(shown.button).toBe('Visite faite');
    // Le bouton ouvre le formulaire de cette visite, sur Visites.
    expect(shown.href).toBe('/visites?faite=v1#visite-v1');
    expect(shown.late).toBeNull();
  });

  it('dans le bloc Acquéreurs ; plusieurs : une ligne qui les réunit', () => {
    const tasks = visitReportTasks(
      [line(), line({ id: 'v2', buyerId: 'b2', buyerName: 'M. et Mme Rossi' })],
      NOW,
    );
    const board = todayBoard(tasks, TODAY);
    expect(board.blocks.map((block) => block.key)).toEqual(['buyers']);
    expect(board.blocks[0]?.lines).toHaveLength(1);
    expect(seriesTitle('visit_report', tasks, false)).toBe('Saisir le compte rendu de 2 visites');
  });
});
