import type { VisitLine } from '@/features/buyer-presentation/queries/get-visit-requests';
import { parisDay } from '@/features/meeting-conclusion/services/follow-up-contacts';
import type { SuiviTask } from '@/features/meeting-conclusion/services/suivi-tasks';

// Lancement, mission 7 (Jean-Guy, 23/11) — « compte rendu de visite saisi en trente secondes après
// la visite » : une visite confirmée (son jour et son heure posés par « Confirmer la visite », M142)
// dont l'heure est passée, pas encore marquée faite, fait naître « Saisir le compte rendu » dans
// « Aujourd'hui ». Due le jour de la visite (Paris), en retard ensuite ; elle disparaît quand la
// visite est notée faite. Une visite sans date confirmée n'en fait pas naître : on ne sait pas
// qu'elle a eu lieu. Pur.
export function visitReportTasks(
  lines: Pick<
    VisitLine,
    'id' | 'buyerId' | 'buyerName' | 'buyerArchived' | 'itemLabel' | 'scheduledAt' | 'visitedAt'
  >[],
  now: Date,
): SuiviTask[] {
  const tasks: SuiviTask[] = [];
  for (const line of lines) {
    if (line.visitedAt != null || line.buyerArchived || !line.scheduledAt) continue;
    const scheduled = new Date(line.scheduledAt);
    if (Number.isNaN(scheduled.getTime()) || scheduled.getTime() > now.getTime()) continue;
    tasks.push({
      kind: 'visit_report',
      projectId: '',
      sellerName: '',
      dueOn: parisDay(scheduled),
      buyerId: line.buyerId,
      buyerName: line.buyerName,
      visitId: line.id,
      propertyLabel: line.itemLabel,
      scheduledAt: line.scheduledAt,
    });
  }
  return tasks;
}
