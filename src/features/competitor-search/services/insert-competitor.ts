import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/supabase/database.types';

type CompetitorInsert = Database['public']['Tables']['comparables']['Insert'];

// Mission 105 — une annonce n'existe qu'une fois par dossier, garanti en base (index unique
// `comparables_one_listing_per_project`). Une insertion qui bute dessus n'est pas un échec :
// la fiche existe déjà, et c'est elle qui vaut.
export const ONE_LISTING_PER_PROJECT = 'comparables_one_listing_per_project';

export function isDuplicateListing(error: { code?: string; message?: string } | null): boolean {
  return error?.code === '23505' && (error.message ?? '').includes(ONE_LISTING_PER_PROJECT);
}

// Un concurrent de plus dans le dossier, à la suite des autres : `display_order` = max + 1,
// recalculé à chaque tentative ; sur collision (contrainte unique, 23505) on réessaie. Même
// logique que `createComparable`. Partagé par l'import d'une page et par la création depuis la
// recherche (mission 101). Rend `true` si la ligne est écrite — ou si l'annonce a déjà sa fiche
// dans ce dossier (mission 105 : un import répété rend la fiche existante, sans erreur).
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
    if (!error || isDuplicateListing(error)) return true;
    if (error.code !== '23505') return false;
  }
  return false;
}
