import 'server-only';

import { offerExpiryTasks } from '@/features/purchase-offer/services/offer-tasks';
import type { SuiviTask } from '@/features/meeting-conclusion/services/suivi-tasks';
import { createClient } from '@/lib/supabase/server';

// Mission 137 (partie B) — les offres d'achat signées de l'agence, encore valables et sans réponse
// du vendeur : leur échéance se rappelle la veille dans « À faire aujourd'hui ». Une lecture en échec
// ne fabrique aucune tâche et le dit (M98).
export async function getOfferTasks(
  agencyId: string,
  now: Date,
): Promise<{ tasks: SuiviTask[]; failed: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('buyer_documents')
    .select('id, buyer_id, valid_until, buyers(name), buyer_document_acceptances(id)')
    .eq('agency_id', agencyId)
    .eq('kind', 'purchase_offer')
    .not('buyer_id', 'is', null);
  if (error) return { tasks: [], failed: true };
  return {
    tasks: offerExpiryTasks(
      (data ?? []).map((row) => {
        const answers = row.buyer_document_acceptances as unknown as unknown[] | object | null;
        return {
          offerId: row.id,
          buyerId: row.buyer_id!,
          buyerName: (row.buyers as { name: string } | null)?.name ?? null,
          validUntil: row.valid_until ?? '',
          answered: Array.isArray(answers) ? answers.length > 0 : answers != null,
        };
      }),
      now,
    ),
    failed: false,
  };
}
