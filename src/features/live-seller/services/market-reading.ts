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
  // Mission 104 — les concurrents qui ENTRENT dans le calcul du « Prix des concurrents » (les
  // valeurs aberrantes écartées n'y sont pas), et ceux dont le prix a été révélé.
  calculationCount: number;
  // Mission 112 — ceux du calcul que le vendeur voit, quand d'autres sont hors Live ; sinon null.
  seenTogetherCount: number | null;
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
  // Mission 108 — `advisor_only` : la décision du conseiller, périmée depuis (le marché a bougé) ;
  // elle reste montrée, sans dire sur combien de concurrents elle porte.
  competitorPriceBasis: 'computed' | 'advisor' | 'advisor_only';
};

type ReadingEntry = Pick<
  LiveComparableEntry,
  'id' | 'price' | 'priceHistory' | 'marketDuration'
> & {
  response: {
    seller_estimated_listing_price?: number | null;
    seller_serious_competitor?: string | null;
  } | null;
};

// Même garde que la révélation elle-même : l'estimation du vendeur est PERSISTÉE. Mission 108 —
// un « Non » à « Un sérieux concurrent ? » écarte le concurrent, même dit après la révélation.
const revealed = (entry: ReadingEntry): boolean =>
  entry.response?.seller_estimated_listing_price != null &&
  entry.response.seller_serious_competitor !== 'no';

export function buildMarketReading(
  comparables: readonly ReadingEntry[],
  prices: { advisorPrice: number | null; marketComputed: number | null; advisorOutdated?: boolean },
  calculationCount: number,
  seenTogetherCount: number | null = null,
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
    calculationCount,
    seenTogetherCount,
    revealedCount: shown.length,
    prices: listed,
    lowestPrice: listed.length > 0 ? listed[0] : null,
    highestPrice: listed.length > 0 ? listed[listed.length - 1] : null,
    medianPrice: medianPrice == null ? null : Math.round(medianPrice),
    droppedCount: dropped > 0 ? dropped : null,
    medianDaysOnMarket: medianDays == null ? null : Math.round(medianDays),
    competitorPriceBasis:
      prices.advisorPrice != null && prices.advisorOutdated
        ? 'advisor_only'
        : prices.advisorPrice != null &&
            prices.marketComputed != null &&
            Math.round(prices.advisorPrice) !== Math.round(prices.marketComputed)
          ? 'advisor'
          : 'computed',
  };
}

// « Calculé sur 5 concurrents » — ou, quand le conseiller a retenu un autre montant que le
// calcul, « Prix retenu par votre conseiller à partir de 5 concurrents ». Jamais « observé sur le
// marché » pour un prix ajusté. Mission 104 — le nombre est celui des concurrents qui entrent
// dans le calcul : un concurrent écarté pour un prix au m² trop éloigné n'y est pas compté.
export function competitorPriceBasisLabel(
  reading: Pick<MarketReading, 'calculationCount' | 'competitorPriceBasis'> & {
    seenTogetherCount?: number | null;
  },
): string {
  if (reading.competitorPriceBasis === 'advisor_only') {
    return 'Prix retenu par votre conseiller';
  }
  const count = reading.calculationCount;
  // Mission 112 — des concurrents hors Live entrent dans le calcul : le vendeur sait combien il
  // en a vus. Le prix ne change pas.
  const seen = reading.seenTogetherCount;
  const competitors = `${count} concurrent${count > 1 ? 's' : ''}${
    seen != null && seen < count ? `, dont ${seen} vu${seen > 1 ? 's' : ''} ensemble` : ''
  }`;
  return reading.competitorPriceBasis === 'advisor'
    ? `Prix retenu par votre conseiller à partir de ${competitors}`
    : `Calculé sur ${competitors}`;
}

// Où placer un prix sur la bande, de 0 à 1 — repères du vendeur compris, pour qu'ils y tiennent.
export function bandPosition(value: number, all: readonly number[]): number {
  const low = Math.min(...all);
  const high = Math.max(...all);
  return high > low ? (value - low) / (high - low) : 0.5;
}
