'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { archiveProject, type ArchiveClient } from '@/features/projects/services/archive-project';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// Mission 93 — « Supprimer » un dossier l'archive (suppression douce) : il disparaît des listes
// et n'est plus ouvrable, mais rien n'est effacé — ni lui, ni ses photos de prospection (M87).
export async function archiveProjectAction(formData: FormData): Promise<void> {
  const profile = await getProfile();
  if (!profile) {
    redirect('/onboarding');
  }

  const projectId = String(formData.get('projectId') ?? '').trim();

  if (projectId) {
    const supabase = await createClient();
    // Le service ne connaît du client que ce dont il a besoin (une mise à jour, jamais `delete`).
    const { ok } = await archiveProject(
      supabase as unknown as ArchiveClient,
      profile.agency_id,
      projectId,
    );
    if (!ok) {
      redirect(`/builder?error=${encodeURIComponent('La suppression du dossier a échoué.')}`);
    }
  }

  revalidatePath('/builder');
  revalidatePath('/live');
  revalidatePath('/suivi');
  revalidatePath('/prospection');
  redirect('/builder');
}
