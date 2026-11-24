import { describe, expect, it } from 'vitest';

import { visitReportTasks } from '@/features/buyer-presentation/services/visit-report-tasks';
import { taskLine } from '@/features/meeting-conclusion/services/suivi-step-labels';
import { isTaskDue, taskLateDays } from '@/features/meeting-conclusion/services/suivi-tasks';
import { seriesTitle, todayBoard } from '@/features/today/services/today-board';

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

  it('le lendemain et après : en retard, dit en jours', () => {
    const [task] = visitReportTasks([line({ scheduledAt: '2026-11-22T09:00:00Z' })], NOW);
    expect(task?.dueOn).toBe('2026-11-22');
    expect(taskLateDays(task!, TODAY)).toBe(2);
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
