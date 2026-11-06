import { AVAILABILITY_SLOTS } from '@/features/buyer-deck/types';
import {
  VISIT_NEXT_STEPS,
  VISIT_OPINIONS,
  VISIT_TAGS,
  type VisitNextStep,
  type VisitOpinion,
} from '@/features/buyer-messages/templates/types';
import {
  VISIT_OUTCOMES,
  VISIT_REQUEST_DURING,
  type VisitOutcome,
  type VisitRequest,
  type VisitRequestDuring,
  type VisitRequestRow,
} from '@/features/buyer-presentation/types';

const oneOf = <T extends string>(list: readonly T[], value: string, fallback: T): T =>
  (list as readonly string[]).includes(value) ? (value as T) : fallback;

export function toVisitRequest(row: VisitRequestRow): VisitRequest {
  return {
    id: row.id,
    buyerId: row.buyer_id,
    itemId: row.buyer_selection_item_id,
    requestedAt: row.requested_at,
    requestedDuring: oneOf<VisitRequestDuring>(
      VISIT_REQUEST_DURING,
      row.requested_during,
      'conseiller',
    ),
    cancelledAt: row.cancelled_at,
    visitedAt: row.visited_at,
    feedback: row.feedback,
    outcome: oneOf<VisitOutcome>(VISIT_OUTCOMES, row.outcome, 'to_plan'),
    availability: AVAILABILITY_SLOTS.filter((slot) => (row.availability ?? []).includes(slot)),
    // Mission 139 — relu par liste d'autorisation : une valeur hors liste n'est pas lue (M51).
    report: (VISIT_OPINIONS as readonly string[]).includes(row.opinion ?? '')
      ? {
          opinion: row.opinion as VisitOpinion,
          liked: VISIT_TAGS.filter((tag) => (row.liked ?? []).includes(tag)),
          disliked: VISIT_TAGS.filter((tag) => (row.disliked ?? []).includes(tag)),
          nextStep: (VISIT_NEXT_STEPS as readonly string[]).includes(row.next_step ?? '')
            ? (row.next_step as VisitNextStep)
            : null,
        }
      : null,
  };
}

// Une demande vivante : ni annulée ni visitée.
export const isPendingVisit = (request: VisitRequest): boolean =>
  request.cancelledAt == null && request.visitedAt == null;

export function isVisitOutcome(value: unknown): value is VisitOutcome {
  return typeof value === 'string' && (VISIT_OUTCOMES as readonly string[]).includes(value);
}

export const FEEDBACK_MAX = 2000;
