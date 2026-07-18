import type { ComparableSelectionSummary } from '@/features/comparables/types/comparable-selection-summary';

function euro(value: number | null): string {
  return value != null ? `${Math.round(value).toLocaleString('fr-FR')} €` : '—';
}

function squareMeters(value: number | null): string {
  return value != null ? `${value} m²` : '—';
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col rounded border border-zinc-200 p-3 dark:border-zinc-800">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="text-lg font-medium">{value}</span>
    </div>
  );
}

// Presentational only — every value comes from the deterministic summary service.
export function ComparableSelectionSummaryView({
  summary,
}: {
  summary: ComparableSelectionSummary;
}) {
  if (summary.selectedCount === 0) {
    return (
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Synthèse</h2>
        <p className="text-zinc-500">
          Données insuffisantes : retenez au moins un bien concurrent pour calculer la synthèse.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-medium">Synthèse ({summary.selectedCount} retenu(s))</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Stat label="Prix moyen" value={euro(summary.averagePrice)} />
        <Stat label="Prix médian" value={euro(summary.medianPrice)} />
        <Stat label="Prix minimum" value={euro(summary.minimumPrice)} />
        <Stat label="Prix maximum" value={euro(summary.maximumPrice)} />
        <Stat label="Surface moyenne" value={squareMeters(summary.averageSurfaceArea)} />
        <Stat label="Prix moyen au m²" value={euro(summary.averagePricePerSquareMeter)} />
        <Stat label="Prix médian au m²" value={euro(summary.medianPricePerSquareMeter)} />
      </div>
    </section>
  );
}
