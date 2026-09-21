import 'server-only';

import { numberOrNull, textOrNull } from '@/features/live-seller/actions/live-action-state';
import { normalizeLiveSellerSummary } from '@/features/live-seller/services/normalize-live-seller-summary';
import { validateLiveSellerSummary } from '@/features/live-seller/services/validate-live-seller-summary';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// MISSION 51 §3.2 — cœur d'écriture du résumé vendeur, SANS revalidatePath (jumeau de
// write-live-comparable-response). L'action garde la revalidation ; le shell, lui,
// enregistre en arrière-plan par ce cœur, puis demande la livraison autorisée par la
// voie unique. Sécurité inchangée : projet vérifié pour l'agence, et un concurrent « le
// plus dangereux » doit appartenir au dossier ET être un concurrent sérieux/incertain.
export type WriteLiveSummaryResult =
  { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function writeLiveSellerSummary(
  projectId: string,
  formData: FormData,
): Promise<WriteLiveSummaryResult> {
  const profile = await getProfile();
  if (!profile) {
    return { ok: false, error: 'Vous devez être connecté.' };
  }

  const supabase = await createClient();

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (!project) {
    return { ok: false, error: 'Projet introuvable pour votre agence.' };
  }

  const normalized = normalizeLiveSellerSummary({
    ...(formData.has('seller_most_dangerous_comparable_id') && {
      seller_most_dangerous_comparable_id: textOrNull(
        formData.get('seller_most_dangerous_comparable_id'),
      ),
    }),
    ...(formData.has('seller_most_dangerous_reason') && {
      seller_most_dangerous_reason: textOrNull(formData.get('seller_most_dangerous_reason')),
    }),
    ...(formData.has('seller_most_dangerous_comment') && {
      seller_most_dangerous_comment: textOrNull(formData.get('seller_most_dangerous_comment')),
    }),
    ...(formData.has('seller_perceived_property_price') && {
      seller_perceived_property_price: numberOrNull(
        formData.get('seller_perceived_property_price'),
      ),
    }),
    ...(formData.has('advisor_comparative_market_price') && {
      advisor_comparative_market_price: numberOrNull(
        formData.get('advisor_comparative_market_price'),
      ),
    }),
    ...(formData.has('seller_property_confirmed') && {
      seller_property_confirmed: textOrNull(formData.get('seller_property_confirmed')),
    }),
    ...(formData.has('seller_property_comment') && {
      seller_property_comment: textOrNull(formData.get('seller_property_comment')),
    }),
  });
  const validation = validateLiveSellerSummary(normalized);
  if (!validation.ok) {
    return {
      ok: false,
      error: 'Corrigez les champs indiqués.',
      fieldErrors: validation.fieldErrors,
    };
  }

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
      };
    }
    const { data: eligibleResponse } = await supabase
      .from('live_seller_responses')
      .select('id')
      .eq('project_id', projectId)
      .eq('comparable_id', dangerousId)
      .eq('agency_id', profile.agency_id)
      .in('seller_serious_competitor', ['yes', 'unsure'])
      .maybeSingle();
    if (!eligibleResponse) {
      return {
        ok: false,
        error: 'Seul un concurrent sérieux ou incertain peut être sélectionné.',
        fieldErrors: {
          seller_most_dangerous_comparable_id: 'Ce bien n’est pas un concurrent éligible.',
        },
      };
    }
  }

  const summaryPatch = { ...validation.value, updated_at: new Date().toISOString() };
  const { data: updatedSummary, error: updateError } = await supabase
    .from('live_seller_summary')
    .update(summaryPatch)
    .select('id')
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (updateError) {
    return { ok: false, error: 'L’enregistrement a échoué.' };
  }

  if (!updatedSummary) {
    const { error: insertError } = await supabase.from('live_seller_summary').insert({
      ...summaryPatch,
      project_id: projectId,
      agency_id: profile.agency_id,
    });
    if (insertError?.code === '23505') {
      const { error: retryError } = await supabase
        .from('live_seller_summary')
        .update(summaryPatch)
        .eq('project_id', projectId)
        .eq('agency_id', profile.agency_id);
      if (retryError) {
        return { ok: false, error: 'L’enregistrement a échoué.' };
      }
    } else if (insertError) {
      return { ok: false, error: 'L’enregistrement a échoué.' };
    }
  }

  return { ok: true };
}
