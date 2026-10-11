import { median } from '@/features/comparables/services/calculate-comparable-summary';
import type { LiveComparableEntry } from '@/features/seller-presentation/types/seller-presentation';

// Mission 94 — la lecture du marché sur « Analyse des prix » : quelques chiffres et une bande de
// prix, pour que le vendeur comprenne d'où vient le « Prix des concurrents ».
//
// RÈGLE : elle ne porte que sur les concurrents dont le prix a été RÉVÉLÉ pendant le Live —
// ceux dont le vendeur a deviné le prix. Un concurrent écarté par « non », ou pas encore
// estimé, n'y entre pas : son prix n'a pas été montré, il ne l'est pas ici non plus. Calculée
// côté SERVEUR, sur la donnée complète ; seuls ces nombres voyagent.

export type MarketReading = {
  // Les concurrents retenus par le conseiller (tous), et ceux dont le prix a été révélé.
  retainedCount: number;
  revealedCount: number;
  // Les prix affichés des concurrents révélés, du moins cher au plus cher : la bande.
  prices: number[];
  lowestPrice: number | null;
  highestPrice: number | null;
  medianPrice: number | null;
  // Un chiffre inconnu vaut null et ne s'affiche pas : « 0 sur 6 » affirmerait ce qu'on ignore.
  droppedCount: number | null;
  medianDaysOnMarket: number | null;
  // Le « Prix des concurrents » montré est-il le calcul, ou un montant retenu par le conseiller ?
  competitorPriceBasis: 'computed' | 'advisor';
};

type ReadingEntry = Pick<
  LiveComparableEntry,
  'id' | 'price' | 'priceHistory' | 'marketDuration'
> & {
  response: { seller_estimated_listing_price?: number | null } | null;
};

// Même garde que la révélation elle-même : l'estimation du vendeur est PERSISTÉE.
const revealed = (entry: ReadingEntry): boolean =>
  entry.response?.seller_estimated_listing_price != null;

export function buildMarketReading(
  comparables: readonly ReadingEntry[],
  prices: { advisorPrice: number | null; marketComputed: number | null },
): MarketReading {
  const shown = comparables.filter(revealed);
  const listed = shown
    .map((entry) => entry.price)
    .filter((price) => Number.isFinite(price) && price > 0)
    .sort((a, b) => a - b);
  const days = shown
    .map((entry) => (entry.marketDuration.available ? entry.marketDuration.days : null))
    .filter((value): value is number => typeof value === 'number' && value >= 0);
  const medianDays = median(days);
  const dropped = shown.filter((entry) => entry.priceHistory.available).length;
  const medianPrice = median(listed);

  return {
    retainedCount: comparables.length,
    revealedCount: shown.length,
    prices: listed,
    lowestPrice: listed.length > 0 ? listed[0] : null,
    highestPrice: listed.length > 0 ? listed[listed.length - 1] : null,
    medianPrice: medianPrice == null ? null : Math.round(medianPrice),
    droppedCount: dropped > 0 ? dropped : null,
    medianDaysOnMarket: medianDays == null ? null : Math.round(medianDays),
    competitorPriceBasis:
      prices.advisorPrice != null &&
      prices.marketComputed != null &&
      Math.round(prices.advisorPrice) !== Math.round(prices.marketComputed)
        ? 'advisor'
        : 'computed',
  };
}

// « Calculé sur les 6 concurrents retenus par votre conseiller » — ou, quand le conseiller a
// retenu un autre montant que le calcul, « Prix retenu par votre conseiller à partir des 6
// concurrents ». Jamais « observé sur le marché » pour un prix ajusté.
export function competitorPriceBasisLabel(
  reading: Pick<MarketReading, 'retainedCount' | 'competitorPriceBasis'>,
): string {
  const count = reading.retainedCount;
  if (reading.competitorPriceBasis === 'advisor') {
    return count > 1
      ? `Prix retenu par votre conseiller à partir des ${count} concurrents`
      : 'Prix retenu par votre conseiller à partir du concurrent';
  }
  return count > 1
    ? `Calculé sur les ${count} concurrents retenus par votre conseiller`
    : 'Calculé sur le concurrent retenu par votre conseiller';
}

// Où placer un prix sur la bande, de 0 à 1 — repères du vendeur compris, pour qu'ils y tiennent.
export function bandPosition(value: number, all: readonly number[]): number {
  const low = Math.min(...all);
  const high = Math.max(...all);
  return high > low ? (value - low) / (high - low) : 0.5;
}
