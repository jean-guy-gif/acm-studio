import 'server-only';

import {
  buildMandateDashboard,
  type MandateDashboard,
} from '@/features/team/services/build-mandate-dashboard';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// Mission 110 — les chiffres de la prise de mandat de l'agence de l'appelant. Les lectures sont
// cadrées sur l'agence par la RLS, et le filtre le redit : rien ne sort de l'agence. Appelé
// seulement après le garde de rôle de la page (manager).
export async function getMandateDashboard(): Promise<MandateDashboard | null> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) {
    return null;
  }
  const supabase = await createClient();
  const [projects, conclusions, profiles] = await Promise.all([
    supabase
      .from('projects')
      .select('id, advisor_id, is_example')
      .eq('agency_id', profile.agency_id)
      .neq('status', 'archived'),
    supabase
      .from('project_meeting_conclusions')
      .select('project_id, outcome, mandate_type, concluded_at, signed_at, objections')
      .eq('agency_id', profile.agency_id),
    supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('agency_id', profile.agency_id),
  ]);
  if (projects.error || conclusions.error || profiles.error) {
    return null;
  }
  return buildMandateDashboard({
    projects: (projects.data ?? []).map((row) => ({
      id: row.id,
      advisorId: row.advisor_id,
      isExample: row.is_example === true,
    })),
    conclusions: (conclusions.data ?? []).map((row) => ({
      projectId: row.project_id,
      outcome: row.outcome,
      mandateType: row.mandate_type,
      concludedAt: row.concluded_at,
      signedAt: row.signed_at,
      objections: row.objections,
    })),
    advisors: (profiles.data ?? []).map((row) => ({
      id: row.id,
      name: [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || 'Conseiller',
    })),
  });
}
