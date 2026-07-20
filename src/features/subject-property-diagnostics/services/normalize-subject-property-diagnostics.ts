import type { DiagnosticsInput } from '@/features/subject-property-diagnostics/types';

function trimOrNull(value: string | null): string | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

// Pure normalisation of the diagnostics input: trims text, empty string -> null.
// Numbers and statuses are passed through (validated separately).
export function normalizeSubjectPropertyDiagnostics(input: DiagnosticsInput): DiagnosticsInput {
  return {
    ...input,
    asbestos_status: trimOrNull(input.asbestos_status),
    lead_status: trimOrNull(input.lead_status),
    electricity_status: trimOrNull(input.electricity_status),
    gas_status: trimOrNull(input.gas_status),
    termites_status: trimOrNull(input.termites_status),
    erp_status: trimOrNull(input.erp_status),
    dpe_date: trimOrNull(input.dpe_date),
    diagnostics_completed_at: trimOrNull(input.diagnostics_completed_at),
    diagnostics_valid_until: trimOrNull(input.diagnostics_valid_until),
    notes: trimOrNull(input.notes),
  };
}
