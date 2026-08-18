import { card, hintText, sectionTitle } from '@/components/ui/styles';
import type { ComparableOutlier } from '@/features/comparable-analysis/types/comparable-analysis';

export function ComparableAnalysisOutliers({ outliers }: { outliers: ComparableOutlier[] }) {
  return (
    <section className={`${card} flex flex-col gap-3 p-5 sm:p-6`}>
      <h2 className={sectionTitle}>Comparables atypiques</h2>
      {outliers.length === 0 ? (
        <p className={hintText}>
          Aucun comparable atypique : tous les prix au m² sont proches de la médiane.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {outliers.map((outlier) => (
            <li
              key={outlier.id}
              className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm font-medium text-amber-800 stage:border-amber-400/30 stage:bg-amber-500/10 stage:text-amber-300"
            >
              <span className="font-medium">ATYPIQUE</span> —{' '}
              {outlier.title?.trim() || 'Bien concurrent'} :{' '}
              {outlier.pricePerSquareMeter.toLocaleString('fr-FR')} €/m² (
              {outlier.deviationPercent > 0 ? '+' : ''}
              {outlier.deviationPercent} % vs médiane{' '}
              {outlier.medianPricePerSquareMeter.toLocaleString('fr-FR')} €/m²)
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
