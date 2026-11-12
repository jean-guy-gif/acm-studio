import 'server-only';

import { knownCondominium } from '@/features/buyers/services/condominium';
import { createClient } from '@/lib/supabase/server';

// Mission 151 — la copropriété connue des biens vendeurs de ces dossiers, par dossier. Une lecture
// en échec ne rend rien : la copropriété reste inconnue, et une copropriété inconnue n'écarte
// jamais un bien (la carte dit « Copropriété : à vérifier »).
export async function getMandateCondominiums(
  agencyId: string,
  projectIds: string[],
): Promise<Map<string, boolean>> {
  const known = new Map<string, boolean>();
  if (projectIds.length === 0) return known;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('subject_properties')
    .select('project_id, subject_property_condominiums(is_condominium)')
    .eq('agency_id', agencyId)
    .in('project_id', projectIds);
  if (error) return known;
  for (const row of data ?? []) {
    const value = knownCondominium(row.subject_property_condominiums);
    if (value != null) known.set(row.project_id, value);
  }
  return known;
}
