import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { toAmount } from '@/features/mandate-life/services/mandate-row';
import type { MandateAmendment } from '@/features/mandate-life/types';
import type { Database } from '@/lib/supabase/database.types';

// Lot C — les avenants de baisse des mandats de l'agence, par dossier ; null si la lecture échoue
// (jamais « aucun avenant », M98).
export async function getMandateAmendments(
  supabase: SupabaseClient<Database>,
  agencyId: string,
  projectIds: string[],
): Promise<Map<string, MandateAmendment[]> | null> {
  const byProject = new Map<string, MandateAmendment[]>();
  if (projectIds.length === 0) return byProject;
  const { data, error } = await supabase
    .from('mandate_price_amendments')
    .select('id, project_id, amended_on, price, created_at')
    .eq('agency_id', agencyId)
    .in('project_id', projectIds);
  if (error) return null;
  for (const row of data ?? []) {
    const price = toAmount(row.price);
    if (price == null) continue;
    const list = byProject.get(row.project_id) ?? [];
    list.push({ id: row.id, amendedOn: row.amended_on, price, createdAt: row.created_at });
    byProject.set(row.project_id, list);
  }
  return byProject;
}
