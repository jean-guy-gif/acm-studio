import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import {
  EMPTY_LEGAL_IDENTITY,
  type LegalIdentity,
} from '@/features/legal-identity/services/legal-identity';
import type { Database } from '@/lib/supabase/database.types';

type Row = Database['public']['Tables']['agency_legal_identities']['Row'];

export function toLegalIdentity(row: Row | null): LegalIdentity {
  if (!row) return { ...EMPTY_LEGAL_IDENTITY };
  return {
    companyName: row.company_name,
    companyForm: row.company_form,
    shareCapital: row.share_capital,
    companySeat: row.company_seat,
    rcsCity: row.rcs_city,
    rcsNumber: row.rcs_number,
    vatNumber: row.vat_number,
    agencyPhone: row.agency_phone,
    agencyEmail: row.agency_email,
    rcpInsurer: row.rcp_insurer,
    rcpAddress: row.rcp_address,
    rcpNumber: row.rcp_number,
    guaranteeBody: row.guarantee_body,
    guaranteeAddress: row.guarantee_address,
    guaranteeNumber: row.guarantee_number,
    // `numeric` arrive en texte de l'API (M134).
    guaranteeAmount: row.guarantee_amount == null ? null : Number(row.guarantee_amount),
    representativeName: row.representative_name,
    representativeTitle: row.representative_title,
  };
}

// Mission 137 — l'identité légale d'une agence, cadrée sur elle ; une lecture en échec le dit
// (aucun document ne se produit sur une identité illisible, M98).
export async function readLegalIdentity(
  client: SupabaseClient<Database>,
  agencyId: string,
): Promise<{ ok: true; identity: LegalIdentity; saved: boolean } | { ok: false }> {
  const { data, error } = await client
    .from('agency_legal_identities')
    .select('*')
    .eq('agency_id', agencyId)
    .maybeSingle();
  if (error) return { ok: false };
  return { ok: true, identity: toLegalIdentity(data), saved: data != null };
}
