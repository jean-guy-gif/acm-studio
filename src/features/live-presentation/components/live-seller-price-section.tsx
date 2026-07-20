import {
  calculatePriceDeviation,
  resolveMarketPosition,
} from '@/features/price-positioning/services/calculate-price-deviation';
import type {
  MarketPosition,
  PriceDeviation,
} from '@/features/price-positioning/types/price-positioning';
import type { SavedPricePositioning } from '@/features/price-positioning/types/saved-price-positioning';

const POSITION_LABEL: Record<MarketPosition, string> = {
  below_observed_market: 'Sous le marché observé',
  within_observed_market: 'Dans le marché observé',
  above_observed_market: 'Au-dessus du marché observé',
};

function euro(value: number | null): string {
  return value != null ? `${value.toLocaleString('fr-FR')} €` : '—';
}

function deviation(label: string, value: PriceDeviation | null) {
  if (value == null) {
    return null;
  }
  const absolute = `${value.absolute > 0 ? '+' : ''}${value.absolute.toLocaleString('fr-FR')} €`;
  const percentage =
    value.percentage != null ? ` (${value.percentage > 0 ? '+' : ''}${value.percentage} %)` : '';
  return (
    <p className="text-lg">
      {label} : {absolute}
      {percentage}
    </p>
  );
}

// Read-only. Shown only when a valid seller price is recorded. Non-judgemental
// wording (a price is "au-dessus du marché observé", never "irréaliste"). Reuses
// the Mission 17 pure deviation helpers — no rule duplicated.
export function LiveSellerPriceSection({ saved }: { saved: SavedPricePositioning | null }) {
  const sellerPrice = saved?.sellerPrice ?? null;
  if (saved == null || sellerPrice == null || sellerPrice <= 0) {
    return (
      <p className="text-lg text-zinc-500">Aucun prix souhaité par le vendeur n’est renseigné.</p>
    );
  }

  const position = resolveMarketPosition(sellerPrice, saved.rangeLow, saved.rangeHigh);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="text-sm text-zinc-500">Prix souhaité par le vendeur</div>
        <div className="text-3xl font-semibold">{euro(sellerPrice)}</div>
      </div>

      {deviation(
        'Écart avec le prix conseillé',
        calculatePriceDeviation(sellerPrice, saved.advisorPrice),
      )}
      {deviation(
        'Écart avec la valeur centrale',
        calculatePriceDeviation(sellerPrice, saved.rangeCentral),
      )}

      {position ? (
        <p className="text-lg font-medium">Position : {POSITION_LABEL[position]}</p>
      ) : null}
    </div>
  );
}
