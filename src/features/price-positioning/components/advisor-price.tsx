import { card, fieldLabel, inputBase, sectionTitle } from '@/components/ui/styles';
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

const inputClass = inputBase;

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
    <section className={`${card} flex flex-col gap-3 p-5 sm:p-6`}>
      <h2 className={sectionTitle}>Prix conseillé</h2>
      <label className="flex flex-col gap-1.5">
        <span className={fieldLabel}>Montant conseillé</span>
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
      <p className="text-sm text-zinc-600 stage:text-white/65">
        Écart avec la valeur centrale : {formatDeviation(deviationFromCentral)} · Position :{' '}
        {position ? POSITION_LABEL[position] : '—'}
      </p>
    </section>
  );
}
