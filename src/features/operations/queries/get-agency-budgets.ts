import 'server-only';

import {
  effectiveWatchCapCents,
  watchBudgetState,
  type WatchBudgetState,
} from '@/features/buyer-watch/services/watch-schedule';
import { searchBudget, type SearchBudget } from '@/features/search-budget/services/budget';
import { readPages } from '@/lib/supabase/read-pages';
import { startOfParisMonth } from '@/lib/paris-time';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type AgencyBudget = {
  agencyId: string;
  agencyName: string;
  budget: SearchBudget;
  // Mission 114 — l'agence de démonstration (fournisseurs simulés, rien de payé).
  isDemo: boolean;
  // Lancement, mission 5 — la veille des acquéreurs (M136), que le manager ne voit plus en
  // euros : son plafond réglé ici, celui qui s'applique (la moitié de la recherche au plus), ce
  // qu'elle a dépensé ce mois-ci, et son état.
  watchCapCents: number;
  watchEffectiveCapCents: number;
  watchSpentCents: number;
  watchState: WatchBudgetState;
};

// Mission 100 — À APPELER APRÈS `requireOperator` : la consommation Stream Estate du mois et le
// plafond de CHAQUE agence, lus avec la clé service. Une lecture en échec lève.
export async function getAgencyBudgets(now: Date = new Date()): Promise<AgencyBudget[]> {
  const admin = createServiceRoleClient();
  const since = startOfParisMonth(now).toISOString();
  const [agencies, usage, caps, watchUsage] = await Promise.all([
    admin.from('agencies').select('id, name, is_demo, buyer_watch_cap_cents').order('name'),
    admin.rpc('stream_estate_usage_since', { p_since: since }),
    admin.from('agency_search_budgets').select('agency_id, monthly_cap_cents'),
    readPages((from, to) =>
      admin
        .from('stream_estate_usage')
        .select('agency_id, adverts')
        .eq('buyer_watch', true)
        .gte('created_at', since)
        .order('id')
        .range(from, to),
    ),
  ]);
  if (agencies.error || usage.error || caps.error || watchUsage.error) {
    throw new Error('Lecture des budgets de recherche impossible.');
  }
  const adverts = new Map(usage.data.map((row) => [row.agency_id, Number(row.adverts)]));
  const cap = new Map(caps.data.map((row) => [row.agency_id, row.monthly_cap_cents]));
  // Une annonce de la veille coûte un centime, comme les autres (`CENTS_PER_ADVERT`).
  const watchSpent = new Map<string, number>();
  for (const row of watchUsage.data) {
    watchSpent.set(row.agency_id, (watchSpent.get(row.agency_id) ?? 0) + row.adverts);
  }
  return agencies.data.map((agency) => {
    const budget = searchBudget(adverts.get(agency.id) ?? 0, cap.get(agency.id) ?? null);
    const watchSpentCents = watchSpent.get(agency.id) ?? 0;
    return {
      agencyId: agency.id,
      agencyName: agency.name,
      budget,
      isDemo: agency.is_demo === true,
      watchCapCents: agency.buyer_watch_cap_cents,
      watchEffectiveCapCents: effectiveWatchCapCents(agency.buyer_watch_cap_cents, budget.capCents),
      watchSpentCents,
      watchState: watchBudgetState({
        watchCapCents: agency.buyer_watch_cap_cents,
        agencyCapCents: budget.capCents,
        watchSpentCents,
        agencySpentCents: budget.spentCents,
      }),
    };
  });
}
