import { hintText, metaLabel, sectionTitle, softPanel } from '@/components/ui/styles';
import type { ComparableSelectionSummary } from '@/features/comparables/types/comparable-selection-summary';

function euro(value: number | null): string {
  return value != null ? `${Math.round(value).toLocaleString('fr-FR')} €` : '—';
}

function squareMeters(value: number | null): string {
  return value != null ? `${value} m²` : '—';
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${softPanel} flex flex-col gap-0.5 p-3.5`}>
      <span className={metaLabel}>{label}</span>
      <span className="font-title text-xl font-semibold whitespace-nowrap text-zinc-900 stage:text-white">
        {value}
      </span>
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
        <h2 className={sectionTitle}>Synthèse</h2>
        <p className={hintText}>
          Données insuffisantes : retenez au moins un bien concurrent pour calculer la synthèse.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className={sectionTitle}>
        Synthèse{' '}
        <span className="text-base font-medium text-zinc-400 stage:text-white/50">
          · {summary.selectedCount} retenu{summary.selectedCount > 1 ? 's' : ''}
        </span>
      </h2>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
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
