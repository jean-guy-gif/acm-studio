import type { Comparable } from '@/features/comparables/types';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// Returns a single comparable, or null when it does not exist or belongs to
// another agency. Scoped by id + project_id + agency_id.
export async function getComparable(
  projectId: string,
  comparableId: string,
): Promise<Comparable | null> {
  const profile = await getProfile();
  if (!profile) {
    return null;
  }

  const supabase = await createClient();

  const { data } = await supabase
    .from('comparables')
    .select('*')
    .eq('id', comparableId)
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();

  return data ?? null;
}
