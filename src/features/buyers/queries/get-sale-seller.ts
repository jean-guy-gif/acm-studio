import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { isMandateType, type MandateType } from '@/features/meeting-conclusion/types';
import type { Database } from '@/lib/supabase/database.types';

// Mission 143 (B1) — « La vente » : le vendeur du bien de l'offre et le type de son mandat, lus sur
// la vente de l’agence (côté conseiller seulement). Null si la lecture échoue.
export type SaleSeller = { sellerName: string; mandateType: MandateType | null };

export async function getSaleSeller(
  supabase: SupabaseClient<Database>,
  agencyId: string,
  projectId: string,
): Promise<SaleSeller | null> {
  const [{ data: project, error }, { data: conclusion }] = await Promise.all([
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
  ]);
  if (error || !project) return null;
  return {
    sellerName: project.seller_name,
    mandateType: isMandateType(conclusion?.mandate_type) ? conclusion.mandate_type : null,
  };
}
