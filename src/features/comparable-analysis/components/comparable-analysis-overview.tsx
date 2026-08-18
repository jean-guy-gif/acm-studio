import { card, hintText, metaLabel, sectionTitle, softPanel } from '@/components/ui/styles';
import type {
  ComparableStatistics,
  SellerComparison,
} from '@/features/comparable-analysis/types/comparable-analysis';

function euro(value: number | null): string {
  return value != null ? `${value.toLocaleString('fr-FR')} €` : '—';
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

export function ComparableAnalysisOverview({
  statistics,
  sellerComparison,
}: {
  statistics: ComparableStatistics;
  sellerComparison: SellerComparison;
}) {
  return (
    <>
      <section className={`${card} flex flex-col gap-3 p-5 sm:p-6`}>
        <h2 className={sectionTitle}>Statistiques générales ({statistics.count})</h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          <Stat label="Prix moyen" value={euro(statistics.averagePrice)} />
          <Stat label="Prix médian" value={euro(statistics.medianPrice)} />
          <Stat label="Prix minimum" value={euro(statistics.minimumPrice)} />
          <Stat label="Prix maximum" value={euro(statistics.maximumPrice)} />
          <Stat label="Prix moyen au m²" value={euro(statistics.averagePricePerSquareMeter)} />
          <Stat label="Prix médian au m²" value={euro(statistics.medianPricePerSquareMeter)} />
          <Stat label="Surface moyenne" value={squareMeters(statistics.averageSurfaceArea)} />
          <Stat label="Surface médiane" value={squareMeters(statistics.medianSurfaceArea)} />
        </div>
      </section>

      <section className={`${card} flex flex-col gap-3 p-5 sm:p-6`}>
        <h2 className={sectionTitle}>Positionnement du bien vendeur</h2>
        {sellerComparison.hasSellerSurface ? (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Stat
              label="Écart moyen de surface"
              value={squareMeters(sellerComparison.averageSurfaceDifference)}
            />
            <Stat
              label="Écart médian de surface"
              value={squareMeters(sellerComparison.medianSurfaceDifference)}
            />
            <Stat label="Biens plus petits" value={String(sellerComparison.smallerCount)} />
            <Stat label="Biens plus grands" value={String(sellerComparison.largerCount)} />
          </div>
        ) : (
          <p className={hintText}>
            Surface du bien vendeur inconnue : le positionnement ne peut pas être calculé.
          </p>
        )}
      </section>
    </>
  );
}
