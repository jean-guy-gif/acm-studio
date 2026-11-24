import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { aiBudgetUsage } = await import('@/features/ai-budget/queries/get-ai-budgets');
const { forfaitUsageLabel } = await import('@/features/search-budget/services/budget');

// Lancement, mission 5 — le manager lit la part du forfait d'IA utilisée, jamais un montant.
describe('la lecture par l’IA, pour le manager', () => {
  it('une part du forfait, à l’entier inférieur', () => {
    const usage = aiBudgetUsage({ capCents: 1000, spentCents: 149, posed: true });
    expect(usage).toEqual({ percent: 14, reached: false });
    expect(forfaitUsageLabel(usage).replace(/[  ]/g, ' ')).toBe('14 % du forfait du mois utilisé');
  });

  it('atteint au plafond, et un plafond à zéro est atteint d’emblée', () => {
    expect(aiBudgetUsage({ capCents: 1000, spentCents: 1000, posed: true }).reached).toBe(true);
    const cut = aiBudgetUsage({ capCents: 0, spentCents: 0, posed: true });
    expect(cut).toEqual({ percent: 100, reached: true });
    expect(forfaitUsageLabel(cut)).toBe('Forfait du mois atteint');
  });
});
