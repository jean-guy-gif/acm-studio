import { describe, expect, it } from 'vitest';

import { normalizeSubjectPropertyCondominium } from '@/features/subject-property-condominium/services/normalize-subject-property-condominium';
import { validateSubjectPropertyCondominium } from '@/features/subject-property-condominium/services/validate-subject-property-condominium';
import type { CondominiumInput } from '@/features/subject-property-condominium/types';

function input(overrides: Partial<CondominiumInput> = {}): CondominiumInput {
  return {
    is_condominium: true,
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
    ...overrides,
  };
}

const TODAY = { today: '2026-07-20' };

function validateNormalized(overrides: Partial<CondominiumInput>) {
  return validateSubjectPropertyCondominium(
    normalizeSubjectPropertyCondominium(input(overrides)),
    TODAY,
  );
}

describe('normalizeSubjectPropertyCondominium', () => {
  it('neutralises all fields when the property is not a condominium', () => {
    const result = normalizeSubjectPropertyCondominium(
      input({
        is_condominium: false,
        total_lots: 10,
        annual_charges: 500,
        syndic_name: 'Cabinet X',
        ongoing_procedures: true,
        procedures_details: 'Litige',
        notes: 'note',
      }),
    );
    expect(result).toEqual(input({ is_condominium: false }));
  });

  it('removes procedures_details when ongoing_procedures is false or null', () => {
    expect(
      normalizeSubjectPropertyCondominium(
        input({ ongoing_procedures: false, procedures_details: 'x' }),
      ).procedures_details,
    ).toBeNull();
    expect(
      normalizeSubjectPropertyCondominium(
        input({ ongoing_procedures: null, procedures_details: 'x' }),
      ).procedures_details,
    ).toBeNull();
  });

  it('removes voted / planned works details when their boolean is not true', () => {
    const result = normalizeSubjectPropertyCondominium(
      input({
        voted_works: false,
        voted_works_details: 'a',
        planned_works: null,
        planned_works_details: 'b',
      }),
    );
    expect(result.voted_works_details).toBeNull();
    expect(result.planned_works_details).toBeNull();
  });

  it('removes the unpaid amount when known_unpaid_charges is not true', () => {
    expect(
      normalizeSubjectPropertyCondominium(
        input({ known_unpaid_charges: false, known_unpaid_charges_amount: 900 }),
      ).known_unpaid_charges_amount,
    ).toBeNull();
  });

  it('keeps details when the boolean is true', () => {
    const result = normalizeSubjectPropertyCondominium(
      input({ ongoing_procedures: true, procedures_details: '  Litige  ' }),
    );
    expect(result.procedures_details).toBe('Litige');
  });
});

describe('validateSubjectPropertyCondominium', () => {
  it('accepts a true condominium with valid data', () => {
    expect(
      validateNormalized({
        is_condominium: true,
        total_lots: 20,
        residential_lots: 15,
        annual_charges: 1200,
        works_fund: 5000,
        syndic_name: 'Cabinet X',
        last_general_assembly_date: '2025-06-01',
      }).ok,
    ).toBe(true);
  });

  it('accepts a non-condominium (all neutralised)', () => {
    expect(validateNormalized({ is_condominium: false }).ok).toBe(true);
  });

  it('accepts partial data', () => {
    expect(validateNormalized({ is_condominium: true, total_lots: 12 }).ok).toBe(true);
  });

  it('rejects residential_lots greater than total_lots', () => {
    const result = validateNormalized({
      is_condominium: true,
      total_lots: 5,
      residential_lots: 10,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors).toHaveProperty('residential_lots');
    }
  });

  it('rejects negative charges, works fund and unpaid amount', () => {
    expect(validateNormalized({ is_condominium: true, annual_charges: -1 }).ok).toBe(false);
    expect(validateNormalized({ is_condominium: true, works_fund: -1 }).ok).toBe(false);
    expect(
      validateNormalized({
        is_condominium: true,
        known_unpaid_charges: true,
        known_unpaid_charges_amount: -1,
      }).ok,
    ).toBe(false);
  });

  it('rejects details longer than 2000 characters', () => {
    const result = validateNormalized({
      is_condominium: true,
      ongoing_procedures: true,
      procedures_details: 'x'.repeat(2001),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors).toHaveProperty('procedures_details');
    }
  });
});
