'use server';

import { meetingSlots } from '@/features/buyer-deck/services/meeting-slots';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { getBuyerAnswers } from '@/features/buyer-deck/queries/get-buyer-answers';
import {
  adjustmentSummary,
  answerSuggestions,
} from '@/features/buyer-deck/services/answer-suggestions';
import { clampPitch } from '@/features/buyer-deck/services/buyer-deck';
import {
  isItemAnswer,
  onlyReasons,
  toItemResponse,
  type ItemResponseRow,
} from '@/features/buyer-deck/services/response-row';
import {
  AVAILABILITY_SLOTS,
  NO_REASONS,
  PITCH_MAX,
  WORDS_MAX,
  type ItemResponse,
  type NoReason,
} from '@/features/buyer-deck/types';
import { computeDeck } from '@/features/buyer-deck/queries/load-deck';
import { toBuyer } from '@/features/buyers/services/buyer-row';
import { toSelection } from '@/features/ideal-properties/services/ideal-selection';
import type { Json } from '@/lib/supabase/database.types';
import { recordAppError } from '@/lib/app-errors/record';
import { getProfile } from '@/lib/auth/get-profile';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type PlainResult = { ok: true } | { ok: false; error: string };
export type AnswerResult = { ok: true; response: ItemResponse } | { ok: false; error: string };

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
    // Un bien retiré (retrait doux) n'est plus dans la sélection.
    .is('removed_at', null)
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

// « Retirer de la sélection », avant de présenter : un retrait DOUX (décision de Jean-Guy, 25/10)
// — le bien quitte la sélection, ses réponses et ses demandes de visite restent. Le serveur ne
// retire qu'un bien qui porte ✗ sur un indispensable, relu sur la fiche et les faits du moment.
export async function removeSelectionItem(itemId: unknown): Promise<PlainResult> {
  const profile = await activeProfile();
  if (!profile) return { ok: false, error: NOT_CONNECTED };
  const context = await itemContext(itemId, profile.agency_id);
  if ('error' in context) return { ok: false, error: context.error };
  if (context.presentedAt != null) return { ok: false, error: PRESENTED };
  const client = createServiceRoleClient();
  const loaded = await selectionForDeck(
    client,
    context.buyerId,
    context.selectionId,
    profile.agency_id,
  );
  if (!loaded) return { ok: false, error: FAILED };
  const deck = await computeDeck(client, loaded.buyer, loaded.selection, profile.agency_id);
  const target = deck.items.find((item) => item.item.itemId === itemId);
  if (!target?.blocked) {
    return {
      ok: false,
      error: 'Seul un bien qui ne satisfait plus un critère indispensable se retire ici.',
    };
  }
  const { error } = await client
    .from('buyer_selection_items')
    .update({ removed_at: new Date().toISOString() })
    .eq('id', itemId as string)
    .eq('agency_id', profile.agency_id)
    .is('removed_at', null);
  if (error) return { ok: false, error: FAILED };
  revalidate(context.buyerId);
  return { ok: true };
}

// La fiche et la sélection d'un acquéreur, relues par le serveur dans l'agence de l'appelant.
async function selectionForDeck(
  client: ReturnType<typeof createServiceRoleClient>,
  buyerId: string,
  selectionId: string,
  agencyId: string,
) {
  const [{ data: buyerRow }, { data: selectionRow }, { data: itemRows }] = await Promise.all([
    client
      .from('buyers')
      .select('*')
      .eq('id', buyerId)
      .eq('agency_id', agencyId)
      .is('archived_at', null)
      .maybeSingle(),
    client
      .from('buyer_selections')
      .select('*')
      .eq('id', selectionId)
      .eq('buyer_id', buyerId)
      .eq('agency_id', agencyId)
      .maybeSingle(),
    client
      .from('buyer_selection_items')
      .select('*')
      .eq('selection_id', selectionId)
      .eq('agency_id', agencyId),
  ]);
  if (!buyerRow || !selectionRow) return null;
  return { buyer: toBuyer(buyerRow), selection: toSelection(selectionRow, itemRows ?? []) };
}

const ANSWER_ERRORS: Record<string, string> = {
  presentation_finished: PRESENTED,
  buyer_archived: ARCHIVED,
  item_removed: 'Ce bien n’est plus dans la sélection.',
  buyer_item_not_found: 'Ce bien n’est plus dans la sélection.',
};

// Sa réponse à un bien, touchée par le conseiller pendant la présentation : un fait daté, une
// réponse par bien (la dernière touchée vaut, jusqu'à « Terminer »). La réponse et la demande de
// visite s'écrivent en UNE transaction (`answer_buyer_item`) : « Je veux le visiter » crée la
// demande de M119, ou garde une demande déjà vivante (« depuis le dossier » comprise) ; une autre
// réponse annule celle faite pendant la présentation.
export async function answerItem(
  itemId: unknown,
  rawAnswer: unknown,
  rawReasons: unknown,
): Promise<AnswerResult> {
  const profile = await activeProfile();
  if (!profile) return { ok: false, error: NOT_CONNECTED };
  if (!isItemAnswer(rawAnswer) || !z.uuid().safeParse(itemId).success) {
    return { ok: false, error: FAILED };
  }
  const reasons: NoReason[] = rawAnswer === 'no' ? onlyReasons(rawReasons) : [];
  const { data, error } = await createServiceRoleClient().rpc('answer_buyer_item', {
    p_agency_id: profile.agency_id,
    p_item_id: itemId as string,
    p_answer: rawAnswer,
    p_reasons: reasons,
  });
  if (error || !data) {
    const known = Object.keys(ANSWER_ERRORS).find((code) => error?.message?.includes(code));
    return { ok: false, error: known ? ANSWER_ERRORS[known]! : FAILED };
  }
  const row = data as ItemResponseRow;
  revalidate(row.buyer_id);
  return { ok: true, response: toItemResponse(row) };
}

// « Terminer » : le serveur recalcule le déroulé tel qu'affiché et le fige avec la date, après
// avoir porté ses disponibilités sur les demandes des biens qu'il veut visiter — en UNE
// transaction (`finish_buyer_presentation`) ; la relecture lit ce qui est stocké (décision de
// Jean-Guy, 25/10). Une présentation déjà terminée ne se réécrit pas.
export async function finishPresentation(
  buyerId: unknown,
  selectionId: unknown,
  rawAvailability: unknown = [],
): Promise<PlainResult> {
  const profile = await activeProfile();
  if (!profile) return { ok: false, error: NOT_CONNECTED };
  if (!z.uuid().safeParse(buyerId).success || !z.uuid().safeParse(selectionId).success) {
    return { ok: false, error: FAILED };
  }
  const client = createServiceRoleClient();
  const loaded = await selectionForDeck(
    client,
    buyerId as string,
    selectionId as string,
    profile.agency_id,
  );
  if (!loaded) return { ok: false, error: 'Aucune sélection à présenter.' };
  if (loaded.selection.presentedAt != null) {
    revalidate(loaded.buyer.id);
    return { ok: true };
  }
  const deck = await computeDeck(client, loaded.buyer, loaded.selection, profile.agency_id);
  const availability = AVAILABILITY_SLOTS.filter(
    (slot) => Array.isArray(rawAvailability) && rawAvailability.includes(slot),
  );
  // Ses créneaux du rendez-vous ne se figent que s'il veut visiter au moins un bien encore dans la
  // sélection, relu en base (« s'il veut visiter au moins un bien… ses créneaux », M122) : jamais
  // ceux que le navigateur renverrait après un passage de « visiter » à « Peut-être ».
  const liveIds = loaded.selection.items.map((item) => item.id);
  const { data: visitRows } =
    liveIds.length > 0
      ? await client
          .from('buyer_item_responses')
          .select('selection_item_id')
          .eq('agency_id', profile.agency_id)
          .eq('answered_during', 'presentation')
          .eq('answer', 'visit')
          .in('selection_item_id', liveIds)
      : { data: [] };
  const meetingAvailability = meetingSlots(availability, (visitRows ?? []).length > 0);
  const { error } = await client.rpc('finish_buyer_presentation', {
    p_agency_id: profile.agency_id,
    p_selection_id: loaded.selection.id,
    // Le déroulé figé garde aussi ses créneaux du rendez-vous, et eux seuls (décision du 25/10).
    p_deck: { ...deck, meetingAvailability } as unknown as Json,
    p_availability: availability,
  });
  if (error) return { ok: false, error: 'La fin de la présentation n’a pas pu être enregistrée.' };
  revalidate(loaded.buyer.id);
  return { ok: true };
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
      ...(patch.cities !== undefined ? { cities: patch.cities } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', buyer.id)
    .eq('agency_id', profile.agency_id);
  if (error) return { ok: false, error: FAILED };
  // Mission 135 — l'ajustement est daté pour « Ce qui s'est passé » ; un échec n'annule pas la
  // fiche modifiée, il entre au journal (M100).
  const { error: eventError } = await client.from('buyer_events').insert({
    agency_id: profile.agency_id,
    buyer_id: buyer.id,
    kind: 'search_adjusted',
    reason: kind,
    summary: adjustmentSummary(buyer, patch),
    created_by: profile.id,
  });
  if (eventError) {
    await recordAppError({
      source: 'server',
      page: '/acquereurs/[buyerId]',
      error: `Ajustement de recherche non daté (${kind}) : ${eventError.message}`,
      scope: '[applySuggestion]',
      agencyId: profile.agency_id,
      userId: profile.id,
    });
  }
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
