import type { Database } from '@/lib/supabase/database.types';

export type SubjectPropertyDiagnostics =
  Database['public']['Tables']['subject_property_diagnostics']['Row'];

// Parsed but unvalidated client input (dates as YYYY-MM-DD strings, numbers as
// number|null, statuses as string|null). The client never sends id / agency_id /
// created_at / updated_at.
export type DiagnosticsInput = {
  dpe_date: string | null;
  energy_consumption: number | null;
  ges_emissions: number | null;
  asbestos_status: string | null;
  lead_status: string | null;
  electricity_status: string | null;
  gas_status: string | null;
  termites_status: string | null;
  erp_status: string | null;
  diagnostics_completed_at: string | null;
  diagnostics_valid_until: string | null;
  notes: string | null;
};
