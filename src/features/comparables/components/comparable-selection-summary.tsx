import { hintText, metaLabel, sectionTitle, softPanel } from '@/components/ui/styles';
import type { ComparableSelectionSummary } from '@/features/comparables/types/comparable-selection-summary';
import { formatEuro, formatSquareMeters } from '@/lib/format';

function euro(value: number | null): string {
  return value != null ? formatEuro(value) : '—';
}

function squareMeters(value: number | null): string {
  return value != null ? formatSquareMeters(value) : '—';
}

export const PRICE_SPREAD_LABEL = 'Plage des prix des concurrents';

// « 598 000 € à 779 000 € », comme « Le marché en un coup d'œil » (M91) ; un seul prix, dit seul.
export function priceSpread(summary: ComparableSelectionSummary): string {
  const { minimumPrice: low, maximumPrice: high } = summary;
  if (low == null || high == null) return '—';
  return low === high ? formatEuro(low) : `${formatEuro(low)} à ${formatEuro(high)}`;
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
          Données insuffisantes&nbsp;: retenez au moins un bien concurrent pour calculer la
          synthèse.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className={sectionTitle}>
        Synthèse{' '}
        <span className="text-base font-medium text-zinc-500 stage:text-white/50">
          · {summary.selectedCount} retenu{summary.selectedCount > 1 ? 's' : ''}
        </span>
      </h2>
      {/* Mission 146 (I5) — trois chiffres : la plage des prix (le nom de la M105 ; « fourchette »
          reste celle du conseiller), le prix médian au m², la surface moyenne. */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <Stat label={PRICE_SPREAD_LABEL} value={priceSpread(summary)} />
        <Stat label="Prix médian au m²" value={euro(summary.medianPricePerSquareMeter)} />
        <Stat label="Surface moyenne" value={squareMeters(summary.averageSurfaceArea)} />
      </div>
    </section>
  );
}
