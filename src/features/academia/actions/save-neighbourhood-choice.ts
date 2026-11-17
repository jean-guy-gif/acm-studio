'use server';

import { revalidatePath } from 'next/cache';

import { readClientBlocks } from '@/features/academia/queries/read-neighbourhood-choice';
import { academiaApiAccess } from '@/features/academia/services/academia-api-access';
import { isDemoAgency } from '@/features/demo/services/is-demo-agency';
import {
  isNeighbourhoodBlockKey,
  NEIGHBOURHOOD_BLOCK_KEYS,
  pickNeighbourhoodBlocks,
} from '@/features/neighbourhood-link/services/neighbourhood-blocks';
import { propertyAddressLine } from '@/lib/academia';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

// Mission 159 — « Enregistrer le choix » (décisions de Jean-Guy, 17/11) : à chaque enregistrement,
// un instantané des seuls blocs cochés, relus ici dans la vue « bien-client » du jour (jamais ce que
// le navigateur envoie), jamais la valeur indicative ni le DPE. Plus de nouveau choix une fois le
// Live commencé, ni sur un dossier conclu ou archivé (la base le refuse aussi). Écrit par le serveur
// seul (clé de service), après le garde de l'agence.
export type SaveNeighbourhoodChoiceResult =
  { ok: true; keys: string[] } | { ok: false; error: string };

const LIVE_STARTED = 'Le Live a commencé : le quartier montré au vendeur ne se modifie plus.';

export async function saveNeighbourhoodChoice(
  projectId: unknown,
  rawKeys: unknown,
): Promise<SaveNeighbourhoodChoiceResult> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) return { ok: false, error: 'Vous devez être connecté.' };
  if (typeof projectId !== 'string') return { ok: false, error: 'Dossier introuvable.' };
  if (!Array.isArray(rawKeys) || rawKeys.length > NEIGHBOURHOOD_BLOCK_KEYS.length) {
    return { ok: false, error: 'Choix illisible : rechargez la page.' };
  }
  const keys = [...new Set(rawKeys)].filter(isNeighbourhoodBlockKey);
  if (keys.length !== rawKeys.length) {
    return { ok: false, error: 'Choix illisible : rechargez la page.' };
  }

  const supabase = await createClient();
  // Le dossier de l'agence d'abord, puis le Live, puis le bien : chaque refus s'arrête là.
  const project = await supabase
    .from('projects')
    .select('id, status, live_started_at')
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (project.error) {
    await reportServerError('academia:save-neighbourhood', project.error);
    return { ok: false, error: 'Le choix n’a pas pu être enregistré. Réessayez.' };
  }
  if (!project.data || project.data.status === 'archived') {
    return { ok: false, error: 'Dossier introuvable.' };
  }
  if (project.data.status === 'meeting_completed' || project.data.live_started_at != null) {
    return { ok: false, error: LIVE_STARTED };
  }
  const responses = await supabase
    .from('live_seller_responses')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id);
  if (responses.error) {
    await reportServerError('academia:save-neighbourhood', responses.error);
    return { ok: false, error: 'Le choix n’a pas pu être enregistré. Réessayez.' };
  }
  if ((responses.count ?? 0) > 0) return { ok: false, error: LIVE_STARTED };
  const property = await supabase
    .from('subject_properties')
    .select('address, postal_code, city, property_type, rooms_count, surface_area')
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (property.error) {
    await reportServerError('academia:save-neighbourhood', property.error);
    return { ok: false, error: 'Le choix n’a pas pu être enregistré. Réessayez.' };
  }
  const access = academiaApiAccess(await isDemoAgency(profile.agency_id));
  if (!access) return { ok: false, error: 'Dossier introuvable.' };
  const address = property.data
    ? propertyAddressLine({
        address: property.data.address,
        postalCode: property.data.postal_code,
        city: property.data.city,
      })
    : null;
  const admin = createServiceRoleClient();
  const current = await readClientBlocks({
    admin,
    agencyId: profile.agency_id,
    projectId,
    access,
    property: property.data
      ? {
          address,
          propertyType: property.data.property_type,
          rooms: property.data.rooms_count,
          surface: property.data.surface_area != null ? Number(property.data.surface_area) : null,
        }
      : null,
  });
  if (current.kind !== 'ok' || !address) {
    return {
      ok: false,
      error: 'Le dossier d’adresse n’a pas pu être lu : réessayez dans un instant.',
    };
  }
  const blocks = pickNeighbourhoodBlocks(current.blocks, keys);
  const { error } = await admin.from('project_neighbourhood_snapshots').insert({
    project_id: projectId,
    agency_id: profile.agency_id,
    blocks,
    property_address: address,
    property_type: current.facts.type,
    property_rooms: current.facts.rooms,
    property_surface: current.facts.surface,
    // Le jour des données de la source, celui du premier bloc gardé qui le dit.
    computed_on: Object.values(blocks).find((block) => block?.date)?.date ?? null,
    created_by: profile.id,
  });
  if (error) {
    // La base refuse aussi un choix fait après le début du Live (course avec le premier écran).
    if (error.code === '42501') return { ok: false, error: LIVE_STARTED };
    await reportServerError('academia:save-neighbourhood', error);
    return { ok: false, error: 'Le choix n’a pas pu être enregistré. Réessayez.' };
  }
  revalidatePath(`/builder/${projectId}/avant-rendez-vous`);
  revalidatePath(`/builder/${projectId}`);
  revalidatePath('/live');
  return { ok: true, keys: Object.keys(blocks) };
}
