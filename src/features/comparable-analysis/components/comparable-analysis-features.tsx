import { card, hintText, sectionTitle } from '@/components/ui/styles';
import type { FeatureAnalysis } from '@/features/comparable-analysis/types/comparable-analysis';

export function ComparableAnalysisFeatures({
  featureAnalysis,
}: {
  featureAnalysis: FeatureAnalysis;
}) {
  return (
    <section className={`${card} flex flex-col gap-3 p-5 sm:p-6`}>
      <h2 className={sectionTitle}>Analyse des caractéristiques</h2>
      {featureAnalysis.features.length === 0 ? (
        <p className={hintText}>Aucune caractéristique renseignée sur les biens retenus.</p>
      ) : (
        <ul className="text-sm text-zinc-600 stage:text-white/65">
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
