import {
  comparisonBadgeClass,
  comparisonValueClass,
  statLabel,
} from '@/features/live-seller/components/live-stage';
import type { ComparisonStatus } from '@/features/live-seller/constants';
import type { FeatureComparison } from '@/features/live-seller/types';

// Colour convention (always the COMPETITOR relative to the seller's property),
// matching Laurent's training — vert = mieux, gris = pareil, orange = moins bien:
//   competitor_advantage -> green         (avantage du concurrent)
//   same                 -> neutral grey  (équivalent)
//   competitor_weakness  -> orange        (faiblesse du concurrent)
//   unknown              -> NOT SHOWN     (filtered out below; the engine still
//                                          produces it for the advisor report)
const STATUS_HINT: Record<ComparisonStatus, string> = {
  same: 'Équivalent',
  competitor_advantage: 'Avantage concurrent',
  competitor_weakness: 'Faiblesse concurrent',
  unknown: 'Non renseigné',
};

export function LiveFeatureComparison({ items }: { items: FeatureComparison[] }) {
  // Product decision (Laurent) : the seller must not see the holes in our data.
  // `unknown` criteria are hidden here — the engine keeps producing them so a
  // later advisor report can say "surface non comparable" without recomputing.
  const visibleItems = items.filter((item) => item.comparisonStatus !== 'unknown');

  if (visibleItems.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <span className={statLabel}>Face à votre bien, critère par critère</span>
        <p className="text-sm text-zinc-500 stage:text-white/60">
          Les critères comparables ne sont pas disponibles pour ce concurrent.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className={statLabel}>Face à votre bien, critère par critère</span>
        <span className="text-xs text-zinc-400 stage:text-white/40">
          <span className="font-semibold text-emerald-600 stage:text-emerald-300">vert</span> =
          avantage du concurrent ·{' '}
          <span className="font-semibold text-zinc-500 stage:text-white/70">gris</span> = équivalent
          · <span className="font-semibold text-amber-600 stage:text-amber-300">orange</span> =
          faiblesse
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
        {visibleItems.map((item) => (
          <div
            key={item.criterion}
            className={`flex flex-col gap-1 rounded-xl border px-3.5 py-2.5 ${comparisonBadgeClass[item.comparisonStatus]}`}
          >
            <dt className="text-[0.68rem] font-semibold tracking-[0.12em] uppercase opacity-70">
              {item.displayLabel}
            </dt>
            <dd className="flex flex-col">
              <span
                className={`font-title text-lg leading-tight ${comparisonValueClass[item.comparisonStatus]}`}
              >
                {item.comparableValue ?? '—'}
              </span>
              <span className="text-[0.68rem] opacity-70">
                {STATUS_HINT[item.comparisonStatus]}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
