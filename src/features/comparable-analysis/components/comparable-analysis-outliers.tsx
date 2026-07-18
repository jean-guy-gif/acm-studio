import type { ComparableOutlier } from '@/features/comparable-analysis/types/comparable-analysis';

export function ComparableAnalysisOutliers({ outliers }: { outliers: ComparableOutlier[] }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-medium">Comparables atypiques</h2>
      {outliers.length === 0 ? (
        <p className="text-zinc-500">
          Aucun comparable atypique : tous les prix au m² sont proches de la médiane.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {outliers.map((outlier) => (
            <li
              key={outlier.id}
              className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
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
