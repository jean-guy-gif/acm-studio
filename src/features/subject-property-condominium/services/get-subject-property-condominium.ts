import type { SubjectPropertyCondominium } from '@/features/subject-property-condominium/types';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// Returns the condominium row for a project's subject property, or null. Scoped
// to the caller's agency (RLS + explicit agency_id filter). Never invents values.
export async function getSubjectPropertyCondominium(
  projectId: string,
): Promise<SubjectPropertyCondominium | null> {
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
    .from('subject_property_condominiums')
    .select('*')
    .eq('subject_property_id', property.id)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();

  return data ?? null;
}
