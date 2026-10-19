import { describe, expect, it } from 'vitest';

import {
  bandPosition,
  buildMarketReading,
  competitorPriceBasisLabel,
} from '@/features/live-seller/services/market-reading';
import {
  authorizeAdvisorRange,
  projectLiveForSeller,
} from '@/features/live-seller/services/project-live-for-seller';
import type { LiveComparativeData } from '@/features/seller-presentation/types/seller-presentation';

type Entry = Parameters<typeof buildMarketReading>[0][number];

const NO_HISTORY = {
  available: false,
  initialPrice: null,
  currentPrice: null,
  dropCount: null,
  totalDropAmount: null,
  totalDropPercentage: null,
  source: null,
  entries: [],
};
const NO_DURATION = { available: false, days: null, firstSeenAt: null, label: null };

function entry(
  id: string,
  price: number,
  options: { guessed?: boolean; days?: number; dropped?: boolean } = {},
): Entry {
  return {
    id,
    price,
    priceHistory: options.dropped ? { ...NO_HISTORY, available: true } : NO_HISTORY,
    marketDuration:
      options.days != null
        ? { available: true, days: options.days, firstSeenAt: null, label: null }
        : NO_DURATION,
    response: options.guessed === false ? null : { seller_estimated_listing_price: price - 10_000 },
  };
}

const NO_ADJUST = { advisorPrice: null, marketComputed: 300_000 };

describe('la lecture du marché ne porte que sur les concurrents révélés (mission 94)', () => {
  it('donne les chiffres et la bande des concurrents dont le prix a été révélé', () => {
    const reading = buildMarketReading(
      [
        entry('a', 291_500, { days: 45, dropped: true }),
        entry('b', 298_700, { days: 120 }),
        entry('c', 312_400, { days: 200, dropped: true }),
      ],
      NO_ADJUST,
      3,
    );
    expect(reading).toMatchObject({
      calculationCount: 3,
      revealedCount: 3,
      prices: [291_500, 298_700, 312_400],
      lowestPrice: 291_500,
      highestPrice: 312_400,
      medianPrice: 298_700,
      droppedCount: 2,
      medianDaysOnMarket: 120,
    });
  });

  it('n’utilise JAMAIS un concurrent non révélé : ni son prix, ni sa durée, ni sa baisse', () => {
    const hidden = entry('caché', 999_999, { guessed: false, days: 5, dropped: true });
    const reading = buildMarketReading(
      [entry('a', 300_000, { days: 100 }), hidden, entry('b', 320_000, { days: 200 })],
      NO_ADJUST,
      3,
    );
    expect(reading.revealedCount).toBe(2);
    expect(reading.calculationCount).toBe(3);
    expect(reading.prices).toEqual([300_000, 320_000]);
    expect(reading.highestPrice).toBe(320_000);
    expect(reading.medianDaysOnMarket).toBe(150);
    expect(reading.droppedCount).toBeNull();
    expect(JSON.stringify(reading)).not.toContain('999999');
  });

  it('un concurrent écarté par « non », jamais estimé, n’y entre pas', () => {
    const refused: Entry = {
      ...entry('non', 280_000, { guessed: false }),
      response: { seller_estimated_listing_price: null },
    };
    expect(buildMarketReading([refused], NO_ADJUST, 1).prices).toEqual([]);
  });

  it('ne montre pas un chiffre inconnu, et n’invente rien', () => {
    const reading = buildMarketReading([entry('a', 300_000), entry('b', 320_000)], NO_ADJUST, 2);
    expect(reading.medianDaysOnMarket).toBeNull();
    expect(reading.droppedCount).toBeNull();
    const empty = buildMarketReading([], NO_ADJUST, 0);
    expect(empty).toMatchObject({
      prices: [],
      lowestPrice: null,
      highestPrice: null,
      medianPrice: null,
    });
  });

  it('place les points et les repères sur la bande', () => {
    expect(bandPosition(300_000, [300_000, 350_000, 400_000])).toBe(0);
    expect(bandPosition(350_000, [300_000, 350_000, 400_000])).toBe(0.5);
    expect(bandPosition(400_000, [300_000, 350_000, 400_000])).toBe(1);
    expect(bandPosition(300_000, [300_000])).toBe(0.5);
  });
});

describe('ce sur quoi porte le « Prix des concurrents »', () => {
  // Mission 104 — le nombre dit les concurrents qui ENTRENT dans le calcul.
  it('calculé : il le dit, avec le nombre de concurrents du calcul', () => {
    const reading = buildMarketReading(
      [entry('a', 300_000), entry('b', 310_000)],
      {
        advisorPrice: 300_000,
        marketComputed: 300_000,
      },
      2,
    );
    expect(reading.competitorPriceBasis).toBe('computed');
    expect(competitorPriceBasisLabel({ ...reading, calculationCount: 5 })).toBe(
      'Calculé sur 5 concurrents',
    );
    expect(competitorPriceBasisLabel({ ...reading, calculationCount: 1 })).toBe(
      'Calculé sur 1 concurrent',
    );
  });

  it('ajusté par le conseiller : jamais « observé sur le marché »', () => {
    const reading = buildMarketReading(
      [entry('a', 300_000)],
      { advisorPrice: 320_000, marketComputed: 300_000 },
      1,
    );
    expect(reading.competitorPriceBasis).toBe('advisor');
    const label = competitorPriceBasisLabel({ ...reading, calculationCount: 5 });
    expect(label).toBe('Prix retenu par votre conseiller à partir de 5 concurrents');
    expect(label).not.toMatch(/observé/);
  });

  it('sans décision enregistrée, c’est le calcul', () => {
    expect(buildMarketReading([entry('a', 300_000)], NO_ADJUST, 1).competitorPriceBasis).toBe(
      'computed',
    );
  });
});

describe('la lecture voyage avec la fourchette, jamais avant', () => {
  const full = (id: string, price: number, guess: number | null) =>
    ({
      ...entry(id, price, { guessed: guess != null }),
      response:
        guess == null
          ? { seller_serious_competitor: 'no', seller_estimated_listing_price: null }
          : { seller_serious_competitor: 'yes', seller_estimated_listing_price: guess },
      featureComparison: [],
      photoUrls: [],
    }) as unknown as LiveComparativeData['comparables'][number];

  const live = (perceived: number | null): LiveComparativeData =>
    ({
      comparables: [full('a', 300_000, 290_000), full('b', 777_777, null)],
      sellerSummary: { seller_perceived_property_price: perceived },
      competitiveMarketCentral: 305_000,
      advisorDecision: null,
      priceGaps: {},
    }) as unknown as LiveComparativeData;

  it('n’est pas livrée tant que la fourchette ne l’est pas', () => {
    expect(authorizeAdvisorRange(live(null))).toBeNull();
    expect(JSON.stringify(projectLiveForSeller(live(null)))).not.toContain('marketReading');
  });

  it('livrée, elle ne contient pas le prix d’un concurrent écarté par « non »', () => {
    const range = authorizeAdvisorRange(live(350_000));
    expect(range?.marketReading.prices).toEqual([300_000]);
    expect(JSON.stringify(range?.marketReading)).not.toContain('777777');
  });
});

// Mission 108 — ce que le vendeur lit est juste.
describe('« Analyse des prix » — Mission 108', () => {
  it('un « Non » dit APRÈS la révélation sort de la bande et de la médiane', () => {
    const late = {
      ...entry('late', 900_000),
      response: { seller_estimated_listing_price: 880_000, seller_serious_competitor: 'no' },
    };
    const reading = buildMarketReading(
      [entry('a', 300_000), entry('b', 320_000), late],
      NO_ADJUST,
      3,
    );
    expect(reading.prices).toEqual([300_000, 320_000]);
    expect(reading.revealedCount).toBe(2);
    expect(reading.medianPrice).toBe(310_000);
  });

  const decided = (outdated: boolean): LiveComparativeData =>
    ({
      comparables: [],
      sellerSummary: { seller_perceived_property_price: 350_000 },
      competitiveMarketCentral: 305_000,
      calculationCount: 4,
      advisorDecision: {
        advisorPrice: 330_000,
        sellerPrice: null,
        advisorComparativeMarketPrice: null,
        justification: null,
      },
      positioningOutdated: outdated,
      priceGaps: {},
    }) as unknown as LiveComparativeData;

  it('une décision périmée ne se dit plus « retenue par votre conseiller »', () => {
    expect(authorizeAdvisorRange(decided(false))?.marketReading.competitorPriceBasis).toBe(
      'advisor',
    );
    const reading = authorizeAdvisorRange(decided(true))?.marketReading;
    expect(reading?.competitorPriceBasis).toBe('computed');
    expect(competitorPriceBasisLabel(reading!)).toBe('Calculé sur 4 concurrents');
  });
});
