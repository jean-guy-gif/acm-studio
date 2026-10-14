import { describe, expect, it } from 'vitest';

import {
  priceCheckOutcome,
  priceRefreshSummary,
} from '@/features/competitor-refresh/services/price-refresh';

// Mission 105 — « Mettre à jour les prix des concurrents ».
describe('la relecture d’une annonce', () => {
  it('dit si le prix a changé, si l’annonce a disparu, ou si la page est illisible', () => {
    expect(priceCheckOutcome(300_000, { price: 300_000 })).toEqual({
      status: 'unchanged',
      price: 300_000,
    });
    expect(priceCheckOutcome(300_000, { price: 285_000 })).toEqual({
      status: 'changed',
      previous: 300_000,
      price: 285_000,
    });
    expect(priceCheckOutcome(300_000, { gone: true })).toEqual({ status: 'gone' });
    expect(priceCheckOutcome(300_000, null)).toEqual({ status: 'unreadable' });
  });

  it('résume ce qui a bougé, sans adresse ni titre de concurrent', () => {
    expect(
      priceRefreshSummary([
        { status: 'unchanged', price: 1 },
        { status: 'changed', previous: 300_000, price: 285_000 },
        { status: 'changed', previous: 300_000, price: 310_000 },
        { status: 'gone' },
        { status: 'unreadable' },
      ]),
    ).toBe(
      '3 annonces relues · 1 baisse de prix · 1 hausse de prix · 1 retirée depuis le rendez-vous · 1 illisible, inchangée',
    );
    expect(priceRefreshSummary([])).toMatch(/^Aucune annonce à relire/);
  });
});
