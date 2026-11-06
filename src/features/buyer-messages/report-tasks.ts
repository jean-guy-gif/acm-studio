import { addDays, type SuiviTask } from '@/features/meeting-conclusion/services/suivi-tasks';
import { coveredWeek } from '@/features/buyer-messages/week';
import { parisDay } from '@/features/meeting-conclusion/services/follow-up-contacts';

// Mission 139 — les deux tâches de la recherche, sans état en base : elles se vident quand
// « Envoyé » est noté (`buyer_events`, jamais un échange, M135). Pur.
//   • Le point de la semaine : chaque lundi, à chaque acquéreur actif (en recherche ou en visite,
//     un échange il y a moins de 30 jours), sur la semaine écoulée ; jamais en retard, la semaine
//     suivante la remplace.
//   • Le point proposé : à un acquéreur prêt à visiter, 14 jours après la création de sa fiche, puis
//     14 jours après le dernier point proposé.

export const MEETING_EVERY_DAYS = 14;

export type ReportBuyer = {
  id: string;
  name: string;
  createdAt: string;
  // En recherche ou en visite, un échange il y a moins de 30 jours (ni « À recontacter »).
  active: boolean;
  ready: boolean;
  // Les semaines déjà envoyées (leur lundi), et le dernier point proposé.
  reportedWeeks: ReadonlySet<string>;
  lastMeetingAt: string | null;
};

export function weeklyReportTasks(buyers: ReportBuyer[], now: Date): SuiviTask[] {
  const week = coveredWeek(now);
  return buyers
    .filter((buyer) => buyer.active && !buyer.reportedWeeks.has(week.start))
    .map((buyer) => ({
      kind: 'buyer_weekly_report' as const,
      projectId: '',
      sellerName: '',
      dueOn: week.end,
      buyerId: buyer.id,
      buyerName: buyer.name,
      weekStart: week.start,
    }));
}

export function meetingTasks(buyers: ReportBuyer[]): SuiviTask[] {
  return buyers
    .filter((buyer) => buyer.ready)
    .map((buyer) => ({
      kind: 'buyer_meeting' as const,
      projectId: '',
      sellerName: '',
      dueOn: addDays(
        parisDay(new Date(buyer.lastMeetingAt ?? buyer.createdAt)),
        MEETING_EVERY_DAYS,
      ),
      buyerId: buyer.id,
      buyerName: buyer.name,
    }));
}
