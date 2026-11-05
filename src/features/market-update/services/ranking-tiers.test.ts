import { describe, expect, it } from 'vitest';

import { tierOf } from '@/features/market-update/services/ranking-tiers';

const tiers = (total: number) =>
  Array.from({ length: total }, (_, index) => tierOf(index + 1, total));

describe('la couleur d’une place, par tiers (M129)', () => {
  it('9 biens : 1-3 vert, 4-6 orange, 7-9 rouge', () => {
    expect(tiers(9)).toEqual([
      'green',
      'green',
      'green',
      'orange',
      'orange',
      'orange',
      'red',
      'red',
      'red',
    ]);
  });

  it('8 biens : 1-3 vert, 4-6 orange, 7-8 rouge', () => {
    expect(tiers(8)).toEqual([
      'green',
      'green',
      'green',
      'orange',
      'orange',
      'orange',
      'red',
      'red',
    ]);
  });

  it('6 biens : 1-2 vert, 3-4 orange, 5-6 rouge', () => {
    expect(tiers(6)).toEqual(['green', 'green', 'orange', 'orange', 'red', 'red']);
  });

  it('1, 2 et 3 biens', () => {
    expect(tiers(1)).toEqual(['green']);
    expect(tiers(2)).toEqual(['green', 'orange']);
    expect(tiers(3)).toEqual(['green', 'orange', 'red']);
  });
});
