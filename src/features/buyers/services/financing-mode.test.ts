import { describe, expect, it } from 'vitest';

import {
  financingModeColumns,
  parseFinancingMode,
} from '@/features/buyers/services/financing-mode';
import { toBuyer } from '@/features/buyers/services/buyer-row';
import type { BuyerRow } from '@/features/buyers/types';

// Lot B (Jean-Guy, 27/11) — « Comment finance-t-il ? » : comptant, avec prêt, ou pas encore dit ;
// avec un prêt seulement, l'apport, le montant du prêt et l'accord de principe, tous facultatifs.
// Ce que le navigateur envoie est relu au serveur ; la base refuse un détail de prêt sans prêt.

describe('ce que le navigateur envoie, relu au serveur', () => {
  it('un mode hors liste, ou rien, est refusé', () => {
    expect(parseFinancingMode({ mode: 'credit' })).toEqual({
      ok: false,
      error: 'Ce mode de financement n’existe pas.',
    });
    expect(parseFinancingMode(null).ok).toBe(false);
    expect(parseFinancingMode('cash').ok).toBe(false);
  });

  it('un montant négatif, nul pour le prêt, à centimes ou hors des bornes de la base est refusé', () => {
    const loan = (contribution: unknown, amount: unknown) =>
      parseFinancingMode({ mode: 'loan', contribution, amount, agreement: null });
    expect(loan(-1, null)).toEqual({ ok: false, error: 'L’apport n’est pas un montant valable.' });
    expect(loan(1500.5, null).ok).toBe(false);
    expect(loan(null, 0)).toEqual({
      ok: false,
      error: 'Le montant du prêt n’est pas un montant valable.',
    });
    expect(loan(null, 100_000_000).ok).toBe(false);
    expect(loan('120000', null).ok).toBe(false);
    expect(
      parseFinancingMode({ mode: 'loan', contribution: null, amount: null, agreement: 'oui' }),
    ).toEqual({ ok: false, error: 'L’accord de principe n’est pas valable.' });
  });

  it('avec un prêt, tout est facultatif ; un apport de 0 € se dit', () => {
    expect(parseFinancingMode({ mode: 'loan' })).toEqual({
      ok: true,
      value: { mode: 'loan', contribution: null, amount: null, agreement: null },
    });
    expect(
      parseFinancingMode({ mode: 'loan', contribution: 0, amount: 540_000, agreement: false }),
    ).toEqual({
      ok: true,
      value: { mode: 'loan', contribution: 0, amount: 540_000, agreement: false },
    });
  });
});

describe('les colonnes écrites', () => {
  it('avec un prêt : le mode et ses trois détails', () => {
    expect(
      financingModeColumns({
        mode: 'loan',
        contribution: 250_000,
        amount: 540_000,
        agreement: true,
      }),
    ).toEqual({
      financing_mode: 'loan',
      loan_contribution: 250_000,
      loan_amount: 540_000,
      loan_agreement: true,
    });
  });

  it('comptant ou pas encore dit : l’apport, le prêt et l’accord sont effacés dans la même écriture', () => {
    for (const mode of ['cash', 'not_said'] as const) {
      expect(
        financingModeColumns({ mode, contribution: 250_000, amount: 540_000, agreement: true }),
      ).toEqual({
        financing_mode: mode,
        loan_contribution: null,
        loan_amount: null,
        loan_agreement: null,
      });
    }
  });
});

describe('la fiche relue en base', () => {
  const row = (columns: Partial<BuyerRow>) =>
    toBuyer({
      id: 'b1',
      agency_id: 'a',
      advisor_id: 'c',
      created_at: '2026-11-28T08:00:00Z',
      updated_at: '2026-11-28T08:00:00Z',
      status_changed_at: '2026-11-28T08:00:00Z',
      name: 'M. Fontaine',
      cities: ['Vence'],
      ...columns,
    } as BuyerRow);

  it('un mode hors liste vaut « Pas encore dit », sans détail', () => {
    const buyer = row({ financing_mode: 'credit', loan_amount: 540_000 });
    expect(buyer.financingMode).toBe('not_said');
    expect([buyer.loanContribution, buyer.loanAmount, buyer.loanAgreement]).toEqual([
      null,
      null,
      null,
    ]);
  });

  it('les détails ne se lisent qu’avec un prêt, et dans les bornes de la base', () => {
    const cash = row({ financing_mode: 'cash', loan_amount: 540_000, loan_agreement: true });
    expect([cash.loanAmount, cash.loanAgreement]).toEqual([null, null]);
    const loan = row({
      financing_mode: 'loan',
      loan_contribution: 120_000,
      loan_amount: 650_000,
      loan_agreement: false,
    });
    expect([
      loan.financingMode,
      loan.loanContribution,
      loan.loanAmount,
      loan.loanAgreement,
    ]).toEqual(['loan', 120_000, 650_000, false]);
    const odd = row({ financing_mode: 'loan', loan_contribution: -5, loan_amount: 0 });
    expect([odd.loanContribution, odd.loanAmount, odd.loanAgreement]).toEqual([null, null, null]);
  });
});
