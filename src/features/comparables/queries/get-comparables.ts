import type { Comparable } from '@/features/comparables/types';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// Returns the comparables of a project (ordered), or [] when the project does
// not belong to the current agency. Scoped by project_id + agency_id.
export async function getComparables(projectId: string): Promise<Comparable[]> {
  const profile = await getProfile();
  if (!profile) {
    return [];
  }

  const supabase = await createClient();

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();

  if (!project) {
    return [];
  }

  const { data } = await supabase
    .from('comparables')
    .select('*')
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });

  return data ?? [];
}
