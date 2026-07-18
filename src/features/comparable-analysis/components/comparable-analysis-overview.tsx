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
    <div className="flex flex-col rounded border border-zinc-200 p-3 dark:border-zinc-800">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="text-lg font-medium">{value}</span>
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
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Statistiques générales ({statistics.count})</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
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

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Positionnement du bien vendeur</h2>
        {sellerComparison.hasSellerSurface ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
          <p className="text-zinc-500">
            Surface du bien vendeur inconnue : le positionnement ne peut pas être calculé.
          </p>
        )}
      </section>
    </>
  );
}
