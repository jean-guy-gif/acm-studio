import {
  ANSWERED_DURING,
  ITEM_ANSWERS,
  NO_REASONS,
  type AnsweredDuring,
  type ItemAnswer,
  type ItemResponse,
  type NoReason,
} from '@/features/buyer-deck/types';
import type { Database } from '@/lib/supabase/database.types';

export type ItemResponseRow = Database['public']['Tables']['buyer_item_responses']['Row'];

export const isItemAnswer = (value: unknown): value is ItemAnswer =>
  typeof value === 'string' && (ITEM_ANSWERS as readonly string[]).includes(value);

// Les raisons relues par liste d'autorisation, sans doublon ; une raison hors liste n'existe pas.
export function onlyReasons(values: unknown): NoReason[] {
  if (!Array.isArray(values)) return [];
  return NO_REASONS.filter((reason) => values.includes(reason));
}

// Mission 122 — une réponse relue de la base, par liste d'autorisation.
export function toItemResponse(row: ItemResponseRow): ItemResponse {
  return {
    id: row.id,
    itemId: row.selection_item_id,
    answer: isItemAnswer(row.answer) ? row.answer : 'maybe',
    reasons: onlyReasons(row.reasons),
    answeredDuring: (ANSWERED_DURING as readonly string[]).includes(row.answered_during)
      ? (row.answered_during as AnsweredDuring)
      : 'presentation',
    answeredAt: row.answered_at,
  };
}
