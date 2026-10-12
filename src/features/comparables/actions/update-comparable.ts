'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  COMPETITOR_VERIFIABLE_FIELDS,
  sanitizeFieldsToVerify,
} from '@/features/imported-fields/services/fields-to-verify';
import { parseComparableForm } from '@/features/comparables/utils/comparable-input';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// projectId and comparableId are bound server-side from the route.
// display_order and is_selected are intentionally NOT updated here.
export async function updateComparable(
  projectId: string,
  comparableId: string,
  formData: FormData,
): Promise<void> {
  const profile = await getProfile();
  if (!profile) {
    redirect('/onboarding');
  }

  const parsed = parseComparableForm(formData);
  if (!parsed.ok) {
    redirect(
      `/builder/${projectId}/comparables/${comparableId}/edit?error=${encodeURIComponent(
        parsed.error,
      )}`,
    );
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('comparables')
    // Mission 97 — ce qu'il reste à vérifier repart avec la fiche, revalidé ici.
    .update({
      ...parsed.input,
      fields_to_verify: sanitizeFieldsToVerify(
        formData.get('fields_to_verify'),
        COMPETITOR_VERIFIABLE_FIELDS,
      ),
    })
    .eq('id', comparableId)
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id);

  if (error) {
    redirect(
      `/builder/${projectId}/comparables/${comparableId}/edit?error=${encodeURIComponent(
        'La mise à jour du bien concurrent a échoué.',
      )}`,
    );
  }

  revalidatePath(`/builder/${projectId}/comparables`);
  redirect(`/builder/${projectId}/comparables`);
}
