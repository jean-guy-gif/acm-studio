import { card, hintText, metaLabel, sectionTitle } from '@/components/ui/styles';
import type { ComparableAnalysis } from '@/features/comparable-analysis/types/comparable-analysis';

function euro(value: number | null): string {
  return value != null ? `${value.toLocaleString('fr-FR')} €` : '—';
}

export function PresentationMarketAnalysis({ analysis }: { analysis: ComparableAnalysis | null }) {
  return (
    <section className={`${card} flex flex-col gap-3 p-5 sm:p-6`}>
      <h2 className={sectionTitle}>Analyse du marché</h2>
      {analysis == null ? (
        <p className={hintText}>Aucun comparable exploitable pour analyser le marché.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <div className={metaLabel}>Comparables</div>
            <div className="font-title text-lg font-semibold text-zinc-900 stage:text-white">
              {analysis.statistics.count}
            </div>
          </div>
          <div>
            <div className={metaLabel}>Prix médian</div>
            <div className="font-title text-lg font-semibold text-zinc-900 stage:text-white">
              {euro(analysis.statistics.medianPrice)}
            </div>
          </div>
          <div>
            <div className={metaLabel}>Prix médian au m²</div>
            <div className="font-title text-lg font-semibold text-zinc-900 stage:text-white">
              {euro(analysis.statistics.medianPricePerSquareMeter)}
            </div>
          </div>
          <div>
            <div className={metaLabel}>Surface médiane</div>
            <div className="font-title text-lg font-semibold text-zinc-900 stage:text-white">
              {analysis.statistics.medianSurfaceArea != null
                ? `${analysis.statistics.medianSurfaceArea} m²`
                : '—'}
            </div>
          </div>
          <div>
            <div className={metaLabel}>Prix min / max</div>
            <div className="font-title text-lg font-semibold text-zinc-900 stage:text-white">
              {euro(analysis.statistics.minimumPrice)} · {euro(analysis.statistics.maximumPrice)}
            </div>
          </div>
          <div>
            <div className={metaLabel}>Comparables atypiques</div>
            <div className="font-title text-lg font-semibold text-zinc-900 stage:text-white">
              {analysis.outliers.length}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
