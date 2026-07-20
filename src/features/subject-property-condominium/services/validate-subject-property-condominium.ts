import {
  MAX_CONDO_FUTURE_YEARS,
  MAX_CONDO_TEXT_LENGTH,
  MAX_LOTS,
} from '@/features/subject-property-condominium/constants';
import type { CondominiumInput } from '@/features/subject-property-condominium/types';

export type CondominiumValidationResult =
  { ok: true; value: CondominiumInput } | { ok: false; fieldErrors: Record<string, string> };

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function maxDate(today: string): string {
  const [year, month, day] = today.split('-').map(Number);
  return `${year + MAX_CONDO_FUTURE_YEARS}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function checkInteger(value: number | null, field: string, errors: Record<string, string>): void {
  if (value != null && (!Number.isInteger(value) || value < 0 || value > MAX_LOTS)) {
    errors[field] = `La valeur doit être un entier entre 0 et ${MAX_LOTS}.`;
  }
}

function checkNonNegative(
  value: number | null,
  field: string,
  errors: Record<string, string>,
): void {
  if (value != null && (!Number.isFinite(value) || value < 0)) {
    errors[field] = 'Le montant doit être positif.';
  }
}

function checkLength(value: string | null, field: string, errors: Record<string, string>): void {
  if (value != null && value.length > MAX_CONDO_TEXT_LENGTH) {
    errors[field] = `Limité à ${MAX_CONDO_TEXT_LENGTH} caractères.`;
  }
}

// Deterministic, pure validation. Expects the already-normalised input (out-of-
// condominium data is neutralised upstream). `today` is injectable for testing.
export function validateSubjectPropertyCondominium(
  input: CondominiumInput,
  options?: { today?: string },
): CondominiumValidationResult {
  const today = options?.today ?? new Date().toISOString().slice(0, 10);
  const limit = maxDate(today);
  const errors: Record<string, string> = {};

  checkInteger(input.total_lots, 'total_lots', errors);
  checkInteger(input.residential_lots, 'residential_lots', errors);
  if (
    input.total_lots != null &&
    input.residential_lots != null &&
    errors.total_lots == null &&
    errors.residential_lots == null &&
    input.residential_lots > input.total_lots
  ) {
    errors.residential_lots = 'Les lots d’habitation ne peuvent pas dépasser le total des lots.';
  }

  checkNonNegative(input.annual_charges, 'annual_charges', errors);
  checkNonNegative(input.works_fund, 'works_fund', errors);
  checkNonNegative(input.known_unpaid_charges_amount, 'known_unpaid_charges_amount', errors);

  checkLength(input.syndic_name, 'syndic_name', errors);
  checkLength(input.procedures_details, 'procedures_details', errors);
  checkLength(input.voted_works_details, 'voted_works_details', errors);
  checkLength(input.planned_works_details, 'planned_works_details', errors);
  checkLength(input.notes, 'notes', errors);

  if (input.last_general_assembly_date != null) {
    if (!isValidDate(input.last_general_assembly_date)) {
      errors.last_general_assembly_date = 'Date invalide.';
    } else if (input.last_general_assembly_date > limit) {
      errors.last_general_assembly_date = `La date ne peut pas dépasser ${limit}.`;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, fieldErrors: errors };
  }
  return { ok: true, value: input };
}
