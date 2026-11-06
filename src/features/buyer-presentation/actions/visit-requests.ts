'use server';

import { revalidatePath } from 'next/cache';

import { visitOutcomeOf } from '@/features/buyer-messages/report';
import { visitReportSchema } from '@/features/buyer-messages/report-schema';
import {
  FEEDBACK_MAX,
  toVisitRequest,
} from '@/features/buyer-presentation/services/visit-request-row';
import { type VisitRequest, type VisitRequestDuring } from '@/features/buyer-presentation/types';
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

// Une demande « par le conseiller ». Mission 122 (décision de Jean-Guy, 25/10) : « pendant la
// présentation » ne naît plus que d'une réponse « Je veux le visiter » (`answer_buyer_item`), et
// « depuis le dossier » du seul lien public.
export async function requestVisit(itemId: string): Promise<VisitActionResult> {
  const profile = await activeProfile();
  if (!profile) return { ok: false, error: NOT_CONNECTED };
  const requestedDuring: VisitRequestDuring = 'conseiller';
  const client = createServiceRoleClient();
  const { data: item } = await client
    .from('buyer_selection_items')
    .select('id, buyer_selections!inner(buyer_id, presented_at, buyers!inner(archived_at))')
    .eq('id', itemId)
    .eq('agency_id', profile.agency_id)
    .is('removed_at', null)
    .maybeSingle();
  const selection = (item?.buyer_selections ?? null) as unknown as {
    buyer_id: string;
    buyers: { archived_at: string | null };
  } | null;
  if (!item || !selection || selection.buyers.archived_at != null) {
    return { ok: false, error: 'Ce bien n’est plus dans une sélection active.' };
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

// « Visite faite » : datée, avec le retour libre de l'acquéreur et une issue.
// Mission 139 — « Visite faite » : le compte rendu (l'avis, ce qui a plu et déplu, une note libre,
// la suite), daté par le serveur, une seule fois ; l'issue s'en déduit (« Offre envisagée » ⇔ 'offer',
// lue par l'offre d'achat, M137 B) ; « Deuxième visite » crée une nouvelle demande à planifier, par le
// conseiller. Les messages prêts se préparent ensuite (`prepareVisitMessages`).
export async function recordVisitDone(requestId: string, raw: unknown): Promise<VisitActionResult> {
  const profile = await activeProfile();
  if (!profile) return { ok: false, error: NOT_CONNECTED };
  const parsed = visitReportSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: 'Choisissez son avis et la suite de la visite.' };
  }
  const report = parsed.data;
  const client = createServiceRoleClient();
  const { data, error } = await client
    .from('buyer_visit_requests')
    .update({
      visited_at: new Date().toISOString(),
      feedback: report.note.slice(0, FEEDBACK_MAX) || null,
      outcome: visitOutcomeOf(report),
      opinion: report.opinion,
      liked: report.liked,
      disliked: report.disliked,
      next_step: report.nextStep,
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
  // Une demande encore vivante sur ce bien ne se redouble pas (M122).
  const { data: alive } =
    report.nextStep === 'second_visit'
      ? await client
          .from('buyer_visit_requests')
          .select('id')
          .eq('agency_id', profile.agency_id)
          .eq('buyer_id', data.buyer_id)
          .eq('buyer_selection_item_id', data.buyer_selection_item_id)
          .is('cancelled_at', null)
          .is('visited_at', null)
          .limit(1)
      : { data: [] };
  if (report.nextStep === 'second_visit' && (alive ?? []).length === 0) {
    const { error: secondError } = await client.from('buyer_visit_requests').insert({
      agency_id: profile.agency_id,
      buyer_id: data.buyer_id,
      buyer_selection_item_id: data.buyer_selection_item_id,
      requested_during: 'conseiller',
    });
    if (secondError) {
      revalidate(data.buyer_id);
      return {
        ok: false,
        error:
          'La visite est notée, mais la deuxième visite n’a pas pu être demandée : demandez-la depuis sa fiche.',
      };
    }
  }
  revalidate(data.buyer_id);
  return { ok: true, request: toVisitRequest(data) };
}
