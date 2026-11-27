import { describe, expect, it } from 'vitest';

import { STREAM_ESTATE_PRICE_PER_ADVERT_EUR } from '@/features/competitor-search/services/stream-estate-tiers';
import {
  advertsAllowed,
  BUDGET_REACHED_LABEL,
  budgetWarningLabel,
  CENTS_PER_ADVERT,
  DEFAULT_MONTHLY_CAP_CENTS,
  forfaitUsageLabel,
  parseMonthlyCapEuros,
  searchBudget,
} from '@/features/search-budget/services/budget';
import { budgetUsageLabel } from '@/features/operations/services/usage-costs';

const plain = (text: string | null) => (text ?? '').replace(/[  ]/g, ' ');

// Mission 100 — ne jamais dépenser sans limite.
describe('searchBudget', () => {
  it('compte une annonce au prix que facture Stream Estate', () => {
    expect(CENTS_PER_ADVERT).toBe(STREAM_ESTATE_PRICE_PER_ADVERT_EUR * 100);
  });

  it('applique 30 € par mois à une agence sans plafond réglé', () => {
    expect(DEFAULT_MONTHLY_CAP_CENTS).toBe(3000);
    const budget = searchBudget(420, null);
    expect(budget).toMatchObject({
      spentCents: 420,
      capCents: 3000,
      remainingAdverts: 2580,
      reached: false,
      warning: false,
      percent: 14,
    });
    // Le montant : pour l'opérateur seul ; le manager lit une part du forfait (Lancement 5).
    expect(plain(budgetUsageLabel(budget))).toBe('4,20 € sur 30 €');
    expect(plain(forfaitUsageLabel(budget))).toBe('14 % du forfait du mois utilisé');
    expect(budgetWarningLabel(budget)).toBeNull();
  });

  it('prévient à 80 % du plafond, pas avant', () => {
    expect(searchBudget(2399, null).warning).toBe(false);
    const budget = searchBudget(2400, null);
    expect(budget.warning).toBe(true);
    expect(budget.reached).toBe(false);
    expect(plain(budgetWarningLabel(budget))).toBe('80 % du forfait du mois utilisé');
    expect(plain(budgetWarningLabel(searchBudget(2790, null)))).toBe(
      '93 % du forfait du mois utilisé',
    );
  });

  it('est atteint au plafond, et au-delà : plus aucune annonce permise, plus d’avertissement', () => {
    for (const adverts of [3000, 3045]) {
      const budget = searchBudget(adverts, null);
      expect(budget.reached).toBe(true);
      expect(budget.warning).toBe(false);
      expect(budget.remainingAdverts).toBe(0);
    }
    // Lancement, mission 5 — le plafond atteint se dit sans montant.
    expect(BUDGET_REACHED_LABEL).toBe(
      'Votre forfait du mois est atteint\u00a0: contactez votre agence',
    );
    expect(forfaitUsageLabel(searchBudget(3045, null))).toBe('Forfait du mois atteint');
  });

  it('un plafond à 0 € coupe la recherche avant la première annonce', () => {
    const budget = searchBudget(0, 0);
    expect(budget.reached).toBe(true);
    expect(budget.remainingAdverts).toBe(0);
    expect(budget.percent).toBe(100);
  });

  it('suit le plafond réglé pour l’agence', () => {
    expect(searchBudget(900, 1000)).toMatchObject({ reached: false, warning: true });
    expect(searchBudget(1000, 1000).reached).toBe(true);
  });
});

describe('advertsAllowed', () => {
  it('laisse le plafond d’une recherche tant que le budget le permet', () => {
    expect(advertsAllowed(60, searchBudget(0, null))).toBe(60);
    expect(advertsAllowed(20, searchBudget(100, null))).toBe(20);
  });

  it('borne la dernière recherche du mois à ce qu’il reste', () => {
    expect(advertsAllowed(60, searchBudget(2985, null))).toBe(15);
    expect(advertsAllowed(60, searchBudget(3000, null))).toBe(0);
  });
});

describe('parseMonthlyCapEuros', () => {
  it('accepte des euros entiers de 0 à 1 000', () => {
    expect(parseMonthlyCapEuros('30')).toEqual({ ok: true, cents: 3000 });
    expect(parseMonthlyCapEuros(' 0 ')).toEqual({ ok: true, cents: 0 });
    expect(parseMonthlyCapEuros('1000')).toEqual({ ok: true, cents: 100_000 });
    expect(parseMonthlyCapEuros('50 €')).toEqual({ ok: true, cents: 5000 });
  });

  it('refuse le reste', () => {
    for (const raw of ['', '-5', '12,5', '1001', 'trente', '1e3', null, undefined, 30]) {
      expect(parseMonthlyCapEuros(raw)).toEqual({ ok: false });
    }
  });
});
