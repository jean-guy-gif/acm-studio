import type { SubjectProperty } from '@/features/subject-property/types';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// Returns the subject property of a project, or null. Explicitly scoped by
// project_id and agency_id (multi-tenant isolation, in addition to RLS).
export async function getSubjectProperty(projectId: string): Promise<SubjectProperty | null> {
  const profile = await getProfile();
  if (!profile) {
    return null;
  }

  const supabase = await createClient();

  const { data } = await supabase
    .from('subject_properties')
    .select('*')
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();

  return data ?? null;
}
