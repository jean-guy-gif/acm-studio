'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { getBuyerAnswers } from '@/features/buyer-deck/queries/get-buyer-answers';
import { answerSuggestions } from '@/features/buyer-deck/services/answer-suggestions';
import { clampPitch } from '@/features/buyer-deck/services/buyer-deck';
import {
  isItemAnswer,
  onlyReasons,
  toItemResponse,
} from '@/features/buyer-deck/services/response-row';
import {
  NO_REASONS,
  PITCH_MAX,
  WORDS_MAX,
  type ItemResponse,
  type NoReason,
} from '@/features/buyer-deck/types';
import { toVisitRequest } from '@/features/buyer-presentation/services/visit-request-row';
import type { VisitRequest } from '@/features/buyer-presentation/types';
import { toBuyer } from '@/features/buyers/services/buyer-row';
import { getProfile } from '@/lib/auth/get-profile';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type PlainResult = { ok: true } | { ok: false; error: string };
export type AnswerResult =
  { ok: true; response: ItemResponse; requests: VisitRequest[] } | { ok: false; error: string };

const NOT_CONNECTED = 'Vous devez être connecté.';
const PRESENTED = 'La présentation est terminée : elle se relit sans se modifier.';
const ARCHIVED = 'Cet acquéreur est archivé.';
const FAILED = 'L’enregistrement a échoué. Réessayez.';

// Mission 122 — les gestes du dossier qui fait agir, écrits par le serveur seul, dans l'agence de
// l'appelant (la base ne laisse au navigateur que la lecture) : ses mots et les phrases
// « Pourquoi » relues avant de présenter, un bien retiré de la sélection, sa réponse à chaque bien
// pendant la présentation, les suggestions acceptées ou ignorées sur la fiche. Une présentation
// terminée ne se modifie plus (M111, M119) ; un acquéreur archivé ne répond plus.
async function activeProfile() {
  const profile = await getProfile();
  return profile && !profile.removed_at ? profile : null;
}

function revalidate(buyerId: string): void {
  revalidatePath(`/acquereurs/${buyerId}`);
  revalidatePath(`/presentation/${buyerId}`);
  revalidatePath('/visites');
}

type ItemContext = { buyerId: string; selectionId: string; presentedAt: string | null };

// Le bien retenu, dans l'agence de l'appelant, avec sa sélection et sa fiche (non archivée).
async function itemContext(
  itemId: unknown,
  agencyId: string,
): Promise<ItemContext | { error: string }> {
  if (!z.uuid().safeParse(itemId).success) return { error: FAILED };
  const { data } = await createServiceRoleClient()
    .from('buyer_selection_items')
    .select(
      'id, selection_id, buyer_selections!inner(buyer_id, presented_at, buyers!inner(archived_at))',
    )
    .eq('id', itemId as string)
    .eq('agency_id', agencyId)
    .maybeSingle();
  const selection = (data?.buyer_selections ?? null) as unknown as {
    buyer_id: string;
    presented_at: string | null;
    buyers: { archived_at: string | null };
  } | null;
  if (!data || !selection) return { error: 'Ce bien n’est plus dans la sélection.' };
  if (selection.buyers.archived_at != null) return { error: ARCHIVED };
  return {
    buyerId: selection.buyer_id,
    selectionId: data.selection_id,
    presentedAt: selection.presented_at,
  };
}

const cleanText = (value: unknown, max: number): string | null | undefined => {
  if (value == null) return null;
  if (typeof value !== 'string') return undefined;
  const text = value.replace(/\s+/g, ' ').trim();
  if (text === '') return null;
  return text.length > max ? undefined : text;
};

// « Vous m'avez dit » : la phrase du conseiller, ou null pour reprendre la phrase proposée.
export async function saveBuyerWords(selectionId: unknown, rawText: unknown): Promise<PlainResult> {
  const profile = await activeProfile();
  if (!profile) return { ok: false, error: NOT_CONNECTED };
  const text = cleanText(rawText, WORDS_MAX);
  if (text === undefined || !z.uuid().safeParse(selectionId).success) {
    return { ok: false, error: `Votre phrase tient en ${WORDS_MAX} caractères au plus.` };
  }
  const client = createServiceRoleClient();
  const { data: selection } = await client
    .from('buyer_selections')
    .select('id, buyer_id, presented_at, buyers!inner(archived_at)')
    .eq('id', selectionId as string)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (!selection) return { ok: false, error: FAILED };
  if ((selection.buyers as unknown as { archived_at: string | null }).archived_at != null) {
    return { ok: false, error: ARCHIVED };
  }
  if (selection.presented_at != null) return { ok: false, error: PRESENTED };
  const { error } = await client
    .from('buyer_selections')
    .update({ buyer_words: text })
    .eq('id', selection.id)
    .eq('agency_id', profile.agency_id);
  if (error) return { ok: false, error: FAILED };
  revalidate(selection.buyer_id);
  return { ok: true };
}

// « Pourquoi je vous le propose » : 140 caractères au plus, modifiable avant de présenter, figée
// ensuite ; null reprend la phrase proposée.
export async function saveItemPitch(itemId: unknown, rawText: unknown): Promise<PlainResult> {
  const profile = await activeProfile();
  if (!profile) return { ok: false, error: NOT_CONNECTED };
  const text = cleanText(rawText, PITCH_MAX);
  if (text === undefined) {
    return { ok: false, error: `La phrase tient en ${PITCH_MAX} caractères au plus.` };
  }
  const context = await itemContext(itemId, profile.agency_id);
  if ('error' in context) return { ok: false, error: context.error };
  if (context.presentedAt != null) return { ok: false, error: PRESENTED };
  const { error } = await createServiceRoleClient()
    .from('buyer_selection_items')
    .update({ pitch: text == null ? null : clampPitch(text) })
    .eq('id', itemId as string)
    .eq('agency_id', profile.agency_id);
  if (error) return { ok: false, error: FAILED };
  revalidate(context.buyerId);
  return { ok: true };
}

// « Retirer de la sélection », avant de présenter : le bien qu'un indispensable ne satisfait plus
// (décision du 25/10). Ses réponses et ses demandes partent avec lui (cascade).
export async function removeSelectionItem(itemId: unknown): Promise<PlainResult> {
  const profile = await activeProfile();
  if (!profile) return { ok: false, error: NOT_CONNECTED };
  const context = await itemContext(itemId, profile.agency_id);
  if ('error' in context) return { ok: false, error: context.error };
  if (context.presentedAt != null) return { ok: false, error: PRESENTED };
  const { error } = await createServiceRoleClient()
    .from('buyer_selection_items')
    .delete()
    .eq('id', itemId as string)
    .eq('agency_id', profile.agency_id);
  if (error) return { ok: false, error: FAILED };
  revalidate(context.buyerId);
  return { ok: true };
}

// Sa réponse à un bien, touchée par le conseiller pendant la présentation : un fait daté, une
// réponse par bien (la dernière touchée vaut, jusqu'à « Terminer »). « Je veux le visiter » crée
// la demande de visite de M119 ; une autre réponse annule celle de la présentation encore à faire.
export async function answerItem(
  itemId: unknown,
  rawAnswer: unknown,
  rawReasons: unknown,
): Promise<AnswerResult> {
  const profile = await activeProfile();
  if (!profile) return { ok: false, error: NOT_CONNECTED };
  if (!isItemAnswer(rawAnswer)) return { ok: false, error: FAILED };
  const reasons: NoReason[] = rawAnswer === 'no' ? onlyReasons(rawReasons) : [];
  const context = await itemContext(itemId, profile.agency_id);
  if ('error' in context) return { ok: false, error: context.error };
  if (context.presentedAt != null) return { ok: false, error: PRESENTED };
  const client = createServiceRoleClient();
  const now = new Date().toISOString();
  const { data: row, error } = await client
    .from('buyer_item_responses')
    .upsert(
      {
        agency_id: profile.agency_id,
        buyer_id: context.buyerId,
        selection_item_id: itemId as string,
        answer: rawAnswer,
        reasons,
        answered_during: 'presentation',
        answered_at: now,
      },
      { onConflict: 'selection_item_id,answered_during' },
    )
    .select('*')
    .single();
  if (error || !row) return { ok: false, error: FAILED };

  const { data: existing } = await client
    .from('buyer_visit_requests')
    .select('*')
    .eq('buyer_selection_item_id', itemId as string)
    .eq('agency_id', profile.agency_id)
    .is('cancelled_at', null)
    .is('visited_at', null);
  const pending = existing ?? [];
  if (rawAnswer === 'visit' && pending.length === 0) {
    const { error: insertError } = await client.from('buyer_visit_requests').insert({
      agency_id: profile.agency_id,
      buyer_id: context.buyerId,
      buyer_selection_item_id: itemId as string,
      requested_during: 'presentation',
    });
    if (insertError) return { ok: false, error: FAILED };
  }
  if (rawAnswer !== 'visit') {
    const ids = pending
      .filter((request) => request.requested_during === 'presentation')
      .map((request) => request.id);
    if (ids.length > 0) {
      const { error: cancelError } = await client
        .from('buyer_visit_requests')
        .update({ cancelled_at: now })
        .in('id', ids)
        .eq('agency_id', profile.agency_id);
      if (cancelError) return { ok: false, error: FAILED };
    }
  }
  const { data: requests } = await client
    .from('buyer_visit_requests')
    .select('*')
    .eq('buyer_selection_item_id', itemId as string)
    .eq('agency_id', profile.agency_id)
    .order('requested_at');
  revalidate(context.buyerId);
  return {
    ok: true,
    response: toItemResponse(row),
    requests: (requests ?? []).map(toVisitRequest),
  };
}

const isReasonKind = (value: unknown): value is NoReason =>
  typeof value === 'string' && (NO_REASONS as readonly string[]).includes(value);

async function buyerForSuggestion(buyerId: unknown, agencyId: string) {
  if (!z.uuid().safeParse(buyerId).success) return null;
  const { data } = await createServiceRoleClient()
    .from('buyers')
    .select('*')
    .eq('id', buyerId as string)
    .eq('agency_id', agencyId)
    .is('archived_at', null)
    .maybeSingle();
  return data ? toBuyer(data) : null;
}

// « Accepter » une suggestion : relue au serveur depuis les réponses en base (jamais ce que le
// navigateur envoie), puis appliquée à la fiche. Rien ne s'applique sans ce clic.
export async function applySuggestion(buyerId: unknown, kind: unknown): Promise<PlainResult> {
  const profile = await activeProfile();
  if (!profile) return { ok: false, error: NOT_CONNECTED };
  if (!isReasonKind(kind)) return { ok: false, error: FAILED };
  const buyer = await buyerForSuggestion(buyerId, profile.agency_id);
  if (!buyer) return { ok: false, error: FAILED };
  const client = createServiceRoleClient();
  const { forSuggestions } = await getBuyerAnswers(client, buyer.id, profile.agency_id);
  const suggestion = answerSuggestions(buyer, buyer.ignoredSuggestions, forSuggestions).find(
    (entry) => entry.kind === kind,
  );
  if (!suggestion?.patch) return { ok: false, error: 'Cette suggestion ne s’applique plus.' };
  const { patch } = suggestion;
  const { error } = await client
    .from('buyers')
    .update({
      ...(patch.surfaceMin !== undefined ? { surface_min: patch.surfaceMin } : {}),
      ...(patch.outdoor !== undefined ? { outdoor: patch.outdoor } : {}),
      ...(patch.parking !== undefined ? { parking: patch.parking } : {}),
      ...(patch.worksAccepted !== undefined ? { works_accepted: patch.worksAccepted } : {}),
      ...(patch.budgetMax !== undefined ? { budget_max: patch.budgetMax } : {}),
      ...(patch.budgetIdeal !== undefined ? { budget_ideal: patch.budgetIdeal } : {}),
      ...(patch.mustHave !== undefined ? { must_have: patch.mustHave } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', buyer.id)
    .eq('agency_id', profile.agency_id);
  if (error) return { ok: false, error: FAILED };
  revalidate(buyer.id);
  return { ok: true };
}

// « Ignorer » : retenu sur la fiche, par raison ; la suggestion ne revient plus.
export async function ignoreSuggestion(buyerId: unknown, kind: unknown): Promise<PlainResult> {
  const profile = await activeProfile();
  if (!profile) return { ok: false, error: NOT_CONNECTED };
  if (!isReasonKind(kind)) return { ok: false, error: FAILED };
  const buyer = await buyerForSuggestion(buyerId, profile.agency_id);
  if (!buyer) return { ok: false, error: FAILED };
  if (buyer.ignoredSuggestions.includes(kind)) return { ok: true };
  const { error } = await createServiceRoleClient()
    .from('buyers')
    .update({ ignored_suggestions: [...buyer.ignoredSuggestions, kind] })
    .eq('id', buyer.id)
    .eq('agency_id', profile.agency_id);
  if (error) return { ok: false, error: FAILED };
  revalidate(buyer.id);
  return { ok: true };
}
