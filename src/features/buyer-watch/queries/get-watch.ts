import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { readBuyerKnownKeys } from '@/features/buyer-watch/queries/known-keys';
import { watchTasks, type WatchRunFinds } from '@/features/buyer-watch/services/watch-tasks';
import {
  readWatchFinds,
  watchKey,
  type WatchFind,
} from '@/features/buyer-watch/services/watch-finds';
import {
  effectiveWatchCapCents,
  WATCH_INTERVAL_DAYS,
  watchBudgetState,
  type WatchBudgetState,
} from '@/features/buyer-watch/services/watch-schedule';
import type { SuiviTask } from '@/features/meeting-conclusion/services/suivi-tasks';
import { DEFAULT_MONTHLY_CAP_CENTS } from '@/features/search-budget/services/budget';
import { startOfParisMonth } from '@/lib/paris-time';
import type { Database } from '@/lib/supabase/database.types';
import { readPages } from '@/lib/supabase/read-pages';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

type Admin = SupabaseClient<Database>;

// Mission 136 — ce que l'écran lit de la veille. Toutes les lectures sont cadrées sur l'agence de
// l'appelant, passée par la page après son garde ; la clé de service lit les biens connus de toute
// l'agence (concurrents, biens démarchés) comme la veille elle-même.

const recentSince = (now: Date): string =>
  new Date(now.getTime() - WATCH_INTERVAL_DAYS * 86_400_000).toISOString();

// Le dernier passage d'un acquéreur (en cours ou terminé), pour « Veille : dernière recherche le … ».
export async function getBuyerLastWatch(
  agencyId: string,
  buyerId: string,
): Promise<{ ok: true; lastRunAt: string | null } | { ok: false }> {
  const { data, error } = await createServiceRoleClient()
    .from('buyer_watch_runs')
    .select('ran_at')
    .eq('agency_id', agencyId)
    .eq('buyer_id', buyerId)
    .in('status', ['running', 'done'])
    .order('ran_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return { ok: false };
  return { ok: true, lastRunAt: data?.ran_at ?? null };
}

// Les passages terminés de la semaine, le plus récent par acquéreur, ses biens encore nouveaux pour
// lui : ni retenus, ni proposés, ni refusés depuis, ni devenus des biens de l'agence.
async function recentFinds(
  admin: Admin,
  agencyId: string,
  now: Date,
  buyerIds: string[] | null,
): Promise<{ ok: true; runs: WatchRunFinds[] } | { ok: false }> {
  const read = await readPages((from, to) => {
    let query = admin
      .from('buyer_watch_runs')
      .select('buyer_id, ran_at, finds')
      .eq('agency_id', agencyId)
      .eq('status', 'done')
      .gt('found_count', 0)
      .gte('ran_at', recentSince(now))
      .order('ran_at', { ascending: false });
    if (buyerIds) query = query.in('buyer_id', buyerIds);
    return query.range(from, to);
  });
  if (read.error) return { ok: false };
  const latest = new Map<string, { ranAt: string; finds: WatchFind[] }>();
  for (const row of read.data) {
    if (!latest.has(row.buyer_id)) {
      latest.set(row.buyer_id, { ranAt: row.ran_at, finds: readWatchFinds(row.finds) });
    }
  }
  if (latest.size === 0) return { ok: true, runs: [] };
  const known = await readBuyerKnownKeys(admin, agencyId, [...latest.keys()]);
  if (!known.ok) return { ok: false };
  const runs: WatchRunFinds[] = [];
  for (const [buyerId, run] of latest) {
    const keys = known.keys(buyerId);
    const finds = run.finds.filter((find) => !keys.has(watchKey(find.url)));
    if (finds.length > 0) runs.push({ buyerId, ranAt: run.ranAt, finds });
  }
  return { ok: true, runs };
}

// « Nouveau cette semaine », en tête des biens idéaux d'un acquéreur.
export async function getBuyerWatchFinds(
  agencyId: string,
  buyerId: string,
  now: Date = new Date(),
): Promise<{ ranAt: string; finds: WatchFind[] } | null> {
  const read = await recentFinds(createServiceRoleClient(), agencyId, now, [buyerId]);
  if (!read.ok) return null;
  const run = read.runs[0];
  return run ? { ranAt: run.ranAt, finds: run.finds } : null;
}

// Les tâches de la veille dans « À faire aujourd'hui » : une par acquéreur, et une par bien trouvé
// pour plusieurs acquéreurs (M134). Les fiches archivées, ou qui ont acheté ou abandonné, n'en ont
// pas. Une lecture en échec ne fabrique aucune tâche et le dit.
export async function getWatchTasks(
  agencyId: string,
  now: Date,
): Promise<{ tasks: SuiviTask[]; failed: boolean }> {
  const admin = createServiceRoleClient();
  const [read, buyers] = await Promise.all([
    recentFinds(admin, agencyId, now, null),
    admin
      .from('buyers')
      .select('id, name')
      .eq('agency_id', agencyId)
      .is('archived_at', null)
      .in('status', ['searching', 'visiting']),
  ]);
  if (!read.ok || buyers.error) return { tasks: [], failed: true };
  const names = new Map((buyers.data ?? []).map((row) => [row.id, row.name]));
  return {
    tasks: watchTasks(
      read.runs.filter((run) => names.has(run.buyerId)),
      names,
    ),
    failed: false,
  };
}

export type WatchAdmin = {
  watchCapCents: number;
  agencyCapCents: number;
  effectiveCapCents: number;
  watchSpentCents: number;
  state: WatchBudgetState;
  journal: {
    ranAt: string;
    buyerName: string;
    status: 'running' | 'done' | 'failed';
    adverts: number;
    found: number;
  }[];
};

// Administration, pour le manager : le plafond de la veille, ce qu'elle a dépensé ce mois-ci, son
// état, et les 30 derniers passages.
export async function getWatchAdmin(
  agencyId: string,
  now: Date = new Date(),
): Promise<WatchAdmin | null> {
  const admin = createServiceRoleClient();
  const since = startOfParisMonth(now).toISOString();
  const [agency, budget, usage, runs] = await Promise.all([
    admin.from('agencies').select('buyer_watch_cap_cents').eq('id', agencyId).maybeSingle(),
    admin
      .from('agency_search_budgets')
      .select('monthly_cap_cents')
      .eq('agency_id', agencyId)
      .maybeSingle(),
    readPages((from, to) =>
      admin
        .from('stream_estate_usage')
        .select('adverts, buyer_watch')
        .eq('agency_id', agencyId)
        .gte('created_at', since)
        .range(from, to),
    ),
    admin
      .from('buyer_watch_runs')
      .select('ran_at, status, adverts, found_count, buyers(name)')
      .eq('agency_id', agencyId)
      .order('ran_at', { ascending: false })
      .limit(30),
  ]);
  if (agency.error || !agency.data || budget.error || usage.error || runs.error) return null;
  const watchCapCents = agency.data.buyer_watch_cap_cents;
  const agencyCapCents = budget.data?.monthly_cap_cents ?? DEFAULT_MONTHLY_CAP_CENTS;
  const agencySpentCents = usage.data.reduce((sum, row) => sum + row.adverts, 0);
  const watchSpentCents = usage.data
    .filter((row) => row.buyer_watch)
    .reduce((sum, row) => sum + row.adverts, 0);
  return {
    watchCapCents,
    agencyCapCents,
    effectiveCapCents: effectiveWatchCapCents(watchCapCents, agencyCapCents),
    watchSpentCents,
    state: watchBudgetState({ watchCapCents, agencyCapCents, watchSpentCents, agencySpentCents }),
    journal: (runs.data ?? []).map((row) => ({
      ranAt: row.ran_at,
      buyerName: (row.buyers as { name: string } | null)?.name ?? 'Fiche supprimée',
      status: row.status as 'running' | 'done' | 'failed',
      adverts: row.adverts,
      found: row.found_count,
    })),
  };
}
