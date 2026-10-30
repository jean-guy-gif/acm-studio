import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { comparableFacts } from '@/features/buyer-prospecting/services/prospect-facts';
import { listingIdentityKey } from '@/features/comparable-import/utils/extract-listing-key';
import { isProspectingOpen } from '@/features/competitor-locator/services/build-prospecting-rows';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import type { Database, Json } from '@/lib/supabase/database.types';

type Client = SupabaseClient<Database>;

const FACT_COLUMNS =
  'id, project_id, is_selected, listing_url, property_type, surface_area, rooms_count, land_area, outdoor_spaces, parking_types, listing_features, energy_rating, district, city, price, photo_urls';

// Mission 120 B (décision de Jean-Guy du 29/10) — le miroir de `absorbBuyerProspectsForProject` :
// un concurrent qui cesse de porter une carte de Prospection ne laisse jamais une origine
// « Recherche acquéreur » sans carte. Appelé quand l'issue d'un mandat signé change, quand un
// retenu sort des retenus, quand un dossier est archivé, et avant la suppression d'un concurrent.
// Une autre copie du même bien qui porte encore la carte (retenue dans un mandat signé, M98)
// reçoit les origines ; sinon la base recrée le bien démarché avec tous les faits du concurrent
// (`detach_buyer_origins`, clé service). Un échec ne défait rien : il entre au journal, et
// l'origine reste sur le concurrent (une suppression l'emporterait alors avec lui, comme avant).
export async function detachBuyerOrigins(
  service: Client,
  agencyId: string,
  comparableIds: string[],
  // Juste avant une suppression, le concurrent cesse de porter sa carte même s'il est encore
  // retenu dans un mandat signé. Sinon, un concurrent qui porte encore la carte (l'écriture qui
  // devait la lui retirer a échoué ou a été refusée) ne se détache pas.
  { beforeDelete = false }: { beforeDelete?: boolean } = {},
): Promise<number> {
  if (comparableIds.length === 0) return 0;
  const { data: origins, error } = await service
    .from('buyer_prospect_origins')
    .select('comparable_id')
    .eq('agency_id', agencyId)
    .in('comparable_id', comparableIds);
  if (error) {
    await reportServerError('lecture des origines acquéreur à détacher', error);
    return 0;
  }
  const carrying = [
    ...new Set(
      (origins ?? [])
        .map((origin) => origin.comparable_id)
        .filter((id): id is string => typeof id === 'string'),
    ),
  ];
  if (carrying.length === 0) return 0;

  const { data: competitors } = await service
    .from('comparables')
    .select(FACT_COLUMNS)
    .eq('agency_id', agencyId)
    .in('id', carrying);

  let moved = 0;
  for (const competitor of competitors ?? []) {
    if (
      !beforeDelete &&
      competitor.is_selected &&
      (await projectIsOpen(service, agencyId, competitor.project_id))
    ) {
      continue;
    }
    const listingKey = listingIdentityKey(competitor.listing_url);
    const target =
      listingKey && competitor.listing_url
        ? await openCopy(service, agencyId, competitor.listing_url, comparableIds)
        : null;
    const { data, error: rpcError } = await service.rpc('detach_buyer_origins', {
      p_agency_id: agencyId,
      p_comparable_id: competitor.id,
      p_listing_key: listingKey ?? '',
      p_facts: comparableFacts(competitor) as unknown as Json,
      ...(target ? { p_target_comparable_id: target } : {}),
    });
    if (rpcError) {
      await reportServerError('détachement des origines acquéreur d’un concurrent', rpcError);
    } else if (typeof data === 'number') {
      moved += data;
    }
  }
  return moved;
}

// Tous les retenus d'un dossier (l'issue a quitté « signé », le dossier est archivé).
export async function detachBuyerOriginsForProject(
  service: Client,
  agencyId: string,
  projectId: string,
): Promise<number> {
  const { data } = await service
    .from('comparables')
    .select('id')
    .eq('agency_id', agencyId)
    .eq('project_id', projectId);
  return detachBuyerOrigins(
    service,
    agencyId,
    (data ?? []).map((row) => row.id),
  );
}

// Une autre copie de la même annonce, retenue dans un mandat signé de l'agence (M98) : elle porte
// encore la carte.
async function openCopy(
  service: Client,
  agencyId: string,
  listingUrl: string,
  excluded: string[],
): Promise<string | null> {
  const { data: copies } = await service
    .from('comparables')
    .select('id, project_id')
    .eq('agency_id', agencyId)
    .eq('listing_url', listingUrl)
    .eq('is_selected', true);
  const candidates = (copies ?? []).filter((copy) => !excluded.includes(copy.id));
  for (const copy of candidates) {
    if (await projectIsOpen(service, agencyId, copy.project_id)) return copy.id;
  }
  return null;
}

// Un mandat signé de l'agence, non archivé : ses retenus portent une carte (M75, M86).
async function projectIsOpen(
  service: Client,
  agencyId: string,
  projectId: string,
): Promise<boolean> {
  const { data: project } = await service
    .from('projects')
    .select('status')
    .eq('id', projectId)
    .eq('agency_id', agencyId)
    .maybeSingle();
  if (!project) return false;
  const { data: conclusion } = await service
    .from('project_meeting_conclusions')
    .select('outcome')
    .eq('project_id', projectId)
    .eq('agency_id', agencyId)
    .maybeSingle();
  return isProspectingOpen(project.status, conclusion?.outcome);
}
