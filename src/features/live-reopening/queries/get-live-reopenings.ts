import 'server-only';

import type { LiveReopening } from '@/features/live-reopening/types';
import { requireOperator } from '@/features/operations/services/require-operator';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

// Mission 104 — les réouvertures d'un dossier (qui, quand, motif), pour les SEULS opérateurs : la
// table est fermée au navigateur ; elle se lit par la clé service, après le garde. Les réponses
// effacées restent dans la trace, en base : elles ne s'affichent pas.
export async function getLiveReopenings(projectId: string): Promise<LiveReopening[] | null> {
  const guard = await requireOperator();
  if (!guard.ok) {
    return null;
  }
  const { data } = await createServiceRoleClient()
    .from('live_reopenings')
    .select('created_at, operator_email, reason')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(20);
  return (data ?? []).map((row) => ({
    createdAt: row.created_at,
    operatorEmail: row.operator_email,
    reason: row.reason,
  }));
}
