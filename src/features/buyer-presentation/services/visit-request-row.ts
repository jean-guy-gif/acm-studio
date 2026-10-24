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
  };
}

// Une demande vivante : ni annulée ni visitée.
export const isPendingVisit = (request: VisitRequest): boolean =>
  request.cancelledAt == null && request.visitedAt == null;

export function isVisitOutcome(value: unknown): value is VisitOutcome {
  return typeof value === 'string' && (VISIT_OUTCOMES as readonly string[]).includes(value);
}

export const FEEDBACK_MAX = 2000;
