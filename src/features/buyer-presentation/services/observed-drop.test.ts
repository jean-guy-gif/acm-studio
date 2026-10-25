import { describe, expect, it } from 'vitest';

import { observedDrop } from '@/features/buyer-presentation/services/observed-drop';

// Mission 122 (décision de Jean-Guy, 25/10) — une baisse datée de la première observation au
// nouveau prix, jamais de la dernière relecture.
describe('la baisse de prix observée', () => {
  it('349 000 € le 1er, 335 000 € le 3, encore 335 000 € le 25 : 14 000 € le 3', () => {
    expect(
      observedDrop([
        { observedOn: '2026-10-25', price: 335_000 },
        { observedOn: '2026-10-01', price: 349_000 },
        { observedOn: '2026-10-03', price: 335_000 },
      ]),
    ).toEqual({ amount: 14_000, at: '2026-10-03' });
  });

  it('une hausse, un seul relevé, ou aucun changement : pas de baisse', () => {
    expect(
      observedDrop([
        { observedOn: '2026-10-01', price: 335_000 },
        { observedOn: '2026-10-03', price: 349_000 },
      ]),
    ).toBeNull();
    expect(observedDrop([{ observedOn: '2026-10-01', price: 335_000 }])).toBeNull();
    expect(
      observedDrop([
        { observedOn: '2026-10-01', price: 335_000 },
        { observedOn: '2026-10-03', price: 335_000 },
      ]),
    ).toBeNull();
  });

  it('deux baisses : le montant depuis le premier relevé, la date de la dernière baisse', () => {
    expect(
      observedDrop([
        { observedOn: '2026-10-01', price: 360_000 },
        { observedOn: '2026-10-05', price: 349_000 },
        { observedOn: '2026-10-12', price: 335_000 },
        { observedOn: '2026-10-20', price: 335_000 },
      ]),
    ).toEqual({ amount: 25_000, at: '2026-10-12' });
  });
});
