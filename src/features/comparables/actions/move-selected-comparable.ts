'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// Reorders a RETAINED comparable within the retained list only. Delegates to the
// move_selected_comparable() RPC, which locks the two retained rows and swaps
// their display_order atomically (ignoring rejected comparables). No transactional
// logic is duplicated in TypeScript.
export async function moveSelectedComparable(projectId: string, formData: FormData): Promise<void> {
  const profile = await getProfile();
  if (!profile) {
    redirect('/onboarding');
  }

  const comparableId = String(formData.get('comparableId') ?? '').trim();
  const direction = String(formData.get('direction') ?? '').trim();

  if (comparableId && (direction === 'up' || direction === 'down')) {
    const supabase = await createClient();

    const { error } = await supabase.rpc('move_selected_comparable', {
      p_comparable_id: comparableId,
      p_direction: direction,
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
