import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { listingIdentityKey } from '@/features/comparable-import/utils/extract-listing-key';
import { isProspectingOpen } from '@/features/competitor-locator/services/build-prospecting-rows';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import type { Database } from '@/lib/supabase/database.types';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

// Mission 120 (décision de Jean-Guy du 28/10) — une carte par bien, dans les deux sens. Un
// concurrent ne reprend la carte d'une annonce déjà démarchée depuis une recherche acquéreur que
// quand il porte lui-même une carte de Prospection : retenu dans un dossier conclu « mandat signé »
// (M75, M86). Avant — dossier en préparation, concurrent écarté —, la carte acquéreur vit à part,
// avec ses faits (bloquant du relecteur : une fusion à l'insertion faisait disparaître la carte,
// et la visite disait « À planifier » à tort). Appelé à la conclusion « signé » et au changement
// d'issue vers « signé » (tous les retenus), à la rétention d'un concurrent, et à l'insertion dans
// un dossier déjà signé. La fusion elle-même est une transaction de la base
// (`absorb_buyer_prospect`, clé service) : les faits, le vendeur et sa provenance, les origines et
// leurs courriers passent sur le concurrent, le bien démarché disparaît. Un échec ne défait rien :
// il entre au journal, et deux cartes se verraient à l'écran.
export async function absorbBuyerProspectsForProject(
  supabase: SupabaseClient<Database>,
  agencyId: string,
  projectId: string,
  // Un seul concurrent (celui qui vient d'être inséré ou retenu), sinon tous les retenus.
  comparableId: string | null = null,
): Promise<number> {
  const [{ data: project }, { data: conclusion }] = await Promise.all([
    supabase
      .from('projects')
      .select('status')
      .eq('id', projectId)
      .eq('agency_id', agencyId)
      .maybeSingle(),
    supabase
      .from('project_meeting_conclusions')
      .select('outcome')
      .eq('project_id', projectId)
      .eq('agency_id', agencyId)
      .maybeSingle(),
  ]);
  if (!project || !isProspectingOpen(project.status, conclusion?.outcome)) {
    return 0;
  }
  let query = supabase
    .from('comparables')
    .select('id, listing_url')
    .eq('project_id', projectId)
    .eq('agency_id', agencyId)
    .eq('is_selected', true);
  if (comparableId) {
    query = query.eq('id', comparableId);
  }
  const { data: competitors } = await query;
  const service = createServiceRoleClient();
  let merged = 0;
  for (const competitor of competitors ?? []) {
    const listingKey = listingIdentityKey(competitor.listing_url);
    if (!listingKey) continue;
    const { data, error } = await service.rpc('absorb_buyer_prospect', {
      p_agency_id: agencyId,
      p_comparable_id: competitor.id,
      p_listing_key: listingKey,
    });
    if (error) {
      await reportServerError('fusion d’un bien démarché dans un concurrent', error);
    } else if (data === 1) {
      merged += 1;
    }
  }
  return merged;
}
