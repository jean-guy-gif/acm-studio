'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// Delegates to the transactional move_comparable() RPC, which locks and swaps
// the two display_order values atomically and enforces agency isolation.
export async function moveComparable(projectId: string, formData: FormData): Promise<void> {
  const profile = await getProfile();
  if (!profile) {
    redirect('/onboarding');
  }

  const comparableId = String(formData.get('comparableId') ?? '').trim();
  const direction = String(formData.get('direction') ?? '').trim();

  if (comparableId && (direction === 'up' || direction === 'down')) {
    const supabase = await createClient();

    const { error } = await supabase.rpc('move_comparable', {
      target_project_id: projectId,
      target_comparable_id: comparableId,
      move_direction: direction,
    });

    if (error) {
      redirect(
        `/builder/${projectId}/comparables?error=${encodeURIComponent('Le déplacement a échoué.')}`,
      );
    }
  }

  revalidatePath(`/builder/${projectId}/comparables`);
  redirect(`/builder/${projectId}/comparables`);
}
