import 'server-only';

import { parisDay } from '@/features/meeting-conclusion/services/follow-up-contacts';
import { offerAnswerTasks } from '@/features/purchase-offer/services/offer-answer';
import { offerExpiryTasks } from '@/features/purchase-offer/services/offer-tasks';
import type { SuiviTask } from '@/features/meeting-conclusion/services/suivi-tasks';
import { createClient } from '@/lib/supabase/server';

// Mission 137 (partie B) — les offres d'achat signées de l'agence, encore valables et sans réponse
// du vendeur : leur échéance se rappelle la veille dans « À faire aujourd'hui ». Mission 138 — et
// les offres qui ont reçu leur réponse, tant que le conseiller n'a pas coché « Fait ». Une lecture en
// échec ne fabrique aucune tâche et le dit (M98).
export async function getOfferTasks(
  agencyId: string,
  now: Date,
): Promise<{ tasks: SuiviTask[]; failed: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('buyer_documents')
    .select(
      'id, buyer_id, valid_until, fields, buyers!inner(name, archived_at), buyer_document_acceptances(decision, decided_at), buyer_offer_follow_ups(id)',
    )
    .eq('agency_id', agencyId)
    .eq('kind', 'purchase_offer')
    .is('buyers.archived_at', null);
  if (error) return { tasks: [], failed: true };
  const rows = (data ?? []).map((row) => {
    const answers = row.buyer_document_acceptances as unknown as
      { decision: string; decided_at: string }[] | { decision: string; decided_at: string } | null;
    const answer = Array.isArray(answers) ? (answers[0] ?? null) : answers;
    const follow = row.buyer_offer_follow_ups as unknown as unknown[] | object | null;
    const visitId = (row.fields as { visitId?: unknown } | null)?.visitId;
    return {
      offerId: row.id,
      buyerId: row.buyer_id!,
      buyerName: (row.buyers as unknown as { name: string } | null)?.name ?? null,
      validUntil: row.valid_until ?? '',
      answer,
      done: Array.isArray(follow) ? follow.length > 0 : follow != null,
      visitId: typeof visitId === 'string' ? visitId : null,
    };
  });
  const today = parisDay(now);
  return {
    tasks: [
      ...offerAnswerTasks(
        rows.flatMap((row) =>
          row.answer && (row.answer.decision === 'accepted' || row.answer.decision === 'refused')
            ? [
                {
                  offerId: row.offerId,
                  buyerId: row.buyerId,
                  buyerName: row.buyerName,
                  visitId: row.visitId,
                  decision: row.answer.decision,
                  decidedAt: row.answer.decided_at,
                  done: row.done,
                },
              ]
            : [],
        ),
      ),
      ...offerExpiryTasks(
        rows
          .filter((row) => row.validUntil >= today)
          .map((row) => ({
            offerId: row.offerId,
            buyerId: row.buyerId,
            buyerName: row.buyerName,
            validUntil: row.validUntil,
            answered: row.answer != null,
          })),
        now,
      ),
    ],
    failed: false,
  };
}
