import { ARCHIVED_STATUS } from '@/features/projects/services/archive-project';
import type { Project } from '@/features/projects/types';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// Returns a single seller project, or null when it does not exist or belongs
// to another agency. Explicitly scoped by agency_id (multi-tenant isolation).
// Mission 93 — un dossier archivé (« supprimé ») est invisible par conception : il ne s'ouvre
// plus par son adresse non plus, sur aucun écran (préparation, Live, conclusion, prospection).
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
    .neq('status', ARCHIVED_STATUS)
    .maybeSingle();

  return data ?? null;
}
