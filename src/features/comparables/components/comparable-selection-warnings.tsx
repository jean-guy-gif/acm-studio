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
      <h2 className="text-lg font-medium">Alertes</h2>
      <ul className="flex flex-col gap-1">
        {warnings.map((warning, index) => (
          <li
            key={`${warning.type}-${warning.comparableId ?? index}`}
            role="alert"
            className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
          >
            {warning.message}
          </li>
        ))}
      </ul>
    </section>
  );
}
