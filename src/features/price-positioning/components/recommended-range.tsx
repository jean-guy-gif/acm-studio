import { card, metaLabel, sectionTitle, softPanel } from '@/components/ui/styles';
import type {
  DispersionLevel,
  RecommendedRange,
} from '@/features/price-positioning/types/price-positioning';

const DISPERSION_LABEL: Record<DispersionLevel, string> = {
  low: 'Faible',
  medium: 'Moyenne',
  high: 'Forte',
};

function euro(value: number): string {
  return `${value.toLocaleString('fr-FR')} €`;
}

export function RecommendedRangeView({
  range,
  usedCount,
}: {
  range: RecommendedRange;
  usedCount: number;
}) {
  return (
    <section className={`${card} flex flex-col gap-3 p-5 sm:p-6`}>
      <h2 className={sectionTitle}>Fourchette recommandée</h2>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <div className={`${softPanel} flex flex-col gap-0.5 p-3.5`}>
          <span className={metaLabel}>Borne basse</span>
          <span className="font-title text-xl font-semibold whitespace-nowrap text-zinc-900 stage:text-white">
            {euro(range.low)}
          </span>
        </div>
        <div className="flex flex-col gap-0.5 rounded-xl border border-brand/30 bg-brand-soft p-3.5 stage:border-brand/40 stage:bg-brand/15">
          <span className="text-[0.7rem] font-semibold tracking-[0.14em] uppercase text-brand-deep/70 stage:text-brand">
            Valeur centrale
          </span>
          <span className="font-title text-2xl font-bold whitespace-nowrap text-brand-deep stage:text-white">
            {euro(range.central)}
          </span>
        </div>
        <div className={`${softPanel} flex flex-col gap-0.5 p-3.5`}>
          <span className={metaLabel}>Borne haute</span>
          <span className="font-title text-xl font-semibold whitespace-nowrap text-zinc-900 stage:text-white">
            {euro(range.high)}
          </span>
        </div>
      </div>
      <p className="text-sm text-zinc-600 stage:text-white/65">
        Dispersion : {DISPERSION_LABEL[range.dispersion]} (±{range.widthPercentage} %) · {usedCount}{' '}
        comparable{usedCount > 1 ? 's' : ''} utilisé{usedCount > 1 ? 's' : ''}
      </p>
    </section>
  );
}
