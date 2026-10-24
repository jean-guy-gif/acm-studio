import { describe, expect, it } from 'vitest';

import {
  ALIGNED_BELOW_PERCENT,
  CLOSE_BELOW_PERCENT,
  PRICE_ALIGNMENT_LABELS,
  priceAlignment,
} from '@/features/price-positioning/services/price-alignment';

// Mission 116 — la règle de la couleur, aux seuils près : 4,99 % vert, 5 % orange, 9,99 % orange,
// 10 % rouge, −20 % vert ; sans référence, ou référence à zéro, rien.
describe('le prix de commercialisation face à l’analyse du conseiller', () => {
  const at = (percent: number) => priceAlignment(400_000 * (1 + percent / 100), 400_000);

  it('les seuils sont deux constantes nommées', () => {
    expect(ALIGNED_BELOW_PERCENT).toBe(5);
    expect(CLOSE_BELOW_PERCENT).toBe(10);
  });

  it('vert sous +5 %, tout prix inférieur compris', () => {
    expect(at(4.99)).toMatchObject({ tone: 'green', label: 'Prix aligné sur le marché' });
    expect(at(0)).toMatchObject({ tone: 'green' });
    expect(at(-20)).toMatchObject({ tone: 'green' });
    expect(priceAlignment(419_000, 400_000)).toMatchObject({ tone: 'green' });
    expect(priceAlignment(380_000, 400_000)).toMatchObject({ tone: 'green' });
  });

  it('orange de +5 % inclus à moins de +10 %', () => {
    expect(at(5)).toMatchObject({ tone: 'orange', label: 'Proche du marché' });
    expect(at(9.99)).toMatchObject({ tone: 'orange' });
    expect(priceAlignment(420_000, 400_000)).toMatchObject({ tone: 'orange' });
    expect(priceAlignment(439_000, 400_000)).toMatchObject({ tone: 'orange' });
  });

  it('rouge à +10 % et au-delà', () => {
    expect(at(10)).toMatchObject({ tone: 'red', label: 'Éloigné du marché' });
    expect(at(35)).toMatchObject({ tone: 'red' });
    expect(priceAlignment(440_000, 400_000)).toMatchObject({ tone: 'red' });
  });

  it('rien sans analyse du conseiller, sans prix, ou avec une référence à zéro', () => {
    expect(priceAlignment(315_000, null)).toBeNull();
    expect(priceAlignment(315_000, undefined)).toBeNull();
    expect(priceAlignment(null, 300_000)).toBeNull();
    expect(priceAlignment(315_000, 0)).toBeNull();
    expect(priceAlignment(Number.NaN, 300_000)).toBeNull();
  });

  it('les trois libellés ne disent jamais « estimation », et nomment le marché', () => {
    for (const label of Object.values(PRICE_ALIGNMENT_LABELS)) {
      expect(label).not.toMatch(/estimation/i);
      expect(label).toMatch(/marché/);
    }
  });
});
