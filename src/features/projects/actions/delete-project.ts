'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

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
  }

  revalidatePath('/builder');
  redirect('/builder');
}
