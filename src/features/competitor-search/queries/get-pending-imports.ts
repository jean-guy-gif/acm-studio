import 'server-only';

import {
  pendingCauseLabel,
  pendingImportLabel,
} from '@/features/competitor-search/services/pending-import-labels';
import { parseSearchSnapshot } from '@/features/competitor-search/services/search-snapshot';
import { detectSource } from '@/features/comparable-import/utils/detect-source';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export type PendingImportView = {
  id: string;
  url: string;
  // Le portail (« SeLoger »), et le bien tel que la recherche le décrit.
  site: string;
  label: string;
  cause: string | null;
  // Ce dont « Réessayer » a besoin pour rejouer l'import : le type lu sur la carte, et si le bien
  // vient de Stream Estate (une page qui renvoie ailleurs = annonce retirée).
  propertyType: string | null;
  fromStreamEstate: boolean;
};

// Mission 101 — les biens retenus dont l'import n'a pas abouti, pour le bandeau de la page des
// concurrents et de « Avant le rendez-vous ». Cadré sur l'agence de l'appelant. Une lecture en
// échec LÈVE : un bandeau absent laisserait croire que tout est importé (M98).
export async function getPendingImports(projectId: string): Promise<PendingImportView[]> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('pending_competitor_imports')
    .select('id, listing_url, listing_host, snapshot, last_cause, created_at')
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id)
    .order('created_at', { ascending: true });
  if (error) {
    throw new Error('Lecture des imports en attente impossible.');
  }
  return data.map((row) => {
    const snapshot = parseSearchSnapshot(row.snapshot);
    return {
      id: row.id,
      url: row.listing_url,
      site: detectSource(row.listing_host),
      label: pendingImportLabel(snapshot),
      cause: pendingCauseLabel(row.last_cause),
      propertyType: snapshot?.propertyType ?? null,
      fromStreamEstate: snapshot?.source === 'stream_estate',
    };
  });
}
