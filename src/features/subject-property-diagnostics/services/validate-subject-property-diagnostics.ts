import {
  DIAGNOSTIC_STATUSES,
  MAX_DIAGNOSTIC_NOTES_LENGTH,
  MAX_ENERGY_CONSUMPTION,
  MAX_FUTURE_YEARS,
  MAX_GES_EMISSIONS,
  MIN_ENERGY_CONSUMPTION,
  MIN_GES_EMISSIONS,
} from '@/features/subject-property-diagnostics/constants/diagnostic-statuses';
import type { DiagnosticsInput } from '@/features/subject-property-diagnostics/types';

export type DiagnosticsValidationResult =
  { ok: true; value: DiagnosticsInput } | { ok: false; fieldErrors: Record<string, string> };

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// A valid calendar date string that round-trips through Date.
function isValidDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function maxDate(today: string): string {
  const [year, month, day] = today.split('-').map(Number);
  return `${year + MAX_FUTURE_YEARS}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function checkInteger(
  value: number | null,
  field: string,
  min: number,
  max: number,
  errors: Record<string, string>,
): void {
  if (value != null && (!Number.isInteger(value) || value < min || value > max)) {
    errors[field] = `La valeur doit être un entier entre ${min} et ${max}.`;
  }
}

function checkStatus(value: string | null, field: string, errors: Record<string, string>): void {
  if (
    value != null &&
    !DIAGNOSTIC_STATUSES.includes(value as (typeof DIAGNOSTIC_STATUSES)[number])
  ) {
    errors[field] = 'Statut non autorisé.';
  }
}

// Deterministic, pure validation. `today` (YYYY-MM-DD) is injectable for testing.
// Realisation dates must not exceed today + 5 years; validity must be on or after
// completion. Does not throw.
export function validateSubjectPropertyDiagnostics(
  input: DiagnosticsInput,
  options?: { today?: string },
): DiagnosticsValidationResult {
  const today = options?.today ?? new Date().toISOString().slice(0, 10);
  const limit = maxDate(today);
  const errors: Record<string, string> = {};

  checkInteger(
    input.energy_consumption,
    'energy_consumption',
    MIN_ENERGY_CONSUMPTION,
    MAX_ENERGY_CONSUMPTION,
    errors,
  );
  checkInteger(input.ges_emissions, 'ges_emissions', MIN_GES_EMISSIONS, MAX_GES_EMISSIONS, errors);

  checkStatus(input.asbestos_status, 'asbestos_status', errors);
  checkStatus(input.lead_status, 'lead_status', errors);
  checkStatus(input.electricity_status, 'electricity_status', errors);
  checkStatus(input.gas_status, 'gas_status', errors);
  checkStatus(input.termites_status, 'termites_status', errors);
  checkStatus(input.erp_status, 'erp_status', errors);

  // Realisation-type dates: valid and not excessively in the future.
  for (const field of ['dpe_date', 'diagnostics_completed_at'] as const) {
    const value = input[field];
    if (value != null) {
      if (!isValidDate(value)) {
        errors[field] = 'Date invalide.';
      } else if (value > limit) {
        errors[field] = `La date ne peut pas dépasser ${limit}.`;
      }
    }
  }

  // Validity date: valid date (may be in the future); must be >= completion.
  if (input.diagnostics_valid_until != null && !isValidDate(input.diagnostics_valid_until)) {
    errors.diagnostics_valid_until = 'Date invalide.';
  }
  if (
    input.diagnostics_valid_until != null &&
    input.diagnostics_completed_at != null &&
    errors.diagnostics_valid_until == null &&
    errors.diagnostics_completed_at == null &&
    input.diagnostics_valid_until < input.diagnostics_completed_at
  ) {
    errors.diagnostics_valid_until =
      'La date de validité doit être postérieure ou égale à la date de réalisation.';
  }

  if (input.notes != null && input.notes.length > MAX_DIAGNOSTIC_NOTES_LENGTH) {
    errors.notes = `Les notes sont limitées à ${MAX_DIAGNOSTIC_NOTES_LENGTH} caractères.`;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, fieldErrors: errors };
  }
  return { ok: true, value: input };
}
