import { card, fieldLabel, hintText, inputBase, sectionTitle } from '@/components/ui/styles';
import {
  formatDeviation,
  POSITION_LABEL,
} from '@/features/price-positioning/components/advisor-price';
import type {
  MarketPosition,
  PriceDeviation,
} from '@/features/price-positioning/types/price-positioning';

const inputClass = inputBase;

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
    <section className={`${card} flex flex-col gap-3 p-5 sm:p-6`}>
      <h2 className={sectionTitle}>Prix souhaité vendeur</h2>
      <label className="flex flex-col gap-1.5">
        <span className={fieldLabel}>Montant souhaité (facultatif)</span>
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
        {/* Mission 89 — ce montant est rappelé au vendeur : le conseiller le sait en le saisissant. */}
        <span className="text-xs font-medium text-amber-700 stage:text-amber-300">
          Affiché au vendeur à la fin du Live
        </span>
      </label>
      {price == null ? (
        <p className={hintText}>Aucun prix vendeur renseigné.</p>
      ) : (
        <p className="text-sm text-zinc-600 stage:text-white/65">
          Écart avec la valeur centrale : {formatDeviation(deviationFromCentral)} · Écart avec le
          prix des concurrents : {formatDeviation(deviationFromAdvisor)} · Position :{' '}
          {position ? POSITION_LABEL[position] : '—'}
        </p>
      )}
    </section>
  );
}
