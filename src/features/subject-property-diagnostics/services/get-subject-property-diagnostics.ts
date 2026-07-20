import type { SubjectPropertyDiagnostics } from '@/features/subject-property-diagnostics/types';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// Returns the diagnostics row for a project's subject property, or null. Scoped
// to the caller's agency (RLS + explicit agency_id filter). Never invents values.
export async function getSubjectPropertyDiagnostics(
  projectId: string,
): Promise<SubjectPropertyDiagnostics | null> {
  const profile = await getProfile();
  if (!profile) {
    return null;
  }

  const supabase = await createClient();

  const { data: property } = await supabase
    .from('subject_properties')
    .select('id')
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (!property) {
    return null;
  }

  const { data } = await supabase
    .from('subject_property_diagnostics')
    .select('*')
    .eq('subject_property_id', property.id)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();

  return data ?? null;
}
