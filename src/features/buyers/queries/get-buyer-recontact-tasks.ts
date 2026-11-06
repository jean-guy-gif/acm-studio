import 'server-only';

import { readBuyers } from '@/features/buyers/queries/get-buyers';
import { getBuyersProgress } from '@/features/buyers/queries/get-buyers-progress';
import { getRelaunchFacts } from '@/features/buyers/queries/get-relaunch-facts';
import { buyerReadiness } from '@/features/buyers/services/buyer-readiness';
import { relaunchDue } from '@/features/buyers/services/link-relaunch';
import { NO_PROGRESS } from '@/features/buyers/services/buyer-progress';
import type { SuiviTask } from '@/features/meeting-conclusion/services/suivi-tasks';
import { createClient } from '@/lib/supabase/server';
import { readPages } from '@/lib/supabase/read-pages';
import {
  meetingTasks,
  weeklyReportTasks,
  type ReportBuyer,
} from '@/features/buyer-messages/report-tasks';

// Mission 135 — et « Relancer M. et Mme Lambert » : un lien resté 48 h sans réponse.
// Mission 132 — « Reprendre contact avec la famille Keller » : une tâche par acquéreur actif de
// l'agence (M59), due 30 jours après son dernier échange, à venir sinon. Les mêmes faits que la
// fiche et la liste (`buyerReadiness`). Une lecture en échec ne fabrique aucune tâche et le dit
// (`failed`) : le compteur du menu se tait plutôt que de mentir (M98).
export async function getBuyerRecontactTasks(
  profile: { agency_id: string },
  now: Date,
): Promise<{ tasks: SuiviTask[]; failed: boolean }> {
  const { buyers, failed } = await readBuyers();
  if (failed) return { tasks: [], failed: true };
  if (buyers.length === 0) return { tasks: [], failed: false };
  const supabase = await createClient();
  const [progress, relaunch, reports] = await Promise.all([
    getBuyersProgress(
      supabase,
      profile.agency_id,
      buyers.map((buyer) => buyer.id),
    ),
    // Mission 135 — la relance d'un lien sans réponse.
    getRelaunchFacts(supabase, profile.agency_id, buyers),
    // Mission 139 — les points de la semaine envoyés et les points proposés.
    readPages((from, to) =>
      supabase
        .from('buyer_events')
        .select('buyer_id, kind, week_start, occurred_at')
        .eq('agency_id', profile.agency_id)
        .in('kind', ['weekly_report', 'meeting_proposed'])
        .order('id')
        .range(from, to),
    ),
  ]);
  if (relaunch.failed || reports.error || [...progress.values()].some((facts) => facts.unread)) {
    return { tasks: [], failed: true };
  }
  const reportedWeeks = new Map<string, Set<string>>();
  const lastMeeting = new Map<string, string>();
  for (const row of reports.data) {
    if (row.kind === 'weekly_report' && row.week_start) {
      reportedWeeks.set(
        row.buyer_id,
        (reportedWeeks.get(row.buyer_id) ?? new Set()).add(row.week_start),
      );
    } else if (row.kind === 'meeting_proposed') {
      const known = lastMeeting.get(row.buyer_id);
      if (!known || row.occurred_at > known) lastMeeting.set(row.buyer_id, row.occurred_at);
    }
  }
  const reportBuyers: ReportBuyer[] = [];
  const tasks: SuiviTask[] = [];
  for (const buyer of buyers) {
    // Mission 139 — actif : en recherche ou en visite, un échange il y a moins de 30 jours.
    const state = buyerReadiness(buyer, progress.get(buyer.id) ?? NO_PROGRESS, now);
    reportBuyers.push({
      id: buyer.id,
      name: buyer.name,
      createdAt: buyer.createdAt,
      active: state.recontactOn != null && state.state !== 'recontact',
      ready: state.state === 'ready',
      reportedWeeks: reportedWeeks.get(buyer.id) ?? new Set(),
      lastMeetingAt: lastMeeting.get(buyer.id) ?? null,
    });
    // Mission 135 — une relance due l'emporte sur « Reprendre contact » pour le même acquéreur.
    const facts = relaunch.facts.get(buyer.id);
    const due = facts ? relaunchDue(facts, now) : null;
    if (due) {
      tasks.push({
        kind: 'buyer_relaunch',
        projectId: '',
        sellerName: '',
        dueOn: due.dueOn,
        buyerId: buyer.id,
        buyerName: buyer.name,
        count: due.rank,
        sentOn: due.sentOn,
        linkExpired: due.expired,
      });
      continue;
    }
    const readiness = buyerReadiness(buyer, progress.get(buyer.id) ?? NO_PROGRESS, now);
    if (readiness.recontactOn == null) continue;
    tasks.push({
      kind: 'buyer_recontact',
      projectId: '',
      sellerName: '',
      dueOn: readiness.recontactOn,
      buyerId: buyer.id,
      buyerName: buyer.name,
      sinceDays: readiness.sinceDays ?? undefined,
    });
  }
  return {
    tasks: [...tasks, ...meetingTasks(reportBuyers), ...weeklyReportTasks(reportBuyers, now)],
    failed: false,
  };
}
