import 'server-only';

import {
  signPropertyPhotos,
  type SignedPhoto,
} from '@/features/subject-property-photos/services/property-photo-storage';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// Reads the stored photo PATHS of a project's subject property and returns them
// signed for read. Signing happens at every render (short-lived URLs, private
// bucket) — never a public URL persisted anywhere. Scoped by agency + project.
export async function getPropertyPhotos(projectId: string): Promise<SignedPhoto[]> {
  const profile = await getProfile();
  if (!profile) {
    return [];
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from('subject_properties')
    .select('photo_urls')
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();

  const paths = readPhotoPaths(data?.photo_urls ?? null);
  if (paths.length === 0) {
    return [];
  }
  return signPropertyPhotos(supabase, paths);
}

// photo_urls is a jsonb column; keep only non-empty string entries.
export function readPhotoPaths(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
}
