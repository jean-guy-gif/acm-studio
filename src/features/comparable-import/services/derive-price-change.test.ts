import { describe, expect, it } from 'vitest';

import { derivePriceChange } from '@/features/comparable-import/services/derive-price-change';

describe('derivePriceChange — the constat between two observations', () => {
  it('the brief example: 349 000 le 12/08, 335 000 le 10/09 → -14 000 (-4,0 %)', () => {
    const change = derivePriceChange([
      { observedOn: '2026-08-12', price: 349000 },
      { observedOn: '2026-09-10', price: 335000 },
    ]);
    expect(change).toEqual({
      fromPrice: 349000,
      fromDate: '2026-08-12',
      toPrice: 335000,
      toDate: '2026-09-10',
      amount: 14000,
      percentage: 4,
    });
  });

  it('compares FIRST to LATEST across more than two observations', () => {
    const change = derivePriceChange([
      { observedOn: '2026-07-01', price: 360000 },
      { observedOn: '2026-08-12', price: 349000 },
      { observedOn: '2026-09-10', price: 335000 },
    ]);
    expect(change?.fromPrice).toBe(360000);
    expect(change?.toPrice).toBe(335000);
    expect(change?.amount).toBe(25000);
  });

  it('a rise is reported too (negative amount) — an écart is an écart', () => {
    const change = derivePriceChange([
      { observedOn: '2026-08-01', price: 300000 },
      { observedOn: '2026-09-01', price: 310000 },
    ]);
    expect(change?.amount).toBe(-10000);
  });

  it('a single observation, or no net change, yields null', () => {
    expect(derivePriceChange([{ observedOn: '2026-09-10', price: 335000 }])).toBeNull();
    expect(
      derivePriceChange([
        { observedOn: '2026-08-01', price: 335000 },
        { observedOn: '2026-09-10', price: 335000 },
      ]),
    ).toBeNull();
  });
});
