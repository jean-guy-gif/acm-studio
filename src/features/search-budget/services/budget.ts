// Mission 100 — ne jamais dépenser sans limite : chaque annonce facturée par Stream Estate est
// comptée par agence et par mois (heure de Paris), et un plafond mensuel arrête les recherches.
// Tout se compte en centimes : une annonce coûte un centime (0,01 €, stream-estate-tiers.ts).

export const CENTS_PER_ADVERT = 1;
// Plafond d'une agence qui n'a pas de ligne dans `agency_search_budgets` : 30 € par mois.
export const DEFAULT_MONTHLY_CAP_CENTS = 3000;
// La borne de la base (`monthly_cap_cents between 0 and 100000`).
export const MAX_MONTHLY_CAP_EUR = 1000;
export const BUDGET_WARNING_RATIO = 0.8;

// Lancement, mission 5 (Jean-Guy, 23/11) — plus aucun coût en euros devant le conseiller : le
// plafond atteint se dit sans montant ; les montants restent pour l'opérateur seul (`/erreurs`).
export const BUDGET_REACHED_LABEL =
  'Votre forfait du mois est atteint\u00a0: contactez votre agence';
export const BUDGET_REACHED_HINT =
  '«\u00a0Ouvrir mes recherches\u00a0» et l’import par l’extension restent possibles.';
export const BUDGET_UNREADABLE_MESSAGE =
  'Le forfait du mois n’a pas pu être vérifié\u00a0: aucune recherche lancée. Réessayez.';

export type SearchBudget = {
  spentCents: number;
  capCents: number;
  // Ce qu'une recherche peut encore facturer ce mois-ci, en annonces.
  remainingAdverts: number;
  reached: boolean;
  // À 80 % du plafond, sans l'avoir atteint.
  warning: boolean;
  percent: number;
};

export function searchBudget(adverts: number, capCents: number | null): SearchBudget {
  const cap = capCents ?? DEFAULT_MONTHLY_CAP_CENTS;
  const spentCents = Math.max(0, Math.round(adverts)) * CENTS_PER_ADVERT;
  const reached = spentCents >= cap;
  return {
    spentCents,
    capCents: cap,
    remainingAdverts: reached ? 0 : Math.floor((cap - spentCents) / CENTS_PER_ADVERT),
    reached,
    warning: !reached && spentCents >= cap * BUDGET_WARNING_RATIO,
    percent: cap > 0 ? Math.floor((spentCents / cap) * 100) : 100,
  };
}

// Le plafond d'une recherche ne dépasse jamais ce qu'il reste du mois : la dernière recherche
// s'arrête au plafond de l'agence, pas 60 annonces plus loin.
export function advertsAllowed(searchCap: number, budget: SearchBudget): number {
  return Math.max(0, Math.min(searchCap, budget.remainingAdverts));
}

export function budgetWarningLabel(budget: SearchBudget): string | null {
  return budget.warning ? `${budget.percent} % du forfait du mois utilisé` : null;
}

// Pour le manager, sur Administration : la part du forfait utilisée, jamais un montant.
// « 14 % du forfait du mois utilisé », « Forfait du mois atteint ».
export function forfaitUsageLabel(usage: { percent: number; reached: boolean }): string {
  return usage.reached
    ? 'Forfait du mois atteint'
    : `${Math.min(usage.percent, 100)} % du forfait du mois utilisé`;
}

// Le plafond saisi par un compte autorisé : des euros entiers, de 0 à 1 000.
export function parseMonthlyCapEuros(raw: unknown): { ok: true; cents: number } | { ok: false } {
  const text = typeof raw === 'string' ? raw.trim().replace(/[\s  €]/g, '') : '';
  if (!/^\d{1,4}$/.test(text)) return { ok: false };
  const euros = Number(text);
  return euros <= MAX_MONTHLY_CAP_EUR ? { ok: true, cents: euros * 100 } : { ok: false };
}
