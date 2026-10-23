import 'server-only';

import { searchBudget, type SearchBudget } from '@/features/search-budget/services/budget';
import { startOfParisMonth } from '@/lib/paris-time';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type AgencyBudget = {
  agencyId: string;
  agencyName: string;
  budget: SearchBudget;
  // Mission 114 — l'agence de démonstration (fournisseurs simulés, rien de payé).
  isDemo: boolean;
};

// Mission 100 — À APPELER APRÈS `requireOperator` : la consommation Stream Estate du mois et le
// plafond de CHAQUE agence, lus avec la clé service. Une lecture en échec lève.
export async function getAgencyBudgets(now: Date = new Date()): Promise<AgencyBudget[]> {
  const admin = createServiceRoleClient();
  const [agencies, usage, caps] = await Promise.all([
    admin.from('agencies').select('id, name, is_demo').order('name'),
    admin.rpc('stream_estate_usage_since', { p_since: startOfParisMonth(now).toISOString() }),
    admin.from('agency_search_budgets').select('agency_id, monthly_cap_cents'),
  ]);
  if (agencies.error || usage.error || caps.error) {
    throw new Error('Lecture des budgets de recherche impossible.');
  }
  const adverts = new Map(usage.data.map((row) => [row.agency_id, Number(row.adverts)]));
  const cap = new Map(caps.data.map((row) => [row.agency_id, row.monthly_cap_cents]));
  return agencies.data.map((agency) => ({
    agencyId: agency.id,
    agencyName: agency.name,
    budget: searchBudget(adverts.get(agency.id) ?? 0, cap.get(agency.id) ?? null),
    isDemo: agency.is_demo === true,
  }));
}
