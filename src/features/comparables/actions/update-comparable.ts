'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import type { UpdateComparableState } from '@/features/comparables/actions/update-comparable-state';
import { storedListingUrl } from '@/features/comparable-import/utils/normalize-listing-url';
import {
  existingListing,
  isDuplicateListing,
} from '@/features/competitor-search/services/insert-competitor';
import {
  COMPETITOR_VERIFIABLE_FIELDS,
  sanitizeFieldsToVerify,
} from '@/features/imported-fields/services/fields-to-verify';
import { parseComparableForm } from '@/features/comparables/utils/comparable-input';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

const DUPLICATE_RETAINED_MESSAGE =
  'Déjà dans le dossier\u00a0: cette annonce a déjà sa fiche, retenue. Cette fiche n’a pas été modifiée.';
const FAILURE = 'La mise à jour du bien concurrent a échoué.';

function collectValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const key of new Set(formData.keys())) {
    const all = formData.getAll(key).filter((v): v is string => typeof v === 'string');
    values[key] = all.length > 1 ? all.join('\n') : (all[0] ?? '');
  }
  return values;
}

// projectId and comparableId are bound server-side from the route.
// display_order and is_selected are intentionally NOT updated here.
// Mission 112 — les mêmes règles que l'import : l'adresse de l'annonce est nettoyée par portail
// (M108) ; un doublon se dit, et la saisie reste dans le formulaire (useActionState).
export async function updateComparable(
  projectId: string,
  comparableId: string,
  _previous: UpdateComparableState,
  formData: FormData,
): Promise<UpdateComparableState> {
  const profile = await getProfile();
  if (!profile) {
    redirect('/onboarding');
  }
  const values = collectValues(formData);

  const parsed = parseComparableForm(formData);
  if (!parsed.ok) {
    return { error: parsed.error, values, duplicate: null };
  }

  const supabase = await createClient();
  const listingUrl = storedListingUrl(parsed.input.listing_url);
  const { error } = await supabase
    .from('comparables')
    // Mission 97 — ce qu'il reste à vérifier repart avec la fiche, revalidé ici.
    .update({
      ...parsed.input,
      listing_url: listingUrl,
      fields_to_verify: sanitizeFieldsToVerify(
        formData.get('fields_to_verify'),
        COMPETITOR_VERIFIABLE_FIELDS,
      ),
    })
    .eq('id', comparableId)
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id);

  if (error) {
    if (isDuplicateListing(error)) {
      const other = await existingListing(supabase, projectId, profile.agency_id, listingUrl);
      if (other && other.id !== comparableId) {
        return {
          error: other.selected ? DUPLICATE_RETAINED_MESSAGE : null,
          values,
          duplicate: other,
        };
      }
    }
    return { error: FAILURE, values, duplicate: null };
  }

  revalidatePath(`/builder/${projectId}/comparables`);
  redirect(`/builder/${projectId}/comparables`);
}
