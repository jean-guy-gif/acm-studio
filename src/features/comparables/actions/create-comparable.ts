'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { parseComparableForm } from '@/features/comparables/utils/comparable-input';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// projectId is bound server-side from the route; never taken from the client.
export async function createComparable(projectId: string, formData: FormData): Promise<void> {
  const profile = await getProfile();
  if (!profile) {
    redirect('/onboarding');
  }

  const supabase = await createClient();

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();

  if (!project) {
    redirect('/builder');
  }

  const parsed = parseComparableForm(formData);
  if (!parsed.ok) {
    redirect(`/builder/${projectId}/comparables/new?error=${encodeURIComponent(parsed.error)}`);
  }

  const failureRedirect = `/builder/${projectId}/comparables/new?error=${encodeURIComponent(
    'La création du bien concurrent a échoué.',
  )}`;

  // display_order = max + 1, recomputed on every attempt. A concurrent creation
  // can win the same order; the DEFERRABLE unique constraint then raises 23505,
  // on which we retry (up to 5 times). Any other error stops immediately.
  let inserted = false;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: last } = await supabase
      .from('comparables')
      .select('display_order')
      .eq('project_id', projectId)
      .eq('agency_id', profile.agency_id)
      .order('display_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrder = (last?.display_order ?? 0) + 1;

    const { error } = await supabase.from('comparables').insert({
      ...parsed.input,
      project_id: projectId,
      agency_id: profile.agency_id,
      display_order: nextOrder,
      is_selected: true,
    });

    if (!error) {
      inserted = true;
      break;
    }
    if (error.code !== '23505') {
      redirect(failureRedirect);
    }
  }

  if (!inserted) {
    redirect(failureRedirect);
  }

  revalidatePath(`/builder/${projectId}/comparables`);
  redirect(`/builder/${projectId}/comparables`);
}
