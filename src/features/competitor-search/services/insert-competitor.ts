import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/supabase/database.types';

type CompetitorInsert = Database['public']['Tables']['comparables']['Insert'];

// Un concurrent de plus dans le dossier, à la suite des autres : `display_order` = max + 1,
// recalculé à chaque tentative ; sur collision (contrainte unique, 23505) on réessaie. Même
// logique que `createComparable`. Partagé par l'import d'une page et par la création depuis la
// recherche (mission 101). Rend `true` si la ligne est écrite.
export async function insertCompetitor(
  supabase: SupabaseClient<Database>,
  projectId: string,
  agencyId: string,
  row: Omit<CompetitorInsert, 'project_id' | 'agency_id' | 'display_order'>,
): Promise<boolean> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data: last } = await supabase
      .from('comparables')
      .select('display_order')
      .eq('project_id', projectId)
      .eq('agency_id', agencyId)
      .order('display_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error } = await supabase.from('comparables').insert({
      ...row,
      project_id: projectId,
      agency_id: agencyId,
      display_order: (last?.display_order ?? 0) + 1,
    });
    if (!error) return true;
    if (error.code !== '23505') return false;
  }
  return false;
}
