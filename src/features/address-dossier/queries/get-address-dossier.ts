import 'server-only';

import type { AddressDossierView } from '@/features/address-dossier/components/address-dossier-block';
import { readBlocks } from '@/features/address-dossier/services/blocks-schema';
import { addressFingerprint } from '@/features/address-dossier/services/build-blocks';
import type { AddressDossier } from '@/features/address-dossier/types';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export type LoadedAddressDossier =
  { state: 'none' } | { state: 'unreadable' } | { state: 'built'; dossier: AddressDossier };

// Mission 141 — le dossier d'adresse d'un dossier vendeur de l'agence, relu par liste
// d'autorisation. Une lecture en échec n'est jamais lue comme « pas encore construit » (M98).
export async function getAddressDossier(projectId: string): Promise<LoadedAddressDossier> {
  const profile = await getProfile();
  if (!profile) return { state: 'unreadable' };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('address_dossiers')
    .select('built_at, address_fingerprint, blocks')
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (error) return { state: 'unreadable' };
  if (!data) return { state: 'none' };
  return {
    state: 'built',
    dossier: {
      builtAt: data.built_at,
      fingerprint: data.address_fingerprint,
      blocks: readBlocks(data.blocks, data.built_at),
    },
  };
}

// Ce que l'écran reçoit : le dossier relu, et s'il date d'une autre adresse ou d'un autre type.
export async function addressDossierView(
  projectId: string,
  property: {
    address: string | null;
    postal_code: string | null;
    city: string | null;
    property_type: string | null;
  } | null,
): Promise<AddressDossierView> {
  const loaded = await getAddressDossier(projectId);
  if (loaded.state !== 'built') return loaded;
  const now = addressFingerprint({
    address: property?.address ?? null,
    postalCode: property?.postal_code ?? null,
    city: property?.city ?? null,
    propertyType: property?.property_type ?? null,
  });
  return {
    state: 'built',
    builtAt: loaded.dossier.builtAt,
    stale: now !== loaded.dossier.fingerprint,
    blocks: loaded.dossier.blocks,
  };
}
