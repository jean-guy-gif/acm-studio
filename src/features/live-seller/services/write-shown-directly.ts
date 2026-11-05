import 'server-only';

import {
  isLiveClosed,
  LIVE_CLOSED_MESSAGE,
  NOT_SHOWN_IN_LIVE_MESSAGE,
} from '@/features/live-seller/services/live-closed';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// Mission 131 — un concurrent MONTRÉ EN DIRECTE : son prix et sa durée sont livrés sans devinette.
// Ce n'est pas une réponse du vendeur : la ligne ne porte que le fait daté (`shown_directly_at`),
// aucune de ses colonnes de réponse n'est écrite. La base le garde une fois, jamais vidé, et le
// refuse hors présentation directe ou après une devinette ou un « Non » (migration
// 20261120090000) ; ici, mêmes gardes que pour une réponse (agence, Live conclu, concurrent montré).
export type WriteShownDirectlyResult = { ok: true } | { ok: false; error: string };

export const NOT_DIRECT_MESSAGE = 'Le Live n’est pas en présentation directe.';
export const ALREADY_ANSWERED_MESSAGE = 'Ce concurrent a déjà sa réponse du vendeur.';

export async function writeShownDirectly(
  projectId: string,
  comparableId: string,
): Promise<WriteShownDirectlyResult> {
  const profile = await getProfile();
  if (!profile) {
    return { ok: false, error: 'Vous devez être connecté.' };
  }
  const supabase = await createClient();

  const { data: project } = await supabase
    .from('projects')
    .select('id, status, live_presentation_mode')
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (!project) {
    return { ok: false, error: 'Projet introuvable pour votre agence.' };
  }
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
  if (!comparable.is_selected || comparable.excluded_from_live) {
    return { ok: false, error: NOT_SHOWN_IN_LIVE_MESSAGE };
  }

  const { data: existing } = await supabase
    .from('live_seller_responses')
    .select('id, shown_directly_at, seller_estimated_listing_price, seller_serious_competitor')
    .eq('project_id', projectId)
    .eq('comparable_id', comparableId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  // Déjà montré : rien à réécrire (la base garderait de toute façon le premier instant).
  if (existing?.shown_directly_at != null) {
    return { ok: true };
  }
  if (existing?.seller_serious_competitor === 'no') {
    return { ok: false, error: ALREADY_ANSWERED_MESSAGE };
  }
  if (project.live_presentation_mode !== 'direct') {
    return { ok: false, error: NOT_DIRECT_MESSAGE };
  }
  // Deviné avant le passage en directe : son prix est déjà livré, et sa devinette reste telle
  // quelle ; rien n'est écrit (la base refuserait le fait), la durée suit par la même livraison.
  if (existing?.seller_estimated_listing_price != null) {
    return { ok: true };
  }

  const shownAt = new Date().toISOString();
  if (existing) {
    const { error } = await supabase
      .from('live_seller_responses')
      .update({ shown_directly_at: shownAt, updated_at: shownAt })
      .eq('id', existing.id)
      .eq('agency_id', profile.agency_id);
    return error ? { ok: false, error: 'L’enregistrement a échoué.' } : { ok: true };
  }
  const { error } = await supabase.from('live_seller_responses').insert({
    project_id: projectId,
    comparable_id: comparableId,
    agency_id: profile.agency_id,
    shown_directly_at: shownAt,
  });
  // Insertion concurrente (un double toucher) : la ligne existe, le fait aussi.
  if (error?.code === '23505') {
    return { ok: true };
  }
  return error ? { ok: false, error: 'L’enregistrement a échoué.' } : { ok: true };
}
