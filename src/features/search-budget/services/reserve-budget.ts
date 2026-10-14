import 'server-only';

import { DEFAULT_MONTHLY_CAP_CENTS } from '@/features/search-budget/services/budget';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import { startOfParisMonth } from '@/lib/paris-time';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

// Mission 105 — le budget ne se dépasse jamais. Le coût maximal d'une recherche est RÉSERVÉ avant
// l'appel payant, en une seule opération en base qui verrouille le compteur de l'agence
// (`reserve_stream_estate_budget`) ; la part non utilisée est rendue après l'appel
// (`settle_stream_estate_budget`). Deux recherches simultanées ne franchissent pas le plafond.
// Remplace M100, « deux recherches au même instant peuvent dépasser de 0,60 €, accepté ».

export type BudgetReservation =
  | { ok: true; reservationId: string; adverts: number }
  // `reached` : plus rien à dépenser ce mois-ci ; `unavailable` : la base n'a pas répondu — un
  // budget illisible n'est pas un budget libre (M100).
  | { ok: false; reason: 'reached' | 'unavailable' };

export async function reserveSearchBudget(input: {
  agencyId: string;
  projectId: string;
  userId: string;
  wanted: number;
  now?: Date;
}): Promise<BudgetReservation> {
  try {
    const { data, error } = await createServiceRoleClient().rpc('reserve_stream_estate_budget', {
      p_agency_id: input.agencyId,
      p_project_id: input.projectId,
      p_user_id: input.userId,
      p_wanted: input.wanted,
      p_since: startOfParisMonth(input.now ?? new Date()).toISOString(),
      p_default_cap_cents: DEFAULT_MONTHLY_CAP_CENTS,
    });
    if (error) {
      await reportServerError('reserveSearchBudget', error);
      return { ok: false, reason: 'unavailable' };
    }
    const row = (data ?? [])[0] as { reservation_id?: string; adverts?: number } | undefined;
    if (!row?.reservation_id || !row.adverts || row.adverts <= 0) {
      return { ok: false, reason: 'reached' };
    }
    return { ok: true, reservationId: row.reservation_id, adverts: row.adverts };
  } catch (error) {
    await reportServerError('reserveSearchBudget', error);
    return { ok: false, reason: 'unavailable' };
  }
}

// Après l'appel : la réservation prend le nombre réellement facturé, ou disparaît si rien ne l'a
// été. Un échec est une vraie panne (de l'argent réservé, peut-être dépensé) : il entre au journal,
// et la réservation reste comptée — par prudence, jamais l'inverse.
export async function settleSearchBudget(reservationId: string, billed: number): Promise<void> {
  try {
    const { error } = await createServiceRoleClient().rpc('settle_stream_estate_budget', {
      p_reservation_id: reservationId,
      p_billed: Math.max(0, Math.round(billed)),
    });
    if (error) await reportServerError('settleSearchBudget', error);
  } catch (error) {
    await reportServerError('settleSearchBudget', error);
  }
}
