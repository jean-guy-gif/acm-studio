import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { getBuyersProgress } from '@/features/buyers/queries/get-buyers-progress';
import { buyerReadiness, lastActivityAt } from '@/features/buyers/services/buyer-readiness';
import { NO_PROGRESS } from '@/features/buyers/services/buyer-progress';
import { toBuyer } from '@/features/buyers/services/buyer-row';
import type { Buyer } from '@/features/buyers/types';
import { readBuyerKnownKeys } from '@/features/buyer-watch/queries/known-keys';
import { findsForBuyer } from '@/features/buyer-watch/services/watch-criteria';
import { filterWatchFinds } from '@/features/buyer-watch/services/watch-finds';
import {
  dueWatchBuyers,
  WATCH_ADVERTS,
  watchSeenSince,
} from '@/features/buyer-watch/services/watch-schedule';
import { streamEstateApiKey } from '@/features/competitor-search/services/stream-estate-config';
import { liveStreamEstatePage } from '@/features/competitor-search/services/stream-estate-fetch';
import { idealSearchCriteria } from '@/features/ideal-properties/services/ideal-criteria';
import {
  resolveIdealPlans,
  runIdealMarketSearch,
} from '@/features/ideal-properties/services/ideal-market-search';
import { DEFAULT_MONTHLY_CAP_CENTS } from '@/features/search-budget/services/budget';
import { settleSearchBudget } from '@/features/search-budget/services/reserve-budget';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import { startOfParisMonth } from '@/lib/paris-time';
import type { Database, Json } from '@/lib/supabase/database.types';
import { readPages } from '@/lib/supabase/read-pages';

type Admin = SupabaseClient<Database>;

// Mission 136 — la veille de la nuit, pour une agence (clé de service, aucune session) :
//   1. les acquéreurs « Prêts à visiter » dont le dernier passage date de 7 jours ou plus, les plus
//      récemment actifs d'abord ;
//   2. pour chacun, la recherche des biens idéaux (M118), les plus récemment arrivés d'abord,
//      20 annonces au plus : `start_buyer_watch` réserve le budget ET ouvre le passage d'un seul
//      geste — rien de réservable (plafond de la veille, ou de l'agence), aucun appel ;
//   3. le budget réglé après l'appel (M105), les biens vus depuis le passage précédent gardés,
//      absents de ce que l'acquéreur et l'agence connaissent ; le passage terminé, ou en échec.
// La première réservation refusée arrête l'agence pour la nuit : aucun appel ne part plus.
// `deadline` : passé cet instant, plus aucun acquéreur n'est lancé (la fonction a une durée bornée).

export type AgencyWatchReport = {
  agencyId: string;
  watched: number;
  found: number;
  billed: number;
  stopped: 'done' | 'budget' | 'deadline';
  failed: number;
};

export async function runAgencyWatch(
  admin: Admin,
  agencyId: string,
  now: Date,
  deadline: number,
  // Injecté par les tests ; la vraie lecture d'une page de l'API sinon.
  fetchPageFor: (onBilled: (count: number) => void) => ReturnType<typeof liveStreamEstatePage> = (
    onBilled,
  ) => liveStreamEstatePage(streamEstateApiKey() ?? '', onBilled, 'buyerWatch'),
): Promise<AgencyWatchReport> {
  const report: AgencyWatchReport = {
    agencyId,
    watched: 0,
    found: 0,
    billed: 0,
    stopped: 'done',
    failed: 0,
  };
  const { data: buyerRows, error } = await admin
    .from('buyers')
    .select('*')
    .eq('agency_id', agencyId)
    .is('archived_at', null)
    .in('status', ['searching', 'visiting']);
  if (error) {
    await reportServerError('buyerWatch', error);
    report.failed += 1;
    return report;
  }
  const buyers = (buyerRows ?? []).map(toBuyer);
  if (buyers.length === 0) return report;
  const progress = await getBuyersProgress(
    admin,
    agencyId,
    buyers.map((buyer) => buyer.id),
  );
  // Une lecture en échec ne fabrique aucun acquéreur prêt (M98) : rien ne part.
  if ([...progress.values()].some((facts) => facts.unread)) {
    report.failed += 1;
    return report;
  }
  const runs = await readPages((from, to) =>
    admin
      .from('buyer_watch_runs')
      .select('buyer_id, ran_at, status')
      .eq('agency_id', agencyId)
      .in('status', ['running', 'done'])
      .order('ran_at', { ascending: false })
      .range(from, to),
  );
  if (runs.error) {
    report.failed += 1;
    return report;
  }
  const lastRun = new Map<string, { ranAt: string; done: boolean }>();
  for (const row of runs.data) {
    if (!lastRun.has(row.buyer_id)) {
      lastRun.set(row.buyer_id, { ranAt: row.ran_at, done: row.status === 'done' });
    }
  }
  const lastDone = new Map<string, string>();
  for (const row of runs.data) {
    if (row.status === 'done' && !lastDone.has(row.buyer_id))
      lastDone.set(row.buyer_id, row.ran_at);
  }
  const byId = new Map(buyers.map((buyer) => [buyer.id, buyer]));
  const due = dueWatchBuyers(
    buyers.map((buyer) => {
      const facts = progress.get(buyer.id) ?? NO_PROGRESS;
      return {
        buyerId: buyer.id,
        ready: buyerReadiness(buyer, facts, now).state === 'ready',
        lastActivityAt: lastActivityAt(buyer, facts),
        lastRunAt: lastRun.get(buyer.id)?.ranAt ?? null,
      };
    }),
    now,
  );
  if (due.length === 0) return report;
  const known = await readBuyerKnownKeys(
    admin,
    agencyId,
    due.map((candidate) => candidate.buyerId),
  );
  if (!known.ok) {
    report.failed += 1;
    return report;
  }
  for (const candidate of due) {
    if (Date.now() > deadline) {
      report.stopped = 'deadline';
      break;
    }
    const buyer = byId.get(candidate.buyerId)!;
    const outcome = await watchOneBuyer(
      admin,
      agencyId,
      buyer,
      watchSeenSince(lastDone.get(buyer.id) ?? null, now),
      known.keys(buyer.id),
      now,
      deadline,
      fetchPageFor,
    );
    if (outcome === 'budget' || outcome === 'deadline') {
      report.stopped = outcome;
      break;
    }
    if (outcome === 'skipped') continue;
    report.watched += 1;
    report.billed += outcome.billed;
    if (outcome.ok) report.found += outcome.found;
    else report.failed += 1;
  }
  return report;
}

type OneOutcome =
  'budget' | 'skipped' | 'deadline' | { ok: boolean; billed: number; found: number };

async function watchOneBuyer(
  admin: Admin,
  agencyId: string,
  buyer: Buyer,
  seenSince: string,
  knownKeys: Set<string>,
  now: Date,
  deadline: number,
  fetchPageFor: (onBilled: (count: number) => void) => ReturnType<typeof liveStreamEstatePage>,
): Promise<OneOutcome> {
  // Une fiche qui ne se cherche pas (deux types, sans commune, commune introuvable) : rien de
  // réservé, rien d'appelé ; elle sera reprise quand la fiche aura changé.
  const deduced = idealSearchCriteria(buyer);
  if (!deduced.ok) return 'skipped';
  const resolved = await resolveIdealPlans(deduced, false, now);
  if (!resolved.ok) return 'skipped';
  // Les communes résolues peuvent avoir pris du temps : rien ne se réserve si la recherche risque
  // d'être coupée par la durée de la fonction (une réservation jamais réglée resterait comptée).
  if (Date.now() > deadline) return 'deadline';

  const { data, error } = await admin.rpc('start_buyer_watch', {
    p_agency_id: agencyId,
    p_buyer_id: buyer.id,
    p_wanted: WATCH_ADVERTS,
    p_since: startOfParisMonth(now).toISOString(),
    p_default_cap_cents: DEFAULT_MONTHLY_CAP_CENTS,
    p_seen_since: seenSince,
  });
  if (error) {
    await reportServerError('buyerWatch', error);
    return 'budget';
  }
  const row = (data ?? [])[0] as
    { run_id?: string; reservation_id?: string; adverts?: number } | undefined;
  // Rien d'ouvert : un passage déjà fait cette semaine (double déclenchement), ou plus de budget.
  if (!row?.run_id || !row.reservation_id || !row.adverts) {
    const { data: recent } = await admin
      .from('buyer_watch_runs')
      .select('id')
      .eq('buyer_id', buyer.id)
      .in('status', ['running', 'done'])
      .gt('ran_at', new Date(now.getTime() - 6 * 86_400_000).toISOString())
      .limit(1)
      .maybeSingle();
    return recent ? 'skipped' : 'budget';
  }

  let billed = 0;
  let search: Awaited<ReturnType<typeof runIdealMarketSearch>> | null = null;
  try {
    search = await runIdealMarketSearch(deduced, resolved.resolved, {
      fetchPage: fetchPageFor((count) => {
        billed += count;
      }),
      now,
      cap: row.adverts,
      newestFirst: true,
    });
  } catch (cause) {
    await reportServerError('buyerWatch', cause);
  } finally {
    await settleSearchBudget(row.reservation_id, billed);
  }

  if (!search?.ok) {
    const { error: failedError } = await admin
      .from('buyer_watch_runs')
      .update({ status: 'failed', adverts: billed })
      .eq('id', row.run_id);
    if (failedError) await reportServerError('buyerWatch', failedError);
    return { ok: false, billed, found: 0 };
  }
  // Les nouveaux biens qui ne contredisent aucun indispensable de la fiche (M118).
  const finds = findsForBuyer(
    buyer,
    filterWatchFinds(search.candidates, { seenSince, knownKeys }).finds,
  );
  const { error: updateError } = await admin
    .from('buyer_watch_runs')
    .update({
      status: 'done',
      adverts: billed,
      found_count: finds.length,
      finds: finds as unknown as Json,
    })
    .eq('id', row.run_id);
  if (updateError) await reportServerError('buyerWatch', updateError);
  return { ok: updateError == null, billed, found: finds.length };
}
