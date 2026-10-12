import 'server-only';

import { searchBudget, type SearchBudget } from '@/features/search-budget/services/budget';
import { startOfParisMonth } from '@/lib/paris-time';
import { createClient } from '@/lib/supabase/server';

export type SearchBudgetRead = { ok: true; budget: SearchBudget } | { ok: false };

// Mission 100 — la consommation Stream Estate du mois et le plafond de l'agence de l'appelant,
// lus avec SA session : la base ne rend que les lignes de son agence. Une lecture en échec n'est
// jamais lue comme « rien dépensé » (M98) : l'appelant décide, et la recherche ne part pas.
export async function getSearchBudget(
  agencyId: string,
  now: Date = new Date(),
): Promise<SearchBudgetRead> {
  try {
    const supabase = await createClient();
    const [usage, cap] = await Promise.all([
      supabase.rpc('stream_estate_usage_since', { p_since: startOfParisMonth(now).toISOString() }),
      supabase
        .from('agency_search_budgets')
        .select('monthly_cap_cents')
        .eq('agency_id', agencyId)
        .maybeSingle(),
    ]);
    if (usage.error || cap.error) return { ok: false };
    const adverts = (usage.data ?? []).find((row) => row.agency_id === agencyId)?.adverts ?? 0;
    return { ok: true, budget: searchBudget(Number(adverts), cap.data?.monthly_cap_cents ?? null) };
  } catch {
    return { ok: false };
  }
}
