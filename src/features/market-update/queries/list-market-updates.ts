import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import {
  marketUpdateLine,
  parseMarketUpdateSummary,
  type MarketUpdateSummary,
} from '@/features/market-update/services/market-update-summary';
import type { Database } from '@/lib/supabase/database.types';

export type MarketUpdateEntry = {
  id: string;
  madeAt: string;
  line: string;
  summary: MarketUpdateSummary;
};

// Mission 127 — les points datés des dossiers du Suivi, du plus récent au plus ancien, par
// dossier. Un point illisible (forme inconnue) est ignoré, jamais inventé.
export async function listMarketUpdates(
  supabase: SupabaseClient<Database>,
  agencyId: string,
  projectIds: string[],
): Promise<Map<string, MarketUpdateEntry[]>> {
  const byProject = new Map<string, MarketUpdateEntry[]>();
  if (projectIds.length === 0) return byProject;
  const { data } = await supabase
    .from('project_market_updates')
    .select('id, project_id, made_at, summary')
    .eq('agency_id', agencyId)
    .in('project_id', projectIds)
    .order('made_at', { ascending: false });
  for (const row of data ?? []) {
    const summary = parseMarketUpdateSummary(row.summary);
    if (!summary) continue;
    byProject.set(row.project_id, [
      ...(byProject.get(row.project_id) ?? []),
      { id: row.id, madeAt: row.made_at, line: marketUpdateLine(summary), summary },
    ]);
  }
  return byProject;
}
