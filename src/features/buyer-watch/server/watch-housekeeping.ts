import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import {
  orderAgenciesForWatch,
  STALE_RUN_MS,
} from '@/features/buyer-watch/services/watch-schedule';
import { settleSearchBudget } from '@/features/search-budget/services/reserve-budget';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import type { Database } from '@/lib/supabase/database.types';
import { readPages } from '@/lib/supabase/read-pages';

type Admin = SupabaseClient<Database>;

// Mission 136 — avant chaque nuit de veille (décisions de Jean-Guy, 06/11) :
//   • un passage resté « en cours » plus d'une heure (fonction coupée, serveur tombé) est marqué
//     « échoué » ; sa réservation est rendue (`settle_stream_estate_budget` à 0) et l'acquéreur
//     redevient éligible, un passage en échec ne bloquant pas la semaine ;
//   • les agences passent dans l'ordre de leur dernier passage, la moins récemment servie d'abord :
//     aucune ne prend toute la nuit.

export async function releaseStaleWatchRuns(admin: Admin, now: Date): Promise<number> {
  const before = new Date(now.getTime() - STALE_RUN_MS).toISOString();
  const stale = await readPages((from, to) =>
    admin
      .from('buyer_watch_runs')
      .select('id, buyer_id, agency_id')
      .eq('status', 'running')
      .lt('ran_at', before)
      .range(from, to),
  );
  if (stale.error) {
    await reportServerError('buyerWatch', new Error('passages en cours illisibles'));
    return 0;
  }
  let released = 0;
  for (const run of stale.data) {
    const { error } = await admin
      .from('buyer_watch_runs')
      .update({ status: 'failed' })
      .eq('id', run.id)
      .eq('status', 'running');
    if (error) {
      await reportServerError('buyerWatch', error);
      continue;
    }
    // La réservation de ce passage : la consommation de la veille de cet acquéreur, encore
    // réservée, d'avant la même heure (réservation et passage s'écrivent ensemble, M136).
    const { data: reservations, error: readError } = await admin
      .from('stream_estate_usage')
      .select('id')
      .eq('agency_id', run.agency_id)
      .eq('buyer_id', run.buyer_id)
      .eq('buyer_watch', true)
      .eq('reserved', true)
      .lt('created_at', before);
    if (readError) await reportServerError('buyerWatch', readError);
    for (const reservation of reservations ?? []) await settleSearchBudget(reservation.id, 0);
    released += 1;
  }
  return released;
}

// Les agences à servir cette nuit, la moins récemment servie d'abord (jamais servie : en tête).
export async function agenciesInWatchOrder(
  admin: Admin,
  agencyIds: string[],
): Promise<string[] | null> {
  if (agencyIds.length === 0) return [];
  const runs = await readPages((from, to) =>
    admin
      .from('buyer_watch_runs')
      .select('agency_id, ran_at')
      .in('agency_id', agencyIds)
      .order('ran_at', { ascending: false })
      .range(from, to),
  );
  if (runs.error) return null;
  const last = new Map<string, string>();
  for (const row of runs.data) if (!last.has(row.agency_id)) last.set(row.agency_id, row.ran_at);
  return orderAgenciesForWatch(agencyIds, last);
}
