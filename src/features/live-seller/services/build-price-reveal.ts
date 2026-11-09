import { pricePerSquareMeter } from '@/features/comparables/services/calculate-comparable-summary';
import type { PriceReveal } from '@/features/live-seller/types';

// Pure. Builds the Page-2 reveal for a single comparable. Mission 148 — l'écart de la devinette
// n'est plus calculé ici : `guessGap` le mesure sur le prix affiché, partout. The relative position ranks this
// comparable by price/m² (1 = cheapest) among the comparables it is given —
// mission 104 : only those already revealed at its screen, itself included.
export function buildPriceReveal(input: {
  price: number;
  surfaceArea: number | null;
  sellerEstimate: number | null;
  retainedPricesPerSquareMeter: number[]; // revealed so far (incl. this one), unsorted
  thisPricePerSquareMeter: number | null;
}): PriceReveal {
  const ppsm = pricePerSquareMeter(input.price, input.surfaceArea);
  let relativePosition: PriceReveal['relativePosition'] = null;
  const values = input.retainedPricesPerSquareMeter.filter((v) => Number.isFinite(v));
  if (input.thisPricePerSquareMeter != null && values.length > 0) {
    const sorted = [...values].sort((a, b) => a - b);
    const rank = sorted.filter((v) => v < (input.thisPricePerSquareMeter as number)).length + 1;
    relativePosition = { rank, total: values.length };
  }

  return {
    currentPrice: input.price,
    pricePerSquareMeter: ppsm,
    sellerEstimate: input.sellerEstimate,
    relativePosition,
  };
}
