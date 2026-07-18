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
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-medium">Fourchette recommandée</h2>
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col rounded border border-zinc-200 p-3 dark:border-zinc-800">
          <span className="text-xs text-zinc-500">Borne basse</span>
          <span className="text-lg font-medium">{euro(range.low)}</span>
        </div>
        <div className="flex flex-col rounded border border-zinc-300 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900">
          <span className="text-xs text-zinc-500">Valeur centrale</span>
          <span className="text-lg font-semibold">{euro(range.central)}</span>
        </div>
        <div className="flex flex-col rounded border border-zinc-200 p-3 dark:border-zinc-800">
          <span className="text-xs text-zinc-500">Borne haute</span>
          <span className="text-lg font-medium">{euro(range.high)}</span>
        </div>
      </div>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Dispersion : {DISPERSION_LABEL[range.dispersion]} (±{range.widthPercentage} %) · {usedCount}{' '}
        comparable{usedCount > 1 ? 's' : ''} utilisé{usedCount > 1 ? 's' : ''}
      </p>
    </section>
  );
}
