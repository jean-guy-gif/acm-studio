import { describe, expect, it } from 'vitest';

import { normalizeSubjectPropertyDiagnostics } from '@/features/subject-property-diagnostics/services/normalize-subject-property-diagnostics';
import { validateSubjectPropertyDiagnostics } from '@/features/subject-property-diagnostics/services/validate-subject-property-diagnostics';
import type { DiagnosticsInput } from '@/features/subject-property-diagnostics/types';

function input(overrides: Partial<DiagnosticsInput> = {}): DiagnosticsInput {
  return {
    dpe_date: null,
    energy_consumption: null,
    ges_emissions: null,
    asbestos_status: null,
    lead_status: null,
    electricity_status: null,
    gas_status: null,
    termites_status: null,
    erp_status: null,
    diagnostics_completed_at: null,
    diagnostics_valid_until: null,
    notes: null,
    ...overrides,
  };
}

const TODAY = { today: '2026-07-20' };

function errorsOf(overrides: Partial<DiagnosticsInput>) {
  const result = validateSubjectPropertyDiagnostics(input(overrides), TODAY);
  return result.ok ? {} : result.fieldErrors;
}

describe('validateSubjectPropertyDiagnostics', () => {
  it('accepts an empty (fully partial) payload', () => {
    expect(validateSubjectPropertyDiagnostics(input(), TODAY).ok).toBe(true);
  });

  it('accepts a valid full payload', () => {
    expect(
      validateSubjectPropertyDiagnostics(
        input({
          dpe_date: '2025-01-15',
          energy_consumption: 180,
          ges_emissions: 25,
          asbestos_status: 'clear',
          electricity_status: 'anomaly',
          diagnostics_completed_at: '2025-01-15',
          diagnostics_valid_until: '2035-01-15',
          notes: 'RAS',
        }),
        TODAY,
      ).ok,
    ).toBe(true);
  });

  it('accepts every valid status', () => {
    for (const status of [
      'not_required',
      'not_done',
      'in_progress',
      'clear',
      'anomaly',
      'positive',
      'negative',
      'unknown',
    ]) {
      expect(validateSubjectPropertyDiagnostics(input({ gas_status: status }), TODAY).ok).toBe(
        true,
      );
    }
  });

  it('rejects an invalid status', () => {
    expect(errorsOf({ asbestos_status: 'maybe' })).toHaveProperty('asbestos_status');
  });

  it('rejects negative and too-high energy consumption', () => {
    expect(errorsOf({ energy_consumption: -1 })).toHaveProperty('energy_consumption');
    expect(errorsOf({ energy_consumption: 2001 })).toHaveProperty('energy_consumption');
  });

  it('rejects negative and too-high GES emissions', () => {
    expect(errorsOf({ ges_emissions: -1 })).toHaveProperty('ges_emissions');
    expect(errorsOf({ ges_emissions: 501 })).toHaveProperty('ges_emissions');
  });

  it('rejects a validity date earlier than the completion date', () => {
    expect(
      errorsOf({ diagnostics_completed_at: '2025-06-01', diagnostics_valid_until: '2025-01-01' }),
    ).toHaveProperty('diagnostics_valid_until');
  });

  it('rejects a realisation date too far in the future (today + 5y)', () => {
    expect(errorsOf({ dpe_date: '2032-01-01' })).toHaveProperty('dpe_date');
  });

  it('rejects an invalid date', () => {
    expect(errorsOf({ dpe_date: '2025-13-40' })).toHaveProperty('dpe_date');
  });

  it('rejects notes longer than 2000 characters', () => {
    expect(errorsOf({ notes: 'x'.repeat(2001) })).toHaveProperty('notes');
  });

  it('normalises an empty note string to null', () => {
    const normalized = normalizeSubjectPropertyDiagnostics(input({ notes: '   ' }));
    expect(normalized.notes).toBeNull();
  });
});
