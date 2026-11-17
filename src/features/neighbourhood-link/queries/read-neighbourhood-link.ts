import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import {
  neighbourhoodLink,
  type NeighbourhoodLink,
} from '@/features/neighbourhood-link/services/neighbourhood-link';
import { propertyAddressLine } from '@/lib/academia';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import type { Database } from '@/lib/supabase/database.types';

// Mission 157 B — le lien « Vivre ici » du bien, pour le Live et les documents du vendeur. Lu avec
// le client du conseiller (ses colonnes lisibles) ou la clé de service (le lien public d'un
// document), toujours cadré sur l'agence et le dossier. Devant le vendeur, jamais une erreur : une
// lecture en échec ne montre rien et entre au journal (M100).
export async function readNeighbourhoodLink(
  client: SupabaseClient<Database>,
  agencyId: string,
  projectId: string,
  now: Date = new Date(),
): Promise<NeighbourhoodLink | null> {
  try {
    return await read(client, agencyId, projectId, now);
  } catch (error) {
    // Une exception (le réseau) ne fait jamais tomber le Live ni un document du vendeur.
    await reportServerError('neighbourhood-link:read', error);
    return null;
  }
}

async function read(
  client: SupabaseClient<Database>,
  agencyId: string,
  projectId: string,
  now: Date,
): Promise<NeighbourhoodLink | null> {
  const project = await client
    .from('projects')
    .select('academia_living_here_url')
    .eq('id', projectId)
    .eq('agency_id', agencyId)
    .maybeSingle();
  if (project.error) {
    await reportServerError('neighbourhood-link:read', project.error);
    return null;
  }
  if (!project.data?.academia_living_here_url) return null;
  const request = await client
    .from('project_academia_requests')
    .select('property_address, link_url, link_expires_at')
    .eq('project_id', projectId)
    .eq('agency_id', agencyId)
    .maybeSingle();
  const subject = request.error
    ? { data: null, error: null }
    : await client
        .from('subject_properties')
        .select('address, postal_code, city')
        .eq('project_id', projectId)
        .eq('agency_id', agencyId)
        .maybeSingle();
  const error = request.error ?? subject.error;
  if (error) {
    await reportServerError('neighbourhood-link:read', error);
    return null;
  }
  return neighbourhoodLink({
    url: project.data.academia_living_here_url,
    request: request.data ?? null,
    propertyAddress: subject.data
      ? propertyAddressLine({
          address: subject.data.address,
          postalCode: subject.data.postal_code,
          city: subject.data.city,
        })
      : null,
    now,
  });
}
