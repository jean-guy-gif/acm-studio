import 'server-only';

import {
  buildManagerOverview,
  type ManagerOverview,
  type TeamConclusion,
  type TeamProfile,
  type TeamProject,
} from '@/features/team/services/build-manager-overview';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// Mission 59 jalon 1 — l'activité de l'agence pour le manager. AUCUNE nouvelle RLS : les
// lectures sont déjà cadrées `agency_id = get_current_agency_id()` (isolation par agence), donc
// un SELECT normal ne renvoie QUE l'agence de l'appelant. Les chiffres ne sortent pas de
// l'agence (§3), par construction. L'appel n'est fait qu'après le garde de rôle de la page.
export async function getManagerOverview(): Promise<ManagerOverview | null> {
  const profile = await getProfile();
  if (!profile) {
    return null;
  }
  const supabase = await createClient();

  const [{ data: profiles }, { data: projects }, { data: conclusions }] = await Promise.all([
    supabase.from('profiles').select('id, first_name, last_name, role'),
    supabase.from('projects').select('id, advisor_id, seller_name, status, updated_at'),
    supabase.from('project_meeting_conclusions').select('project_id, outcome, outcome_changed_at'),
  ]);

  const teamProfiles: TeamProfile[] = (profiles ?? []).map((p) => ({
    id: p.id,
    firstName: p.first_name,
    lastName: p.last_name,
    role: p.role,
  }));
  const teamProjects: TeamProject[] = (projects ?? []).map((p) => ({
    id: p.id,
    advisorId: p.advisor_id,
    sellerName: p.seller_name,
    status: p.status,
    updatedAt: p.updated_at,
  }));
  const teamConclusions: TeamConclusion[] = (conclusions ?? []).map((c) => ({
    projectId: c.project_id,
    outcome: c.outcome,
    outcomeChangedAt: c.outcome_changed_at,
  }));

  return buildManagerOverview(teamProfiles, teamProjects, teamConclusions);
}
