import 'server-only';

import { numberOrNull, textOrNull } from '@/features/live-seller/actions/live-action-state';
import { normalizeLiveComparableResponse } from '@/features/live-seller/services/normalize-live-comparable-response';
import { validateLiveComparableResponse } from '@/features/live-seller/services/validate-live-comparable-response';
import {
  isLiveClosed,
  LIVE_CLOSED_MESSAGE,
  NOT_SHOWN_IN_LIVE_MESSAGE,
} from '@/features/live-seller/services/live-closed';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// MISSION 51 §3.2 — le CŒUR d'écriture d'une réponse concurrent, SANS revalidatePath :
// écrire une ligne est instantané ; c'est la revalidation de toute la page (8 requêtes
// + buildSellerPresentation) qui coûtait les 3 s. On sépare l'écriture (rapide) de la
// revalidation (rare, à des points nommés). Sécurité inchangée : projet ET concurrent
// vérifiés pour l'agence de l'appelant ; les colonnes source ne sont jamais touchées.
export type WriteLiveResponseResult =
  { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function writeLiveComparableResponse(
  projectId: string,
  comparableId: string,
  formData: FormData,
): Promise<WriteLiveResponseResult> {
  const profile = await getProfile();
  if (!profile) {
    return { ok: false, error: 'Vous devez être connecté.' };
  }

  const supabase = await createClient();

  const { data: project } = await supabase
    .from('projects')
    .select('id, status')
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (!project) {
    return { ok: false, error: 'Projet introuvable pour votre agence.' };
  }
  // Mission 109 — un dossier conclu ou archivé ne change plus par le Live.
  if (isLiveClosed(project.status)) {
    return { ok: false, error: LIVE_CLOSED_MESSAGE };
  }

  const { data: comparable } = await supabase
    .from('comparables')
    .select('id, is_selected, excluded_from_live')
    .eq('id', comparableId)
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (!comparable) {
    return { ok: false, error: 'Bien concurrent introuvable pour ce dossier.' };
  }
  // Mission 112 — pas de réponse pour un concurrent que le vendeur ne voit pas : hors Live, ou plus
  // retenu. La base le refuse aussi.
  if (!comparable.is_selected || comparable.excluded_from_live) {
    return { ok: false, error: NOT_SHOWN_IN_LIVE_MESSAGE };
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
    ...(formData.has('seller_price_coherence') && {
      seller_price_coherence: textOrNull(formData.get('seller_price_coherence')),
    }),
    ...(formData.has('seller_price_coherence_comment') && {
      seller_price_coherence_comment: textOrNull(formData.get('seller_price_coherence_comment')),
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

  // Mission 104 — « Non » à « Un sérieux concurrent ? » dispense de deviner : un prix ou une
  // durée tapés avant « Non » ne s'enregistrent pas. Sinon la base figerait la devinette ET le
  // prix révélé (M92, M96) d'un concurrent que le vendeur a écarté — faussant la bande des prix,
  // la médiane et le Suivi.
  if (normalized.seller_serious_competitor === 'no') {
    delete normalized.seller_estimated_listing_price;
    delete normalized.seller_estimated_days_on_market;
  }

  const validation = validateLiveComparableResponse(normalized);
  if (!validation.ok) {
    return {
      ok: false,
      error: 'Corrigez les champs indiqués.',
      fieldErrors: validation.fieldErrors,
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
    return { ok: false, error: 'L’enregistrement a échoué.' };
  }

  if (!updatedResponse) {
    const { error: insertError } = await supabase.from('live_seller_responses').insert({
      ...responsePatch,
      project_id: projectId,
      comparable_id: comparableId,
      agency_id: profile.agency_id,
    });
    if (insertError?.code === '23505') {
      // Insertion concurrente : on rejoue le même patch au niveau champ.
      const { error: retryError } = await supabase
        .from('live_seller_responses')
        .update(responsePatch)
        .eq('project_id', projectId)
        .eq('comparable_id', comparableId)
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
