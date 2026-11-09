import { describe, expect, it } from 'vitest';

import {
  GUESS_CLOSE_BELOW_PERCENT,
  GUESS_FAR_FROM_PERCENT,
  guessGap,
} from '@/features/live-seller/services/guess-gap';

describe('guessGap — la réponse du vendeur face au prix affiché (M148)', () => {
  it('mesure l’écart sur le prix affiché, signé', () => {
    // 700 000 imaginé, 740 000 affiché : 5,4 % en dessous du prix affiché.
    const gap = guessGap(700_000, 740_000)!;
    expect(gap.amount).toBe(-40_000);
    expect(gap.direction).toBe('below');
    expect(gap.percent).toBeCloseTo(-5.405, 2);
    expect(gap.tone).toBe('orange');

    const above = guessGap(760_000, 749_000)!;
    expect(above.direction).toBe('above');
    expect(above.amount).toBe(11_000);
    expect(above.percent).toBeCloseTo(1.469, 2);
    expect(above.tone).toBe('green');
  });

  it('applique les seuils à l’écart exact, sans signe ni arrondi', () => {
    expect(GUESS_CLOSE_BELOW_PERCENT).toBe(5);
    expect(GUESS_FAR_FROM_PERCENT).toBe(10);
    expect(guessGap(104_990, 100_000)!.tone).toBe('green'); // 4,99 %
    expect(guessGap(95_010, 100_000)!.tone).toBe('green'); // −4,99 %
    expect(guessGap(105_000, 100_000)!.tone).toBe('orange'); // 5 % pile
    expect(guessGap(95_000, 100_000)!.tone).toBe('orange'); // −5 % pile
    expect(guessGap(109_990, 100_000)!.tone).toBe('orange'); // 9,99 %
    expect(guessGap(110_000, 100_000)!.tone).toBe('red'); // 10 % pile
    expect(guessGap(90_000, 100_000)!.tone).toBe('red'); // −10 % pile
    expect(guessGap(60_000, 100_000)!.tone).toBe('red');
  });

  it('dit « le prix affiché » quand la réponse est exacte', () => {
    expect(guessGap(139_000, 139_000)).toMatchObject({
      amount: 0,
      direction: 'equal',
      tone: 'green',
    });
  });

  it('ne colore rien sans réponse, pour une réponse à 0 € ou sans prix affiché', () => {
    expect(guessGap(null, 100_000)).toBeNull();
    expect(guessGap(undefined, 100_000)).toBeNull();
    expect(guessGap(0, 100_000)).toBeNull();
    expect(guessGap(100_000, null)).toBeNull();
    expect(guessGap(100_000, 0)).toBeNull();
  });
});
