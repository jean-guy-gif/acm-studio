import type { PositioningFreshness } from '@/features/price-positioning/types/saved-price-positioning';

export function PositioningStatus({ freshness }: { freshness: PositioningFreshness }) {
  const isUpToDate = freshness === 'up_to_date';
  return (
    <span
      className={
        isUpToDate
          ? 'inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-sm font-medium text-emerald-700 stage:border-emerald-400/30 stage:bg-emerald-500/10 stage:text-emerald-300'
          : 'inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-sm font-medium text-amber-700 stage:border-amber-400/30 stage:bg-amber-500/10 stage:text-amber-300'
      }
    >
      {isUpToDate ? 'À jour' : 'À actualiser'}
    </span>
  );
}
