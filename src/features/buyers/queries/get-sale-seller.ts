import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { isMandateType, type MandateType } from '@/features/meeting-conclusion/types';
import { propertyAddressLine } from '@/lib/academia';
import type { Database } from '@/lib/supabase/database.types';

// Mission 143 (B1) — « La vente » : le vendeur du bien de l'offre et le type de son mandat, lus sur
// la vente de l’agence (côté conseiller seulement). Null si la lecture échoue. Mission 147
// (partie A) — et l'adresse enregistrée du bien, pour ouvrir Academia (null : pas d'adresse).
export type SaleSeller = {
  sellerName: string;
  mandateType: MandateType | null;
  address: string | null;
};

export async function getSaleSeller(
  supabase: SupabaseClient<Database>,
  agencyId: string,
  projectId: string,
): Promise<SaleSeller | null> {
  const [{ data: project, error }, { data: conclusion }, { data: property, error: propertyError }] =
    await Promise.all([
      supabase
        .from('projects')
        .select('seller_name')
        .eq('id', projectId)
        .eq('agency_id', agencyId)
        .maybeSingle(),
      supabase
        .from('project_meeting_conclusions')
        .select('mandate_type')
        .eq('project_id', projectId)
        .eq('agency_id', agencyId)
        .maybeSingle(),
      supabase
        .from('subject_properties')
        .select('address, postal_code, city')
        .eq('project_id', projectId)
        .eq('agency_id', agencyId)
        .maybeSingle(),
    ]);
  // Une adresse illisible n'est jamais « pas d'adresse » (M98) : la lecture entière échoue.
  if (error || propertyError || !project) return null;
  return {
    sellerName: project.seller_name,
    mandateType: isMandateType(conclusion?.mandate_type) ? conclusion.mandate_type : null,
    address: property
      ? propertyAddressLine({
          address: property.address,
          postalCode: property.postal_code,
          city: property.city,
        })
      : null,
  };
}
