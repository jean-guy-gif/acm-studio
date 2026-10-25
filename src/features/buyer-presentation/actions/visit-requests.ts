'use server';

import { revalidatePath } from 'next/cache';

import {
  FEEDBACK_MAX,
  isVisitOutcome,
  toVisitRequest,
} from '@/features/buyer-presentation/services/visit-request-row';
import {
  VISIT_REQUEST_DURING,
  type VisitRequest,
  type VisitRequestDuring,
} from '@/features/buyer-presentation/types';
import { AVAILABILITY_SLOTS } from '@/features/buyer-deck/types';
import { getProfile } from '@/lib/auth/get-profile';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type VisitActionResult = { ok: true; request: VisitRequest } | { ok: false; error: string };
export type PlainResult = { ok: true } | { ok: false; error: string };

const NOT_CONNECTED = 'Vous devez être connecté.';
const FAILED = 'La demande de visite n’a pas pu être enregistrée. Réessayez.';

// Mission 119 — chaque demande de visite est un fait daté, écrit par le serveur seul, dans
// l'agence de l'appelant : demandée (pendant la présentation, depuis le dossier, par le
// conseiller), annulée d'un second geste pendant la présentation, puis « Visite faite » avec un
// retour libre et une issue. Un acquéreur archivé ne reçoit plus de demande.
async function activeProfile() {
  const profile = await getProfile();
  return profile && !profile.removed_at ? profile : null;
}

function revalidate(buyerId: string): void {
  revalidatePath('/visites');
  revalidatePath(`/acquereurs/${buyerId}`);
  revalidatePath(`/presentation/${buyerId}`);
}

export async function requestVisit(itemId: string, during: unknown): Promise<VisitActionResult> {
  const profile = await activeProfile();
  if (!profile) return { ok: false, error: NOT_CONNECTED };
  // « depuis le dossier » est réservé au lien public (partie B) : le navigateur d'un conseiller ne
  // demande que « pendant la présentation » ou « par le conseiller ».
  const requestedDuring: VisitRequestDuring =
    typeof during === 'string' &&
    (VISIT_REQUEST_DURING as readonly string[]).includes(during) &&
    during !== 'dossier'
      ? (during as VisitRequestDuring)
      : 'conseiller';
  const client = createServiceRoleClient();
  const { data: item } = await client
    .from('buyer_selection_items')
    .select('id, buyer_selections!inner(buyer_id, presented_at, buyers!inner(archived_at))')
    .eq('id', itemId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  const selection = (item?.buyer_selections ?? null) as unknown as {
    buyer_id: string;
    presented_at: string | null;
    buyers: { archived_at: string | null };
  } | null;
  if (!item || !selection || selection.buyers.archived_at != null) {
    return { ok: false, error: 'Ce bien n’est plus dans une sélection active.' };
  }
  // La présentation terminée se relit en lecture seule : plus de demande « pendant la présentation ».
  if (requestedDuring === 'presentation' && selection.presented_at != null) {
    return { ok: false, error: 'La présentation est terminée : elle se relit sans se modifier.' };
  }
  const { data, error } = await client
    .from('buyer_visit_requests')
    .insert({
      agency_id: profile.agency_id,
      buyer_id: selection.buyer_id,
      buyer_selection_item_id: itemId,
      requested_during: requestedDuring,
    })
    .select('*')
    .single();
  if (error || !data) return { ok: false, error: FAILED };
  revalidate(selection.buyer_id);
  return { ok: true, request: toVisitRequest(data) };
}

export async function cancelVisitRequest(requestId: string): Promise<VisitActionResult> {
  const profile = await activeProfile();
  if (!profile) return { ok: false, error: NOT_CONNECTED };
  const client = createServiceRoleClient();
  // Une demande faite pendant une présentation ne s'annule que pendant cette présentation : une
  // fois terminée, elle se relit sans se modifier.
  const { data: existing } = await client
    .from('buyer_visit_requests')
    .select('requested_during, buyer_selection_items!inner(buyer_selections!inner(presented_at))')
    .eq('id', requestId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  const presentedAt = (
    existing?.buyer_selection_items as unknown as {
      buyer_selections: { presented_at: string | null };
    } | null
  )?.buyer_selections.presented_at;
  if (existing?.requested_during === 'presentation' && presentedAt != null) {
    return { ok: false, error: 'La présentation est terminée : elle se relit sans se modifier.' };
  }
  const { data, error } = await client
    .from('buyer_visit_requests')
    .update({ cancelled_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('agency_id', profile.agency_id)
    .is('visited_at', null)
    .is('cancelled_at', null)
    .select('*')
    .maybeSingle();
  if (error || !data) return { ok: false, error: 'La demande n’a pas pu être annulée.' };
  revalidate(data.buyer_id);
  return { ok: true, request: toVisitRequest(data) };
}

// « Terminer » : la présentation de cette sélection est faite ; elle se relit ensuite en lecture
// seule, « Terminé le [date] », sans se recalculer (M111). Mission 122 — ses disponibilités,
// touchées par le conseiller, s'écrivent sur les demandes de visite de cette présentation.
export async function finishPresentation(
  buyerId: string,
  selectionId: string,
  rawAvailability: unknown = [],
): Promise<PlainResult> {
  const profile = await activeProfile();
  if (!profile) return { ok: false, error: NOT_CONNECTED };
  const client = createServiceRoleClient();
  // La sélection PRÉSENTÉE, celle que la scène connaît — pas la dernière en date.
  const { data: selection } = await client
    .from('buyer_selections')
    .select('id, presented_at')
    .eq('id', selectionId)
    .eq('buyer_id', buyerId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (!selection) return { ok: false, error: 'Aucune sélection à présenter.' };
  if (selection.presented_at == null) {
    const { error } = await client
      .from('buyer_selections')
      .update({ presented_at: new Date().toISOString() })
      .eq('id', selection.id)
      .eq('agency_id', profile.agency_id);
    if (error)
      return { ok: false, error: 'La fin de la présentation n’a pas pu être enregistrée.' };
    const availability = AVAILABILITY_SLOTS.filter(
      (slot) => Array.isArray(rawAvailability) && rawAvailability.includes(slot),
    );
    if (availability.length > 0) {
      const { data: items } = await client
        .from('buyer_selection_items')
        .select('id')
        .eq('selection_id', selection.id)
        .eq('agency_id', profile.agency_id);
      const itemIds = (items ?? []).map((item) => item.id);
      if (itemIds.length > 0) {
        const { error: availabilityError } = await client
          .from('buyer_visit_requests')
          .update({ availability })
          .in('buyer_selection_item_id', itemIds)
          .eq('agency_id', profile.agency_id)
          .eq('requested_during', 'presentation')
          .is('cancelled_at', null)
          .is('visited_at', null);
        if (availabilityError)
          return { ok: false, error: 'Les disponibilités n’ont pas pu être enregistrées.' };
      }
    }
  }
  revalidate(buyerId);
  return { ok: true };
}

// « Visite faite » : datée, avec le retour libre de l'acquéreur et une issue.
export async function recordVisitDone(
  requestId: string,
  rawFeedback: unknown,
  rawOutcome: unknown,
): Promise<VisitActionResult> {
  const profile = await activeProfile();
  if (!profile) return { ok: false, error: NOT_CONNECTED };
  if (!isVisitOutcome(rawOutcome) || rawOutcome === 'to_plan') {
    return { ok: false, error: 'Choisissez l’issue de la visite.' };
  }
  const feedback = typeof rawFeedback === 'string' ? rawFeedback.trim().slice(0, FEEDBACK_MAX) : '';
  const client = createServiceRoleClient();
  const { data, error } = await client
    .from('buyer_visit_requests')
    .update({
      visited_at: new Date().toISOString(),
      feedback: feedback || null,
      outcome: rawOutcome,
    })
    .eq('id', requestId)
    .eq('agency_id', profile.agency_id)
    .is('cancelled_at', null)
    // Un fait daté ne se redate pas : une visite faite ne s'enregistre qu'une fois.
    .is('visited_at', null)
    .select('*')
    .maybeSingle();
  if (error || !data)
    return { ok: false, error: 'Le retour de visite n’a pas pu être enregistré.' };
  revalidate(data.buyer_id);
  return { ok: true, request: toVisitRequest(data) };
}
