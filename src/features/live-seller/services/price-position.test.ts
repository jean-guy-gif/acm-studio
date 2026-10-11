import { describe, expect, it } from 'vitest';

import {
  pricePosition,
  pricePositionSentence,
} from '@/features/live-seller/services/price-position';

const plain = (text: string | null) => text?.replace(/[  ]/g, ' ') ?? null;
const SIX = [300_000, 310_000, 320_000, 330_000, 340_000, 350_000];

describe('la phrase qui situe le prix choisi (mission 94)', () => {
  it('le plus cher : au-dessus de tous les concurrents révélés', () => {
    expect(plain(pricePositionSentence(380_000, SIX))).toBe(
      'À 380 000 €, votre bien serait le plus cher des 7 biens comparés.',
    );
  });

  it('le moins cher : en dessous de tous', () => {
    expect(plain(pricePositionSentence(290_000, SIX))).toBe(
      'À 290 000 €, votre bien serait le moins cher des 7 biens comparés.',
    );
  });

  it('au milieu : son rang, compté du moins cher', () => {
    expect(plain(pricePositionSentence(315_000, SIX))).toBe(
      'À 315 000 €, votre bien serait le 3e moins cher sur 7.',
    );
    expect(plain(pricePositionSentence(345_000, SIX))).toBe(
      'À 345 000 €, votre bien serait le 6e moins cher sur 7.',
    );
  });

  it('autant de biens moins chers que plus chers : dans la moyenne', () => {
    expect(plain(pricePositionSentence(325_000, SIX))).toBe(
      'À 325 000 €, votre bien serait dans la moyenne des 7 biens comparés.',
    );
  });

  it('à égalité avec le plus cher ou le moins cher : il n’est pas seul à cette place', () => {
    expect(pricePosition(350_000, SIX)).toEqual({ kind: 'among_most_expensive' });
    expect(pricePosition(300_000, SIX)).toEqual({ kind: 'among_cheapest' });
    expect(plain(pricePositionSentence(350_000, SIX))).toBe(
      'À 350 000 €, votre bien serait parmi les plus chers des 7 biens comparés.',
    );
  });

  it('ne dit rien sans montant ou sans concurrent révélé', () => {
    expect(pricePositionSentence(Number.NaN, SIX)).toBeNull();
    expect(pricePositionSentence(0, SIX)).toBeNull();
    expect(pricePositionSentence(300_000, [])).toBeNull();
  });

  it('reste un repère : ni conseil, ni alerte, ni pression (M85)', () => {
    for (const price of [250_000, 315_000, 325_000, 400_000]) {
      expect(pricePositionSentence(price, SIX)).not.toMatch(
        /trop|attention|risque|conseill|devriez|!|baisser/i,
      );
    }
  });
});
