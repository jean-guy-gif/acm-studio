import type {
  MarketPosition,
  PriceDeviation,
} from '@/features/price-positioning/types/price-positioning';

export const POSITION_LABEL: Record<MarketPosition, string> = {
  below_observed_market: 'Sous le marché observé',
  within_observed_market: 'Dans le marché observé',
  above_observed_market: 'Au-dessus du marché observé',
};

export function formatDeviation(deviation: PriceDeviation | null): string {
  if (deviation == null) {
    return '—';
  }
  const absolute = `${deviation.absolute > 0 ? '+' : ''}${deviation.absolute.toLocaleString('fr-FR')} €`;
  if (deviation.percentage == null) {
    return absolute;
  }
  return `${absolute} (${deviation.percentage > 0 ? '+' : ''}${deviation.percentage} %)`;
}

const inputClass =
  'rounded-md border border-zinc-300 px-3 py-1.5 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/30 dark:border-zinc-700 dark:bg-zinc-900';

export function AdvisorPrice({
  price,
  onChange,
  deviationFromCentral,
  position,
}: {
  price: number | null;
  onChange: (value: number | null) => void;
  deviationFromCentral: PriceDeviation | null;
  position: MarketPosition | null;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-medium">Prix conseillé</h2>
      <label className="flex flex-col gap-1">
        Montant conseillé
        <input
          type="number"
          min={0}
          step="any"
          value={price ?? ''}
          onChange={(event) => {
            const raw = event.target.value.trim();
            onChange(raw === '' ? null : Number(raw));
          }}
          className={inputClass}
        />
      </label>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Écart avec la valeur centrale : {formatDeviation(deviationFromCentral)} · Position :{' '}
        {position ? POSITION_LABEL[position] : '—'}
      </p>
    </section>
  );
}
