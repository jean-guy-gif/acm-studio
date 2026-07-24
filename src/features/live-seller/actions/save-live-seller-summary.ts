'use server';

import { revalidatePath } from 'next/cache';

import {
  collectLiveValues,
  numberOrNull,
  textOrNull,
  type LiveActionState,
} from '@/features/live-seller/actions/live-action-state';
import { normalizeLiveSellerSummary } from '@/features/live-seller/services/normalize-live-seller-summary';
import { validateLiveSellerSummary } from '@/features/live-seller/services/validate-live-seller-summary';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// projectId is bound server-side. Verifies the project belongs to the caller's
// agency and, when a "most dangerous" competitor is chosen, that this comparable
// belongs to the project. Persists the seller's perceived value and the advisor's
// MANUAL comparative-market price. It never computes a price automatically and
// never modifies the advisor decision or the comparable source rows.
export async function saveLiveSellerSummary(
  projectId: string,
  _prevState: LiveActionState,
  formData: FormData,
): Promise<LiveActionState> {
  const profile = await getProfile();
  if (!profile) {
    return { ok: false, error: 'Vous devez être connecté.', fieldErrors: {}, values: null };
  }

  const supabase = await createClient();
  const values = collectLiveValues(formData);

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (!project) {
    return { ok: false, error: 'Projet introuvable pour votre agence.', fieldErrors: {}, values };
  }

  const normalized = normalizeLiveSellerSummary({
    seller_most_dangerous_comparable_id: textOrNull(
      formData.get('seller_most_dangerous_comparable_id'),
    ),
    seller_most_dangerous_reason: textOrNull(formData.get('seller_most_dangerous_reason')),
    seller_most_dangerous_comment: textOrNull(formData.get('seller_most_dangerous_comment')),
    seller_perceived_property_price: numberOrNull(formData.get('seller_perceived_property_price')),
    advisor_comparative_market_price: numberOrNull(
      formData.get('advisor_comparative_market_price'),
    ),
  });
  const validation = validateLiveSellerSummary(normalized);
  if (!validation.ok) {
    return {
      ok: false,
      error: 'Corrigez les champs indiqués.',
      fieldErrors: validation.fieldErrors,
      values,
    };
  }

  // If a dangerous competitor is selected, it must belong to this project.
  const dangerousId = validation.value.seller_most_dangerous_comparable_id;
  if (dangerousId != null) {
    const { data: comparable } = await supabase
      .from('comparables')
      .select('id')
      .eq('id', dangerousId)
      .eq('project_id', projectId)
      .eq('agency_id', profile.agency_id)
      .maybeSingle();
    if (!comparable) {
      return {
        ok: false,
        error: 'Le concurrent sélectionné n’appartient pas à ce dossier.',
        fieldErrors: { seller_most_dangerous_comparable_id: 'Concurrent invalide.' },
        values,
      };
    }
  }

  const { error } = await supabase.from('live_seller_summary').upsert(
    {
      ...validation.value,
      project_id: projectId,
      agency_id: profile.agency_id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'project_id' },
  );
  if (error) {
    return { ok: false, error: 'L’enregistrement a échoué.', fieldErrors: {}, values };
  }

  revalidatePath(`/live/${projectId}`);
  return { ok: true, error: null, fieldErrors: {}, values: null };
}
