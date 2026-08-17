'use server';

import { revalidatePath } from 'next/cache';

import {
  collectLiveValues,
  numberOrNull,
  textOrNull,
  type LiveActionState,
} from '@/features/live-seller/actions/live-action-state';
import { normalizeLiveComparableResponse } from '@/features/live-seller/services/normalize-live-comparable-response';
import { validateLiveComparableResponse } from '@/features/live-seller/services/validate-live-comparable-response';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// projectId and comparableId are bound server-side from the route; never trusted
// from the client. The action verifies the project belongs to the caller's agency
// AND that the comparable belongs to that project, then UPSERTs the seller's
// answers. It never touches the comparable source rows or the advisor decision.
export async function saveLiveComparableResponse(
  projectId: string,
  comparableId: string,
  _prevState: LiveActionState,
  formData: FormData,
): Promise<LiveActionState> {
  const profile = await getProfile();
  if (!profile) {
    return { ok: false, error: 'Vous devez être connecté.', fieldErrors: {}, values: null };
  }

  const supabase = await createClient();
  const values = collectLiveValues(formData);

  // Project must belong to the caller's agency (RLS-scoped).
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (!project) {
    return { ok: false, error: 'Projet introuvable pour votre agence.', fieldErrors: {}, values };
  }

  // The comparable must belong to THIS project and agency (reject forged ids).
  const { data: comparable } = await supabase
    .from('comparables')
    .select('id')
    .eq('id', comparableId)
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (!comparable) {
    return {
      ok: false,
      error: 'Bien concurrent introuvable pour ce dossier.',
      fieldErrors: {},
      values,
    };
  }

  const normalized = normalizeLiveComparableResponse({
    ...(formData.has('seller_serious_competitor') && {
      seller_serious_competitor: textOrNull(formData.get('seller_serious_competitor')),
    }),
    ...(formData.has('seller_serious_competitor_comment') && {
      seller_serious_competitor_comment: textOrNull(
        formData.get('seller_serious_competitor_comment'),
      ),
    }),
    ...(formData.has('seller_estimated_listing_price') && {
      seller_estimated_listing_price: numberOrNull(formData.get('seller_estimated_listing_price')),
    }),
    ...(formData.has('seller_estimated_days_on_market') && {
      seller_estimated_days_on_market: numberOrNull(
        formData.get('seller_estimated_days_on_market'),
      ),
    }),
    ...(formData.has('seller_market_duration_reason') && {
      seller_market_duration_reason: textOrNull(formData.get('seller_market_duration_reason')),
    }),
    ...(formData.has('seller_market_duration_comment') && {
      seller_market_duration_comment: textOrNull(formData.get('seller_market_duration_comment')),
    }),
  });
  const validation = validateLiveComparableResponse(normalized);
  if (!validation.ok) {
    return {
      ok: false,
      error: 'Corrigez les champs indiqués.',
      fieldErrors: validation.fieldErrors,
      values,
    };
  }

  const responsePatch = { ...validation.value, updated_at: new Date().toISOString() };
  const { data: updatedResponse, error: updateError } = await supabase
    .from('live_seller_responses')
    .update(responsePatch)
    .select('id')
    .eq('project_id', projectId)
    .eq('comparable_id', comparableId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (updateError) {
    return { ok: false, error: 'L’enregistrement a échoué.', fieldErrors: {}, values };
  }

  let writeError = null;
  if (!updatedResponse) {
    const { error: insertError } = await supabase.from('live_seller_responses').insert({
      ...responsePatch,
      project_id: projectId,
      comparable_id: comparableId,
      agency_id: profile.agency_id,
    });
    if (insertError?.code === '23505') {
      // Another request inserted the first row concurrently: retry the same
      // field-level patch, never a stale full-row replacement.
      const { error: retryError } = await supabase
        .from('live_seller_responses')
        .update(responsePatch)
        .eq('project_id', projectId)
        .eq('comparable_id', comparableId)
        .eq('agency_id', profile.agency_id);
      writeError = retryError;
    } else {
      writeError = insertError;
    }
  }
  if (writeError) {
    return { ok: false, error: 'L’enregistrement a échoué.', fieldErrors: {}, values };
  }

  revalidatePath(`/live/${projectId}`);
  return { ok: true, error: null, fieldErrors: {}, values: null };
}
