import type { DiagnosticsInput } from '@/features/subject-property-diagnostics/types';

function textOrNull(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? '').trim();
  return text === '' ? null : text;
}
function integerOrNull(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? '').trim();
  return raw === '' ? null : Number.parseInt(raw, 10);
}

// Reads only the diagnostic fields — never id / agency_id / created_at / updated_at.
export function parseDiagnosticsForm(formData: FormData): DiagnosticsInput {
  return {
    dpe_date: textOrNull(formData.get('dpe_date')),
    energy_consumption: integerOrNull(formData.get('energy_consumption')),
    ges_emissions: integerOrNull(formData.get('ges_emissions')),
    asbestos_status: textOrNull(formData.get('asbestos_status')),
    lead_status: textOrNull(formData.get('lead_status')),
    electricity_status: textOrNull(formData.get('electricity_status')),
    gas_status: textOrNull(formData.get('gas_status')),
    termites_status: textOrNull(formData.get('termites_status')),
    erp_status: textOrNull(formData.get('erp_status')),
    diagnostics_completed_at: textOrNull(formData.get('diagnostics_completed_at')),
    diagnostics_valid_until: textOrNull(formData.get('diagnostics_valid_until')),
    notes: textOrNull(formData.get('notes')),
  };
}
