import {
  toSavedSearches,
  type SavedSearch,
} from '@/features/competitor-search/services/saved-searches';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// Mission 110 — les recherches nommées du conseiller connecté, par nom. La base ne rend que les
// siennes, dans son agence (règle `saved_searches_owner_read`).
export async function getSavedSearches(): Promise<SavedSearch[]> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) return [];
  const { data } = await (
    await createClient()
  )
    .from('saved_searches')
    .select('id, name, settings')
    .eq('owner_id', profile.id)
    .eq('agency_id', profile.agency_id)
    .order('name');
  return toSavedSearches(data ?? []);
}
