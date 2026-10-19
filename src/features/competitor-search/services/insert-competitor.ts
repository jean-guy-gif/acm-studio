import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { storedListingUrl } from '@/features/comparable-import/utils/normalize-listing-url';
import type { Database } from '@/lib/supabase/database.types';

type CompetitorInsert = Database['public']['Tables']['comparables']['Insert'];

// Mission 105 — une annonce n'existe qu'une fois par dossier, garanti en base (index unique
// `comparables_one_listing_per_project`).
export const ONE_LISTING_PER_PROJECT = 'comparables_one_listing_per_project';

export function isDuplicateListing(error: { code?: string; message?: string } | null): boolean {
  return error?.code === '23505' && (error.message ?? '').includes(ONE_LISTING_PER_PROJECT);
}

// Mission 108 — un doublon n'est jamais avalé en silence : l'appelant apprend que la fiche
// existait déjà, et si elle était écartée, pour demander « la retenir ? ».
export type InsertCompetitorResult =
  | { status: 'created' }
  | { status: 'existing'; id: string; selected: boolean }
  | { status: 'failed' };

// La fiche déjà enregistrée pour cette annonce dans ce dossier, s'il y en a une.
export async function existingListing(
  supabase: SupabaseClient<Database>,
  projectId: string,
  agencyId: string,
  listingUrl: string | null,
): Promise<{ id: string; selected: boolean } | null> {
  if (!listingUrl) return null;
  const { data } = await supabase
    .from('comparables')
    .select('id, is_selected')
    .eq('project_id', projectId)
    .eq('agency_id', agencyId)
    .eq('listing_url', listingUrl)
    .maybeSingle();
  return data ? { id: data.id, selected: data.is_selected } : null;
}

// Un concurrent de plus dans le dossier, à la suite des autres : `display_order` = max + 1,
// recalculé à chaque tentative ; sur collision (contrainte unique, 23505) on réessaie. Partagé
// par l'import d'une page, la création depuis la recherche (mission 101) et la saisie à la main.
// Mission 108 — l'adresse de l'annonce est nettoyée ICI, pour tous les chemins, avant l'unicité.
export async function insertCompetitor(
  supabase: SupabaseClient<Database>,
  projectId: string,
  agencyId: string,
  row: Omit<CompetitorInsert, 'project_id' | 'agency_id' | 'display_order'>,
): Promise<InsertCompetitorResult> {
  const listingUrl = storedListingUrl(row.listing_url);
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
      listing_url: listingUrl,
      project_id: projectId,
      agency_id: agencyId,
      display_order: (last?.display_order ?? 0) + 1,
    });
    if (!error) return { status: 'created' };
    if (isDuplicateListing(error)) {
      const existing = await existingListing(supabase, projectId, agencyId, listingUrl);
      return existing ? { status: 'existing', ...existing } : { status: 'failed' };
    }
    if (error.code !== '23505') return { status: 'failed' };
  }
  return { status: 'failed' };
}
