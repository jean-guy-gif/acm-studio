'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { isLiveOrderFrozen } from '@/features/live-seller/queries/is-live-order-frozen';
import { LIVE_ORDER_FROZEN } from '@/features/live-seller/services/live-timing';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// Reorders a RETAINED comparable within the retained list only. Delegates to the
// move_selected_comparable() RPC, which locks the two retained rows and swaps
// their display_order atomically (ignoring rejected comparables). No transactional
// logic is duplicated in TypeScript. Mission 110 — refused once the Live has started.
export async function moveSelectedComparable(projectId: string, formData: FormData): Promise<void> {
  const profile = await getProfile();
  if (!profile) {
    redirect('/onboarding');
  }

  const comparableId = String(formData.get('comparableId') ?? '').trim();
  const direction = String(formData.get('direction') ?? '').trim();

  if (comparableId && (direction === 'up' || direction === 'down')) {
    const supabase = await createClient();

    // Mission 110 — une fois le Live commencé, l'ordre est figé : on le dit, rien ne bouge.
    const { data: project } = await supabase
      .from('projects')
      .select('id, agency_id, live_started_at')
      .eq('id', projectId)
      .eq('agency_id', profile.agency_id)
      .maybeSingle();
    if (!project || (await isLiveOrderFrozen(supabase, project))) {
      redirect(
        `/builder/${projectId}/comparables?error=${encodeURIComponent(
          project ? LIVE_ORDER_FROZEN : 'Le déplacement a échoué.',
        )}`,
      );
    }

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
