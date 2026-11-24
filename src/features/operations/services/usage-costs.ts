import type { WatchBudgetState } from '@/features/buyer-watch/services/watch-schedule';
import type { SearchBudget } from '@/features/search-budget/services/budget';
import { formatEuro } from '@/lib/format';

// Lancement, mission 5 — les montants de l'usage, pour l'opérateur seul (`/erreurs`) : ni le
// conseiller ni le manager ne voient un coût en euros (`no-usage-cost.test.ts`).

// « 4,20 € sur 30 € »
export function budgetUsageLabel(budget: Pick<SearchBudget, 'spentCents' | 'capCents'>): string {
  const spent = formatEuro(budget.spentCents / 100, { minDecimals: 2, maxDecimals: 2 });
  return `${spent} sur ${formatEuro(budget.capCents / 100)}`;
}

// Pour l'opérateur, le plafond atteint se dit en clair.
export const OPERATOR_BUDGET_REACHED = 'plafond du mois atteint';

// L'état de la veille des acquéreurs, pour l'opérateur.
export const WATCH_OPERATOR_STATE: Record<WatchBudgetState, string> = {
  off: 'coupée',
  paused: 'en pause, plafond du mois atteint',
  active: 'active',
};
