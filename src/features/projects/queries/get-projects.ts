import type { Project } from '@/features/projects/types';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// Returns the seller projects of the current profile's agency, newest first.
// Explicitly filters by agency_id even though RLS already isolates the data.
export async function getProjects(): Promise<Project[]> {
  const profile = await getProfile();
  if (!profile) {
    return [];
  }

  const supabase = await createClient();

  const { data } = await supabase
    .from('projects')
    .select(
      'id, seller_name, seller_email, seller_phone, status, created_at, updated_at, advisor_id, agency_id',
    )
    .eq('agency_id', profile.agency_id)
    .order('created_at', { ascending: false });

  return data ?? [];
}
