'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import type { CreateComparableState } from '@/features/comparables/actions/create-comparable-state';
import { parseComparableForm } from '@/features/comparables/utils/comparable-input';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// useActionState-compatible action. On a validation or business error it RETURNS
// its state (no redirect, no URL params) so the form keeps every value the user
// typed and can surface errors next to their fields. A successful creation
// redirects to the comparables list instead of returning. The state type and its
// initial value live in ./create-comparable-state (a 'use server' file may only
// export async functions).

// Collect the raw string fields so the form can repopulate exactly what was
// typed — including values a validation rejected, so they can be corrected.
function collectValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const key of new Set(formData.keys())) {
    if (key === '__importGen') {
      continue;
    }
    const all = formData.getAll(key).filter((v): v is string => typeof v === 'string');
    // Repeated fields (checkbox groups) are joined with newlines so the form can
    // re-check exactly what the user selected.
    values[key] = all.length > 1 ? all.join('\n') : (all[0] ?? '');
  }
  return values;
}

// projectId is bound server-side from the route; never taken from the client.
export async function createComparable(
  projectId: string,
  _prevState: CreateComparableState,
  formData: FormData,
): Promise<CreateComparableState> {
  const importGen = String(formData.get('__importGen') ?? '') || null;

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
    return {
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
      values: collectValues(formData),
      importGen,
    };
  }

  const failureState: CreateComparableState = {
    error: 'La création du bien concurrent a échoué.',
    fieldErrors: {},
    values: collectValues(formData),
    importGen,
  };

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
      return failureState;
    }
  }

  if (!inserted) {
    return failureState;
  }

  revalidatePath(`/builder/${projectId}/comparables`);
  redirect(`/builder/${projectId}/comparables`);
}
