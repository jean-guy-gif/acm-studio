import { formatNumber } from '@/lib/format';

// Mission 132 — les paliers du budget plafond de la saisie rapide, à toucher au pouce ; « Autre »
// ouvre un champ libre. Pur.
export const BUDGET_STEPS = [
  200_000, 300_000, 400_000, 500_000, 750_000, 1_000_000, 1_500_000, 2_000_000,
] as const;

// « 750 k€ », « 1,5 M€ ».
export function budgetStepLabel(value: number): string {
  return value >= 1_000_000
    ? `${formatNumber(value / 1_000_000)} M€`
    : `${formatNumber(value / 1_000)} k€`;
}
