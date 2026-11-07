'use server';

import { FRENCH_TEXTS } from '@/lib/client-texts/fr';
import { z } from 'zod';

import { onlyReasons } from '@/features/buyer-deck/services/response-row';
import { AVAILABILITY_SLOTS, ITEM_ANSWERS, type ItemAnswer } from '@/features/buyer-deck/types';
import {
  DOSSIER_TOKEN_PATTERN,
  hashDossierToken,
} from '@/features/buyer-dossier/services/dossier-token';
import {
  DOSSIER_ALREADY_ANSWERED,
  DOSSIER_NO_ANSWER,
  DOSSIER_PRESENTED,
} from '@/features/buyer-dossier/types';
import type { LinkClosed } from '@/features/buyer-dossier/services/link-screen';
import type { Json } from '@/lib/supabase/database.types';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

// `closed` : la réponse ne se donne plus sur ce lien (déjà donnée, ou présentation terminée) ; la
// page se recharge et montre le merci ou le récapitulatif, jamais de nouveau le formulaire.
export type SubmitDossierResult =
  { ok: true; answered: number } | { ok: false; error: string; closed?: LinkClosed };

// Mission 140 — une seule source, les textes du client ; le lien les redit dans la langue de
// l'acquéreur.
const FAILURE = FRENCH_TEXTS.buyer.screens.sendFailed;
const EXPIRED = FRENCH_TEXTS.buyer.screens.expired;

const answerSchema = z.object({
  itemId: z.uuid(),
  answer: z.enum(ITEM_ANSWERS),
  reasons: z.array(z.string()).max(8).optional(),
});

// Mission 122 (partie B) — « Envoyer ma réponse », sur le lien du dossier, SANS compte ni e-mail :
// le jeton est relu (forme, condensat, expiration), puis ses réponses et ses créneaux s'écrivent en
// UNE transaction (`submit_buyer_dossier_answers`) sur la sélection du lien, et elle seule ; une
// seule réponse par sélection, la base le garantit ; une présentation terminée n'en reçoit plus
// (décision de Jean-Guy, 25/10). Rien d'autre n'est saisi.
export async function submitDossierAnswers(
  token: unknown,
  rawAnswers: unknown,
  rawAvailability: unknown,
): Promise<SubmitDossierResult> {
  if (typeof token !== 'string' || !DOSSIER_TOKEN_PATTERN.test(token)) {
    return { ok: false, error: FAILURE };
  }
  const parsed = z.array(answerSchema).max(5).safeParse(rawAnswers);
  if (!parsed.success) return { ok: false, error: FAILURE };
  // Une réponse par bien : la dernière donnée vaut ; des raisons à « Pas pour moi » seulement.
  const byItem = new Map<string, { itemId: string; answer: ItemAnswer; reasons: string[] }>();
  for (const entry of parsed.data) {
    byItem.set(entry.itemId, {
      itemId: entry.itemId,
      answer: entry.answer,
      reasons: entry.answer === 'no' ? onlyReasons(entry.reasons ?? []) : [],
    });
  }
  const answers = [...byItem.values()];
  if (answers.length === 0) return { ok: false, error: DOSSIER_NO_ANSWER };
  const availability = AVAILABILITY_SLOTS.filter(
    (slot) => Array.isArray(rawAvailability) && rawAvailability.includes(slot),
  );

  const admin = createServiceRoleClient();
  const { data: link } = await admin
    .from('buyer_dossier_links')
    .select('agency_id, selection_id')
    .eq('token_hash', hashDossierToken(token))
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (!link) return { ok: false, error: EXPIRED };
  const { data, error } = await admin.rpc('submit_buyer_dossier_answers', {
    p_agency_id: link.agency_id,
    p_selection_id: link.selection_id,
    p_answers: answers as unknown as Json,
    p_availability: availability,
  });
  if (error) {
    const message = error.message ?? '';
    if (message.includes('already_answered')) {
      return { ok: false, error: DOSSIER_ALREADY_ANSWERED, closed: 'answered' };
    }
    if (message.includes('presentation_finished')) {
      return { ok: false, error: DOSSIER_PRESENTED, closed: 'presented' };
    }
    if (message.includes('buyer_archived') || message.includes('buyer_selection_not_found')) {
      return { ok: false, error: EXPIRED };
    }
    return { ok: false, error: FAILURE };
  }
  return { ok: true, answered: typeof data === 'number' ? data : answers.length };
}
