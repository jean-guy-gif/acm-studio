import type { CondominiumInput } from '@/features/subject-property-condominium/types';

function textOrNull(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? '').trim();
  return text === '' ? null : text;
}
function numberOrNull(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? '').trim();
  return raw === '' ? null : Number(raw);
}
function integerOrNull(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? '').trim();
  return raw === '' ? null : Number.parseInt(raw, 10);
}
// Tri-state boolean: 'true' -> true, 'false' -> false, anything else -> null.
function triState(value: FormDataEntryValue | null): boolean | null {
  const raw = String(value ?? '').trim();
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return null;
}

export function parseCondominiumForm(formData: FormData): CondominiumInput {
  return {
    is_condominium: String(formData.get('is_condominium') ?? '') === 'true',
    total_lots: integerOrNull(formData.get('total_lots')),
    residential_lots: integerOrNull(formData.get('residential_lots')),
    annual_charges: numberOrNull(formData.get('annual_charges')),
    works_fund: numberOrNull(formData.get('works_fund')),
    syndic_name: textOrNull(formData.get('syndic_name')),
    ongoing_procedures: triState(formData.get('ongoing_procedures')),
    procedures_details: textOrNull(formData.get('procedures_details')),
    voted_works: triState(formData.get('voted_works')),
    voted_works_details: textOrNull(formData.get('voted_works_details')),
    planned_works: triState(formData.get('planned_works')),
    planned_works_details: textOrNull(formData.get('planned_works_details')),
    known_unpaid_charges: triState(formData.get('known_unpaid_charges')),
    known_unpaid_charges_amount: numberOrNull(formData.get('known_unpaid_charges_amount')),
    last_general_assembly_date: textOrNull(formData.get('last_general_assembly_date')),
    notes: textOrNull(formData.get('notes')),
  };
}
