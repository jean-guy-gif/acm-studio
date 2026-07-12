import type { Project } from '@/features/projects/types';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// Returns a single seller project, or null when it does not exist or belongs
// to another agency. Explicitly scoped by agency_id (multi-tenant isolation).
export async function getProject(projectId: string): Promise<Project | null> {
  const profile = await getProfile();
  if (!profile) {
    return null;
  }

  const supabase = await createClient();

  const { data } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();

  return data ?? null;
}
