import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { AnswerForSuggestion } from '@/features/buyer-deck/services/answer-suggestions';
import { toItemResponse } from '@/features/buyer-deck/services/response-row';
import type { ItemResponse } from '@/features/buyer-deck/types';
import { presentedItems } from '@/features/buyer-presentation/queries/load-presentation';
import { toSelectionItem } from '@/features/ideal-properties/services/ideal-selection';
import type { Database } from '@/lib/supabase/database.types';

export type BuyerAnswerLine = ItemResponse & { label: string };

// Mission 122 — « Ce qu'il a répondu », toutes sélections confondues, de la plus récente à la plus
// ancienne, et ce qu'il faut pour les suggestions : chaque bien désigné par sa source et sa
// référence (le même bien dans deux sélections compte une fois), avec la surface et le prix tels
// que montrés (le prix d'un vendeur à relancer n'est jamais montré, décision du 24/10). Cadré sur
// l'agence de la fiche, quel que soit le client.
export async function getBuyerAnswers(
  supabase: SupabaseClient<Database>,
  buyerId: string,
  agencyId: string,
): Promise<{ lines: BuyerAnswerLine[]; forSuggestions: AnswerForSuggestion[] }> {
  const { data: responseRows } = await supabase
    .from('buyer_item_responses')
    .select('*')
    .eq('buyer_id', buyerId)
    .eq('agency_id', agencyId)
    .order('answered_at', { ascending: false });
  const responses = (responseRows ?? []).map(toItemResponse);
  if (responses.length === 0) return { lines: [], forSuggestions: [] };
  const { data: itemRows } = await supabase
    .from('buyer_selection_items')
    .select('*')
    .eq('agency_id', agencyId)
    .in('id', [...new Set(responses.map((response) => response.itemId))]);
  const items = (itemRows ?? []).map(toSelectionItem);
  const shown = new Map(
    (await presentedItems(supabase, items, agencyId)).map((item) => [item.itemId, item]),
  );
  const byId = new Map(items.map((item) => [item.id, item]));
  const lines: BuyerAnswerLine[] = [];
  const forSuggestions: AnswerForSuggestion[] = [];
  for (const response of responses) {
    const item = byId.get(response.itemId);
    if (!item) continue;
    lines.push({ ...response, label: item.label });
    forSuggestions.push({
      bienKey: `${item.source}:${item.reference}`,
      answer: response.answer,
      reasons: response.reasons,
      answeredAt: response.answeredAt,
      surfaceArea: shown.get(item.id)?.surfaceArea ?? null,
      price: shown.get(item.id)?.price ?? null,
    });
  }
  return { lines, forSuggestions };
}
