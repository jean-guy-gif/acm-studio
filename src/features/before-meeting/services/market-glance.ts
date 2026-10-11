import {
  median,
  pricePerSquareMeter,
} from '@/features/comparables/services/calculate-comparable-summary';
import type { Comparable } from '@/features/comparables/types';
import { storedFieldsPriceHistoryProvider } from '@/features/live-seller/services/price-history-provider';

// Mission 91 — « Le marché en un coup d'œil » : quatre chiffres et une rangée de points,
// calculés sur les concurrents RETENUS, tels que le vendeur les découvrira. Pur et
// déterministe. Un chiffre qui manque vaut null et ne s'affiche pas : rien n'est inventé.

export type GlanceCompetitor = {
  id: string;
  price: number | null;
  surfaceArea: number | null;
  // Ancienneté de l'annonce en jours, null si elle n'est pas connue.
  daysOnMarket: number | null;
  // Baisse de prix CONNUE (M47). Faux = aucune baisse connue, pas « n'a jamais baissé ».
  hasDropped: boolean;
};

export type GlanceDot = {
  id: string;
  pricePerSquareMeter: number;
  // Position sur l'axe, de 0 (le moins cher au m²) à 1 (le plus cher).
  position: number;
};

export type MarketGlance = {
  competitorCount: number;
  medianPricePerSquareMeter: number | null;
  lowestPrice: number | null;
  highestPrice: number | null;
  medianDaysOnMarket: number | null;
  // null tant qu'aucune baisse n'est connue : « 0 sur 6 » affirmerait ce qu'on ignore.
  droppedCount: number | null;
  dots: GlanceDot[];
  medianPosition: number | null;
};

// Ancienneté et baisse lues par le même fournisseur que le Live : l'écran de préparation ne
// peut pas dire autre chose que ce que le vendeur verra.
export function toGlanceCompetitor(comparable: Comparable, generatedAt: string): GlanceCompetitor {
  const source = {
    currentPrice: comparable.price,
    priceDropAmount: comparable.price_drop_amount,
    priceDropPercentage: comparable.price_drop_percentage,
    source: comparable.source,
    daysOnMarket: comparable.days_on_market,
    firstSeenAt: comparable.listing_published_at,
  };
  return {
    id: comparable.id,
    price: comparable.price,
    surfaceArea: comparable.surface_area,
    daysOnMarket: storedFieldsPriceHistoryProvider.getMarketDuration(source, generatedAt).days,
    hasDropped: storedFieldsPriceHistoryProvider.getPriceHistory(source).available,
  };
}

function positive(value: number | null): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export function buildMarketGlance(competitors: readonly GlanceCompetitor[]): MarketGlance {
  const prices = competitors.map((competitor) => competitor.price).filter(positive);
  const perSquareMeter = competitors.flatMap((competitor) => {
    const value = pricePerSquareMeter(competitor.price, competitor.surfaceArea);
    return value == null ? [] : [{ id: competitor.id, value }];
  });
  const values = perSquareMeter.map((entry) => entry.value);
  const medianValue = median(values);
  const low = values.length > 0 ? Math.min(...values) : null;
  const high = values.length > 0 ? Math.max(...values) : null;
  const span = low != null && high != null ? high - low : 0;
  // Tous au même prix au m² : les points se superposent au milieu de l'axe.
  const positionOf = (value: number) => (span > 0 && low != null ? (value - low) / span : 0.5);

  const days = competitors
    .map((competitor) => competitor.daysOnMarket)
    .filter((value): value is number => typeof value === 'number' && value >= 0);
  const medianDays = median(days);
  const dropped = competitors.filter((competitor) => competitor.hasDropped).length;

  return {
    competitorCount: competitors.length,
    medianPricePerSquareMeter: medianValue,
    lowestPrice: prices.length > 0 ? Math.min(...prices) : null,
    highestPrice: prices.length > 0 ? Math.max(...prices) : null,
    medianDaysOnMarket: medianDays == null ? null : Math.round(medianDays),
    droppedCount: dropped > 0 ? dropped : null,
    dots: perSquareMeter
      .map((entry) => ({
        id: entry.id,
        pricePerSquareMeter: entry.value,
        position: positionOf(entry.value),
      }))
      .sort((a, b) => a.pricePerSquareMeter - b.pricePerSquareMeter),
    medianPosition: medianValue == null ? null : positionOf(medianValue),
  };
}
