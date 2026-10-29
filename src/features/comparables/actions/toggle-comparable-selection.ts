'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { absorbBuyerProspectsForProject } from '@/features/buyer-prospecting/services/absorb-buyer-prospects';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export async function toggleComparableSelection(
  projectId: string,
  formData: FormData,
): Promise<void> {
  const profile = await getProfile();
  if (!profile) {
    redirect('/onboarding');
  }

  const comparableId = String(formData.get('comparableId') ?? '').trim();

  if (comparableId) {
    const supabase = await createClient();

    const { data: current } = await supabase
      .from('comparables')
      .select('id, is_selected')
      .eq('id', comparableId)
      .eq('project_id', projectId)
      .eq('agency_id', profile.agency_id)
      .maybeSingle();

    if (current) {
      await supabase
        .from('comparables')
        .update({ is_selected: !current.is_selected })
        .eq('id', current.id)
        .eq('project_id', projectId)
        .eq('agency_id', profile.agency_id);
      // Mission 120 — une carte par bien : retenu dans un mandat signé, il reprend la carte d'une
      // recherche acquéreur sur la même annonce (même règle que « La retenir », M108).
      if (!current.is_selected) {
        await absorbBuyerProspectsForProject(supabase, profile.agency_id, projectId, current.id);
        revalidatePath('/prospection');
      }
    }
  }

  revalidatePath(`/builder/${projectId}/comparables`);
  redirect(`/builder/${projectId}/comparables`);
}
