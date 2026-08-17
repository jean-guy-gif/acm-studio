import {
  formatDeviation,
  POSITION_LABEL,
} from '@/features/price-positioning/components/advisor-price';
import type {
  MarketPosition,
  PriceDeviation,
} from '@/features/price-positioning/types/price-positioning';

const inputClass =
  'rounded-md border border-zinc-300 px-3 py-1.5 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/30 dark:border-zinc-700 dark:bg-zinc-900';

export function SellerPrice({
  price,
  onChange,
  deviationFromCentral,
  deviationFromAdvisor,
  position,
}: {
  price: number | null;
  onChange: (value: number | null) => void;
  deviationFromCentral: PriceDeviation | null;
  deviationFromAdvisor: PriceDeviation | null;
  position: MarketPosition | null;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-medium">Prix souhaité vendeur</h2>
      <label className="flex flex-col gap-1">
        Montant souhaité (facultatif)
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
      {price == null ? (
        <p className="text-sm text-zinc-500">Aucun prix vendeur renseigné.</p>
      ) : (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Écart avec la valeur centrale : {formatDeviation(deviationFromCentral)} · Écart avec le
          prix conseillé : {formatDeviation(deviationFromAdvisor)} · Position :{' '}
          {position ? POSITION_LABEL[position] : '—'}
        </p>
      )}
    </section>
  );
}
