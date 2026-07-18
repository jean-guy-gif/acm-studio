import type { ComparableAnalysis } from '@/features/comparable-analysis/types/comparable-analysis';

function euro(value: number | null): string {
  return value != null ? `${value.toLocaleString('fr-FR')} €` : '—';
}

export function PresentationMarketAnalysis({ analysis }: { analysis: ComparableAnalysis | null }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-medium">Analyse du marché</h2>
      {analysis == null ? (
        <p className="text-zinc-500">Aucun comparable exploitable pour analyser le marché.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <div className="text-xs text-zinc-500">Comparables</div>
            <div className="font-medium">{analysis.statistics.count}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-500">Prix médian</div>
            <div className="font-medium">{euro(analysis.statistics.medianPrice)}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-500">Prix médian au m²</div>
            <div className="font-medium">{euro(analysis.statistics.medianPricePerSquareMeter)}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-500">Surface médiane</div>
            <div className="font-medium">
              {analysis.statistics.medianSurfaceArea != null
                ? `${analysis.statistics.medianSurfaceArea} m²`
                : '—'}
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-500">Prix min / max</div>
            <div className="font-medium">
              {euro(analysis.statistics.minimumPrice)} · {euro(analysis.statistics.maximumPrice)}
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-500">Comparables atypiques</div>
            <div className="font-medium">{analysis.outliers.length}</div>
          </div>
        </div>
      )}
    </section>
  );
}
