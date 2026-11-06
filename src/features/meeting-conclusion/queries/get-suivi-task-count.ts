import 'server-only';

import { readVisitLines } from '@/features/buyer-presentation/queries/get-visit-requests';
import { getMandateBuyers } from '@/features/buyers/queries/get-mandate-buyers';
import { getBuyerRecontactTasks } from '@/features/buyers/queries/get-buyer-recontact-tasks';
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
  const [allDossiers, buyerTasks] = await Promise.all([
    getSuiviDossiers(),
    getBuyerRecontactTasks(profile, now),
  ]);
  if (buyerTasks.failed) return null;
  const dossiers = withoutExamples(allDossiers);
  if (dossiers.length === 0) return buildSuiviTaskList([], now, buyerTasks.tasks).dues.length;
  const projectIds = dossiers.map((dossier) => dossier.project.id);
  const supabase = await createClient();
  // Mission 133 — les mandats signés appellent leurs acquéreurs prêts.
  const mandates = dossiers
    .filter((dossier) => dossier.conclusion?.outcome === 'signed')
    .map((dossier) => ({
      projectId: dossier.project.id,
      signedAt: dossier.conclusion?.signedAt ?? dossier.conclusion?.concludedAt ?? null,
    }));
  const [contactsRes, pointsRes, prospecting, visits, mandateRead] = await Promise.all([
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
    getMandateBuyers(profile.agency_id, mandates, now),
  ]);
  if (contactsRes.error || pointsRes.error || visits.failed || mandateRead.failed) return null;
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
    buyersToPropose: new Map(
      [...mandateRead.byProject].map(([projectId, entry]) => [projectId, entry.toPropose]),
    ),
  });
  return buildSuiviTaskList(inputs, now, buyerTasks.tasks).dues.length;
}
