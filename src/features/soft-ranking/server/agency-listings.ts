import 'server-only';

import type { RankingListing } from '@/features/soft-ranking/types';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

// Mission 151 (partie B) — les textes des biens de l'agence (« Ce que l'agence a déjà ») pour le
// classement, relus au serveur et dans l'agence du conseiller seulement (M98, M108) : un mandat par
// la description et les atouts de sa fiche, un concurrent par le texte et les étiquettes de son
// annonce. Les clés sont celles du rapprochement (`dossier:<id>`, `competitor:<id>`) ; une clé d'une
// autre forme, ou d'une autre agence, est ignorée. Rien n'est gardé : le texte sert au classement
// et part avec la requête. Une lecture en échec rend une liste vide (la carte reste simplifiée).

const KEY = /^(dossier|competitor):([0-9a-f-]{36})$/i;
const MAX_KEYS = 60;

export async function agencyRankingListings(
  agencyId: string,
  keys: readonly string[],
): Promise<RankingListing[]> {
  const projects: string[] = [];
  const comparables: string[] = [];
  for (const key of keys.slice(0, MAX_KEYS)) {
    const match = KEY.exec(key);
    if (!match) continue;
    (match[1] === 'dossier' ? projects : comparables).push(match[2]!.toLowerCase());
  }
  const admin = createServiceRoleClient();
  const [subjects, competitors] = await Promise.all([
    projects.length > 0
      ? admin
          .from('subject_properties')
          .select('project_id, description, strengths')
          .eq('agency_id', agencyId)
          .in('project_id', projects)
      : Promise.resolve({ data: [], error: null }),
    comparables.length > 0
      ? admin
          .from('comparables')
          .select('id, listing_description, listing_features')
          .eq('agency_id', agencyId)
          .in('id', comparables)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (subjects.error || competitors.error) {
    await reportServerError('agencyRankingListings', subjects.error ?? competitors.error);
    return [];
  }
  const listings: RankingListing[] = [];
  for (const row of subjects.data ?? []) {
    const text = [row.description ?? '', ...(row.strengths ?? [])].join('\n').trim();
    if (text) listings.push({ key: `dossier:${row.project_id}`, text, tags: [] });
  }
  for (const row of competitors.data ?? []) {
    const tags = Array.isArray(row.listing_features)
      ? row.listing_features.filter((tag): tag is string => typeof tag === 'string').slice(0, 40)
      : [];
    const text = (row.listing_description ?? '').trim();
    if (text || tags.length > 0) listings.push({ key: `competitor:${row.id}`, text, tags });
  }
  return listings;
}
