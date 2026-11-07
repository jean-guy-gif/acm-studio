'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { readBlocks } from '@/features/address-dossier/services/blocks-schema';
import {
  addressFingerprint,
  buildBlocks,
  type AddressContext,
} from '@/features/address-dossier/services/build-blocks';
import { addressSources } from '@/features/address-dossier/services/sources-provider';
import type { DossierPropertyType } from '@/features/address-dossier/types';
import { geoProvider } from '@/features/competitor-search/services/geo-provider';
import { normalizePropertyType } from '@/features/competitor-search/utils/normalize-property-type';
import { isDemoAgency } from '@/features/demo/services/is-demo-agency';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type BuildAddressDossierResult = { ok: true } | { ok: false; error: string };

const FAILURE = 'Le dossier d’adresse n’a pas pu être construit. Réessayez.';
const NO_ADDRESS =
  'Ajoutez l’adresse du bien (numéro et rue) et sa commune, enregistrez, puis construisez le dossier d’adresse.';
const NOT_FOUND =
  'Adresse du bien non trouvée au numéro ni à la rue : vérifiez le numéro, la rue et la commune, puis enregistrez.';
const UNSURE =
  'Adresse du bien reconnue avec un doute, ou dans une autre commune : vérifiez-la, puis enregistrez.';
const GEO_DOWN = 'Le service des adresses n’a pas répondu : réessayez dans un instant.';
const COMMUNE_UNKNOWN =
  'Commune du bien non reconnue : vérifiez la ville et le code postal du bien vendeur.';

// Mission 141 — « Construire le dossier d'adresse » et « Actualiser », le même geste : l'adresse
// enregistrée du bien est géocodée (Base Adresse Nationale), puis chaque source publique est lue ;
// le dossier est gardé et daté par la base. Pour tout dossier non archivé de l'agence (décision du
// 07/11) : rien de cela ne va devant le vendeur. Dans l'agence de démonstration, aucun appel réseau
// (M114).
export async function buildAddressDossier(projectId: string): Promise<BuildAddressDossierResult> {
  const profile = await getProfile();
  if (!profile || profile.removed_at || !z.uuid().safeParse(projectId).success) {
    return { ok: false, error: FAILURE };
  }
  const supabase = await createClient();
  // Le dossier d'abord : un dossier archivé ou d'une autre agence s'arrête là.
  const { data: project } = await supabase
    .from('projects')
    .select('id, status')
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (!project || project.status === 'archived') return { ok: false, error: FAILURE };
  const { data: property } = await supabase
    .from('subject_properties')
    .select('address, postal_code, city, property_type')
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  const address = property?.address?.trim() ?? '';
  const city = property?.city?.trim() ?? '';
  if (!property || address === '' || city === '') return { ok: false, error: NO_ADDRESS };

  const { data: existing } = await supabase
    .from('address_dossiers')
    .select('blocks, built_at')
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();

  const isDemo = await isDemoAgency(profile.agency_id);
  const geo = geoProvider(isDemo);
  const [geocode, commune] = await Promise.all([
    geo.geocodeSubject(address, property.postal_code, city),
    geo.resolveCommune(city, property.postal_code),
  ]);
  if (!geocode.ok) {
    const reason = geocode.sector.status === 'neutral' ? geocode.sector.reason : 'unavailable';
    return {
      ok: false,
      error:
        reason === 'unavailable'
          ? GEO_DOWN
          : reason === 'imprecise' || reason === 'no_address'
            ? NOT_FOUND
            : UNSURE,
    };
  }
  if (!commune.ok) {
    return {
      ok: false,
      error: 'reason' in commune && commune.reason === 'unavailable' ? GEO_DOWN : COMMUNE_UNKNOWN,
    };
  }

  const type = normalizePropertyType(property.property_type);
  const context: AddressContext = {
    point: geocode.point,
    precision: geocode.precision ?? 'housenumber',
    banId: geocode.banId ?? null,
    inseeCode: commune.code,
    address,
    city,
    propertyType: type === 'house' || type === 'apartment' ? (type as DossierPropertyType) : null,
  };
  const { blocks, failures } = await buildBlocks({
    context,
    readers: addressSources(isDemo),
    previous: existing ? readBlocks(existing.blocks, existing.built_at) : null,
    now: new Date(),
  });
  // Une source en panne entre au journal ; les autres sont gardées (point 8 de la fiche).
  await Promise.all(
    failures.map(({ source, error }) => reportServerError(`address-dossier:${source}`, error)),
  );

  const { error } = await createServiceRoleClient()
    .from('address_dossiers')
    .upsert(
      {
        agency_id: profile.agency_id,
        project_id: projectId,
        built_by: profile.id,
        address_fingerprint: addressFingerprint({
          address,
          postalCode: property.postal_code,
          city,
          propertyType: property.property_type,
        }),
        blocks,
      },
      { onConflict: 'project_id' },
    );
  if (error) {
    await reportServerError('address-dossier:write', error);
    return { ok: false, error: FAILURE };
  }
  revalidatePath(`/builder/${projectId}/property`);
  revalidatePath(`/builder/${projectId}/avant-rendez-vous`);
  return { ok: true };
}
