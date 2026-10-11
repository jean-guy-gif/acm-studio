'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { removeProjectCompetitorPhotos } from '@/features/prospecting-file/services/remove-their-photos';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export async function deleteProject(formData: FormData): Promise<void> {
  const profile = await getProfile();
  if (!profile) {
    redirect('/onboarding');
  }

  const projectId = String(formData.get('projectId') ?? '').trim();

  if (projectId) {
    const supabase = await createClient();

    // Scoped by agency_id: a project from another agency is never deleted.
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('agency_id', profile.agency_id);

    if (error) {
      redirect(`/builder?error=${encodeURIComponent('La suppression du dossier a échoué.')}`);
    }
    // Mission 87 — les dossiers de prospection de ses concurrents sont partis avec lui
    // (cascade) : leurs photos aussi.
    await removeProjectCompetitorPhotos(supabase.storage, profile.agency_id, projectId);
  }

  revalidatePath('/builder');
  redirect('/builder');
}
