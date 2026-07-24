import type { ComparisonStatus } from '@/features/live-seller/constants';
import type { FeatureComparison } from '@/features/live-seller/types';

// Colour convention (always the COMPETITOR relative to the seller's property):
//   same                 -> black / bold  (équivalent)
//   competitor_advantage -> green         (avantage du concurrent)
//   competitor_weakness  -> orange        (faiblesse du concurrent)
//   unknown              -> neutral grey  (donnée absente)
const STATUS_CLASS: Record<ComparisonStatus, string> = {
  same: 'font-bold text-zinc-900 dark:text-zinc-100',
  competitor_advantage: 'font-medium text-emerald-600 dark:text-emerald-400',
  competitor_weakness: 'font-medium text-amber-600 dark:text-amber-400',
  unknown: 'text-zinc-400 dark:text-zinc-500',
};

const STATUS_HINT: Record<ComparisonStatus, string> = {
  same: 'Équivalent',
  competitor_advantage: 'Avantage concurrent',
  competitor_weakness: 'Faiblesse concurrent',
  unknown: 'Non renseigné',
};

export function LiveFeatureComparison({ items }: { items: FeatureComparison[] }) {
  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div
          key={item.criterion}
          className="flex items-baseline justify-between gap-3 rounded border border-zinc-200 px-3 py-2 dark:border-zinc-800"
        >
          <dt className="text-sm text-zinc-500">{item.displayLabel}</dt>
          <dd className="flex flex-col items-end text-right">
            <span className={STATUS_CLASS[item.comparisonStatus]}>
              {item.comparableValue ?? '—'}
            </span>
            <span className="text-xs text-zinc-400">{STATUS_HINT[item.comparisonStatus]}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
