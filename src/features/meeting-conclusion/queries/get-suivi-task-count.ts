import 'server-only';

import { readVisitLines } from '@/features/buyer-presentation/queries/get-visit-requests';
import { getLoopTasks } from '@/features/buyers/queries/get-loop-properties';
import { getBuyerRecontactTasks } from '@/features/buyers/queries/get-buyer-recontact-tasks';
import { getWatchTasks } from '@/features/buyer-watch/queries/get-watch';
import { getOfferTasks } from '@/features/purchase-offer/queries/get-offer-tasks';
import { getSuiviDossiers } from '@/features/meeting-conclusion/queries/get-suivi-dossiers';
import { suiviTaskInputs } from '@/features/meeting-conclusion/services/suivi-task-inputs';
import { buildSuiviTaskList } from '@/features/meeting-conclusion/services/suivi-tasks';
import { getAgencyProspecting } from '@/features/prospecting/queries/get-agency-prospecting';
import { withoutExamples } from '@/features/welcome/services/example-exclusion';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// Mission 130 — le compteur du menu « Suivi » : le nombre de tâches dues aujourd'hui, pour toute
// l'agence (M59), sans le dossier d'exemple (M97). Les mêmes entrées que la page, lues au plus
// juste (les relances et la date des points seulement). Une lecture en échec ne compte rien de
// plus : le compteur se tait plutôt que de mentir (M98).
export async function getSuiviTaskCount(): Promise<number | null> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) return null;
  const now = new Date();
  // Mission 132 — les acquéreurs à recontacter comptent aussi, avec ou sans dossier conclu.
  // Mission 134 — et les nouveaux biens à proposer, avec ou sans dossier conclu.
  // Mission 136 — et ce que la veille a trouvé.
  // Mission 137 B — et les offres d'achat qui expirent.
  const [allDossiers, buyerTasks, loopTasks, watchTasks, offerTasks] = await Promise.all([
    getSuiviDossiers(),
    getBuyerRecontactTasks(profile, now),
    getLoopTasks(profile.agency_id, now),
    getWatchTasks(profile.agency_id, now),
    getOfferTasks(profile.agency_id, now),
  ]);
  if (buyerTasks.failed || loopTasks.failed || watchTasks.failed || offerTasks.failed) return null;
  const extra = [...buyerTasks.tasks, ...loopTasks.tasks, ...watchTasks.tasks, ...offerTasks.tasks];
  const dossiers = withoutExamples(allDossiers);
  if (dossiers.length === 0) return buildSuiviTaskList([], now, extra).dues.length;
  const projectIds = dossiers.map((dossier) => dossier.project.id);
  const supabase = await createClient();
  const [contactsRes, pointsRes, prospecting, visits] = await Promise.all([
    supabase
      .from('follow_up_contacts')
      .select('project_id, contacted_at, next_follow_up_on')
      .in('project_id', projectIds)
      .eq('agency_id', profile.agency_id),
    supabase
      .from('project_market_updates')
      .select('project_id, made_at')
      .in('project_id', projectIds)
      .eq('agency_id', profile.agency_id),
    getAgencyProspecting(dossiers),
    readVisitLines(),
  ]);
  if (contactsRes.error || pointsRes.error || visits.failed) return null;
  const contacts = new Map<string, { contactedAt: string; nextFollowUpOn: string | null }[]>();
  for (const row of contactsRes.data ?? []) {
    contacts.set(row.project_id, [
      ...(contacts.get(row.project_id) ?? []),
      { contactedAt: row.contacted_at, nextFollowUpOn: row.next_follow_up_on },
    ]);
  }
  const lastPoints = new Map<string, string>();
  for (const row of pointsRes.data ?? []) {
    const known = lastPoints.get(row.project_id);
    if (!known || row.made_at > known) lastPoints.set(row.project_id, row.made_at);
  }
  const inputs = suiviTaskInputs({
    dossiers,
    contacts,
    lastPoints,
    cards: prospecting.cards,
    visits: visits.lines,
  });
  return buildSuiviTaskList(inputs, now, extra).dues.length;
}
