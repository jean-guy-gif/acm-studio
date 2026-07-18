import type { FeatureAnalysis } from '@/features/comparable-analysis/types/comparable-analysis';

export function ComparableAnalysisFeatures({
  featureAnalysis,
}: {
  featureAnalysis: FeatureAnalysis;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-medium">Analyse des caractéristiques</h2>
      {featureAnalysis.features.length === 0 ? (
        <p className="text-zinc-500">Aucune caractéristique renseignée sur les biens retenus.</p>
      ) : (
        <ul className="text-sm text-zinc-600 dark:text-zinc-400">
          {featureAnalysis.features.map((feature) => (
            <li key={feature.label}>
              {feature.label} : {feature.count} / {featureAnalysis.total}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
