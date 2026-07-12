'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export async function deleteComparable(projectId: string, formData: FormData): Promise<void> {
  const profile = await getProfile();
  if (!profile) {
    redirect('/onboarding');
  }

  const comparableId = String(formData.get('comparableId') ?? '').trim();

  if (comparableId) {
    const supabase = await createClient();

    const { error } = await supabase
      .from('comparables')
      .delete()
      .eq('id', comparableId)
      .eq('project_id', projectId)
      .eq('agency_id', profile.agency_id);

    if (error) {
      redirect(
        `/builder/${projectId}/comparables?error=${encodeURIComponent(
          'La suppression du bien concurrent a échoué.',
        )}`,
      );
    }
  }

  revalidatePath(`/builder/${projectId}/comparables`);
  redirect(`/builder/${projectId}/comparables`);
}
