import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { readPhotoPaths } from '@/features/subject-property-photos/services/get-property-photos';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/database.types';

export type PropertyPhotosContext =
  | {
      ok: true;
      supabase: SupabaseClient<Database>;
      agencyId: string;
      currentPaths: string[];
    }
  | { ok: false; error: string };

// Shared guard for the photo actions: authenticates, verifies the project belongs
// to the caller's agency (multi-tenant isolation, on top of RLS), and returns the
// current stored photo paths. Same ownership check as save-subject-property.
export async function loadPropertyPhotosContext(projectId: string): Promise<PropertyPhotosContext> {
  const profile = await getProfile();
  if (!profile) {
    return { ok: false, error: 'Vous devez être connecté.' };
  }

  const supabase = await createClient();

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (!project) {
    return { ok: false, error: 'Projet introuvable pour votre agence.' };
  }

  const { data: property } = await supabase
    .from('subject_properties')
    .select('photo_urls')
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();

  return {
    ok: true,
    supabase,
    agencyId: profile.agency_id,
    currentPaths: readPhotoPaths(property?.photo_urls ?? null),
  };
}

// Writes the ordered list of photo paths onto the project's subject property,
// creating the row if it does not exist yet (a minimal row is valid). Upserts
// only photo_urls, so the scalar fields saved by the main form are untouched.
export async function writePropertyPhotoPaths(
  supabase: SupabaseClient<Database>,
  params: { projectId: string; agencyId: string; paths: string[] },
): Promise<{ ok: boolean }> {
  const { error } = await supabase.from('subject_properties').upsert(
    {
      project_id: params.projectId,
      agency_id: params.agencyId,
      photo_urls: params.paths,
    },
    { onConflict: 'project_id' },
  );
  return { ok: !error };
}
