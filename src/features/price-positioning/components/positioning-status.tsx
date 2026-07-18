import type { PositioningFreshness } from '@/features/price-positioning/types/saved-price-positioning';

export function PositioningStatus({ freshness }: { freshness: PositioningFreshness }) {
  const isUpToDate = freshness === 'up_to_date';
  return (
    <span
      className={
        isUpToDate
          ? 'inline-block rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
          : 'inline-block rounded border border-amber-300 bg-amber-50 px-2 py-1 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200'
      }
    >
      {isUpToDate ? 'À jour' : 'À actualiser'}
    </span>
  );
}
