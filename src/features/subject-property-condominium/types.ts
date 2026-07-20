import type { Database } from '@/lib/supabase/database.types';

export type SubjectPropertyCondominium =
  Database['public']['Tables']['subject_property_condominiums']['Row'];

// Parsed but unvalidated client input. The client never sends id / agency_id /
// created_at / updated_at.
export type CondominiumInput = {
  is_condominium: boolean;
  total_lots: number | null;
  residential_lots: number | null;
  annual_charges: number | null;
  works_fund: number | null;
  syndic_name: string | null;
  ongoing_procedures: boolean | null;
  procedures_details: string | null;
  voted_works: boolean | null;
  voted_works_details: string | null;
  planned_works: boolean | null;
  planned_works_details: string | null;
  known_unpaid_charges: boolean | null;
  known_unpaid_charges_amount: number | null;
  last_general_assembly_date: string | null;
  notes: string | null;
};
