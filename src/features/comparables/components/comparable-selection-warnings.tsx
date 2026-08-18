import { sectionTitle } from '@/components/ui/styles';
import type { ComparableSelectionWarning } from '@/features/comparables/types/comparable-selection-summary';

// Presentational only — warnings are produced by the deterministic service.
export function ComparableSelectionWarningsView({
  warnings,
}: {
  warnings: ComparableSelectionWarning[];
}) {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className={sectionTitle}>Alertes</h2>
      <ul className="flex flex-col gap-1.5">
        {warnings.map((warning, index) => (
          <li
            key={`${warning.type}-${warning.comparableId ?? index}`}
            role="alert"
            className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm font-medium text-amber-800 stage:border-amber-400/30 stage:bg-amber-500/10 stage:text-amber-300"
          >
            {warning.message}
          </li>
        ))}
      </ul>
    </section>
  );
}
