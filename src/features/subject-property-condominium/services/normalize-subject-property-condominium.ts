import type { CondominiumInput } from '@/features/subject-property-condominium/types';

function trimOrNull(value: string | null): string | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

// A neutral (all-null) condominium payload except the is_condominium flag.
function neutral(): Omit<CondominiumInput, 'is_condominium'> {
  return {
    total_lots: null,
    residential_lots: null,
    annual_charges: null,
    works_fund: null,
    syndic_name: null,
    ongoing_procedures: null,
    procedures_details: null,
    voted_works: null,
    voted_works_details: null,
    planned_works: null,
    planned_works_details: null,
    known_unpaid_charges: null,
    known_unpaid_charges_amount: null,
    last_general_assembly_date: null,
    notes: null,
  };
}

// Pure normalisation enforcing the coherence rules:
//   * is_condominium = false     -> every other field neutralised to null;
//   * ongoing_procedures != true -> procedures_details = null;
//   * voted_works != true        -> voted_works_details = null;
//   * planned_works != true      -> planned_works_details = null;
//   * known_unpaid_charges != true -> known_unpaid_charges_amount = null.
// Text fields are trimmed, empty string -> null.
export function normalizeSubjectPropertyCondominium(input: CondominiumInput): CondominiumInput {
  if (!input.is_condominium) {
    return { is_condominium: false, ...neutral() };
  }

  return {
    is_condominium: true,
    total_lots: input.total_lots,
    residential_lots: input.residential_lots,
    annual_charges: input.annual_charges,
    works_fund: input.works_fund,
    syndic_name: trimOrNull(input.syndic_name),
    ongoing_procedures: input.ongoing_procedures,
    procedures_details:
      input.ongoing_procedures === true ? trimOrNull(input.procedures_details) : null,
    voted_works: input.voted_works,
    voted_works_details: input.voted_works === true ? trimOrNull(input.voted_works_details) : null,
    planned_works: input.planned_works,
    planned_works_details:
      input.planned_works === true ? trimOrNull(input.planned_works_details) : null,
    known_unpaid_charges: input.known_unpaid_charges,
    known_unpaid_charges_amount:
      input.known_unpaid_charges === true ? input.known_unpaid_charges_amount : null,
    last_general_assembly_date: trimOrNull(input.last_general_assembly_date),
    notes: trimOrNull(input.notes),
  };
}
