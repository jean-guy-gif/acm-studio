import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { academiaPropertyType } from '@/features/academia/services/academia-api';
import {
  isShowableBlock,
  NEIGHBOURHOOD_BLOCK_KEYS,
  readStoredNeighbourhood,
  type NeighbourhoodBlockKey,
  type NeighbourhoodBlocks,
} from '@/features/neighbourhood-link/services/neighbourhood-blocks';
import { propertyAddressLine } from '@/lib/academia';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import type { Database } from '@/lib/supabase/database.types';

// Mission 159 — le quartier montré au vendeur : le dernier instantané des blocs cochés par le
// conseiller (décisions de Jean-Guy, 17/11). Le Live et l'impression lisent le dernier ; un lien
// déjà envoyé lit celui d'avant sa création (`before`). Avant le Live, un instantané fait pour une
// autre adresse, un autre type, d'autres pièces ou une autre surface est écarté (`stale`) ; une fois
// le Live commencé, on garde ce qui a été montré, et un instantané déjà écarté au début du Live ne
// revient jamais. Rien d'Academia n'est lu ici : seulement notre
// table. Devant le vendeur, jamais une erreur : une lecture en échec ne montre rien et entre au
// journal (M100).
export type NeighbourhoodSnapshot = {
  blocks: NeighbourhoodBlocks;
  keys: NeighbourhoodBlockKey[];
  takenAt: string;
};

export type NeighbourhoodSnapshotState = {
  snapshot: NeighbourhoodSnapshot | null;
  // Un instantané existe, mais le bien a changé depuis : il est écarté.
  stale: boolean;
  // Le Live a commencé (heure de début ou réponse du vendeur) : le choix ne change plus.
  locked: boolean;
};

const NONE: NeighbourhoodSnapshotState = { snapshot: null, stale: false, locked: false };

export async function readNeighbourhoodSnapshot(
  client: SupabaseClient<Database>,
  agencyId: string,
  projectId: string,
  options: { before?: string | null } = {},
): Promise<NeighbourhoodSnapshotState> {
  try {
    return await read(client, agencyId, projectId, options.before ?? null);
  } catch (error) {
    await reportServerError('neighbourhood-snapshot:read', error);
    return NONE;
  }
}

// Les seuls noms des blocs, pour le moteur du Live (aucun contenu).
export const neighbourhoodKeys = (state: NeighbourhoodSnapshotState): NeighbourhoodBlockKey[] =>
  state.snapshot?.keys ?? [];

async function read(
  client: SupabaseClient<Database>,
  agencyId: string,
  projectId: string,
  before: string | null,
): Promise<NeighbourhoodSnapshotState> {
  let snapshotQuery = client
    .from('project_neighbourhood_snapshots')
    .select('blocks, taken_at, property_address, property_type, property_rooms, property_surface')
    .eq('project_id', projectId)
    .eq('agency_id', agencyId)
    .order('taken_at', { ascending: false })
    .limit(1);
  if (before) snapshotQuery = snapshotQuery.lte('taken_at', before);
  const [project, responses, snapshot] = await Promise.all([
    client
      .from('projects')
      .select('status, live_started_at')
      .eq('id', projectId)
      .eq('agency_id', agencyId)
      .maybeSingle(),
    // La première réponse du vendeur : le Live a commencé à cet instant au plus tard.
    client
      .from('live_seller_responses')
      .select('created_at')
      .eq('project_id', projectId)
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: true })
      .limit(1),
    snapshotQuery.maybeSingle(),
  ]);
  const failed = [project, responses, snapshot].find((reply) => reply.error);
  if (failed?.error) {
    await reportServerError('neighbourhood-snapshot:read', failed.error);
    return NONE;
  }
  if (!project.data) return NONE;
  const firstAnswer = (responses.data ?? [])[0]?.created_at ?? null;
  // Le moment où le Live a commencé : son heure de début, sinon la première réponse du vendeur.
  const liveStart = project.data.live_started_at ?? firstAnswer;
  const locked =
    liveStart != null ||
    project.data.status === 'meeting_completed' ||
    project.data.status === 'archived';
  const row = snapshot.data;
  if (!row) return { ...NONE, locked };

  // Le bien d'aujourd'hui est-il celui de l'instantané ? Son adresse n'est lue que pour cette
  // comparaison ; elle n'entre jamais dans ce qui est rendu. Avant le Live, un bien changé écarte
  // l'instantané. Une fois le Live commencé, on garde ce qui a été montré : un bien changé APRÈS le
  // début du Live ne l'écarte pas ; un bien déjà changé AVANT (l'instantané écarté au Live, jamais
  // montré) l'écarte toujours. Un bien changé avant puis encore après n'est pas distingué : accepté.
  const property = await client
    .from('subject_properties')
    .select('address, postal_code, city, property_type, rooms_count, surface_area, updated_at')
    .eq('project_id', projectId)
    .eq('agency_id', agencyId)
    .maybeSingle();
  if (property.error) {
    await reportServerError('neighbourhood-snapshot:read', property.error);
    return NONE;
  }
  const current = property.data;
  const address = current
    ? propertyAddressLine({
        address: current.address,
        postalCode: current.postal_code,
        city: current.city,
      })
    : null;
  const surface = current?.surface_area != null ? Math.round(Number(current.surface_area)) : null;
  const same =
    current != null &&
    address === row.property_address &&
    academiaPropertyType(current.property_type) === row.property_type &&
    current.rooms_count === row.property_rooms &&
    surface === row.property_surface;
  const changedAfterLive =
    liveStart != null &&
    current?.updated_at != null &&
    Date.parse(current.updated_at) > Date.parse(liveStart);
  if (!same && !changedAfterLive) return { snapshot: null, stale: true, locked };

  const blocks = readStoredNeighbourhood(row.blocks);
  return {
    snapshot: {
      blocks,
      keys: NEIGHBOURHOOD_BLOCK_KEYS.filter((key) => isShowableBlock(blocks, key)),
      takenAt: row.taken_at,
    },
    stale: false,
    locked,
  };
}
