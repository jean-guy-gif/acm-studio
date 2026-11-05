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
  return (await readMarketUpdates(supabase, agencyId, projectIds)).byProject;
}

// Mission 130 — la même lecture, qui dit si elle a échoué : le Suivi ne déduit jamais « premier
// Point marché dû » d'une panne (M98).
export async function readMarketUpdates(
  supabase: SupabaseClient<Database>,
  agencyId: string,
  projectIds: string[],
): Promise<{ byProject: Map<string, MarketUpdateEntry[]>; failed: boolean }> {
  const byProject = new Map<string, MarketUpdateEntry[]>();
  if (projectIds.length === 0) return { byProject, failed: false };
  const { data, error } = await supabase
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
  return { byProject, failed: error != null };
}
