import Link from 'next/link';
import { notFound } from 'next/navigation';

import { backLink, btnSecondary, hintText, kickerLabel, pageTitle } from '@/components/ui/styles';

import { ComparableAnalysisEnergy } from '@/features/comparable-analysis/components/comparable-analysis-energy';
import { ComparableAnalysisFeatures } from '@/features/comparable-analysis/components/comparable-analysis-features';
import { ComparableAnalysisLocation } from '@/features/comparable-analysis/components/comparable-analysis-location';
import { ComparableAnalysisOutliers } from '@/features/comparable-analysis/components/comparable-analysis-outliers';
import { ComparableAnalysisOverview } from '@/features/comparable-analysis/components/comparable-analysis-overview';
import { ComparableAnalysisPrices } from '@/features/comparable-analysis/components/comparable-analysis-prices';
import { ComparableAnalysisSurfaces } from '@/features/comparable-analysis/components/comparable-analysis-surfaces';
import { calculateComparableAnalysis } from '@/features/comparable-analysis/services/calculate-comparable-analysis';
import { getComparables } from '@/features/comparables/queries/get-comparables';
import { getProject } from '@/features/projects/queries/get-project';
import { getSubjectProperty } from '@/features/subject-property/queries/get-subject-property';

type AnalysisPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ComparablesAnalysisPage({ params }: AnalysisPageProps) {
  const { projectId } = await params;

  const project = await getProject(projectId);
  if (!project) {
    notFound();
  }

  const [comparables, subjectProperty] = await Promise.all([
    getComparables(projectId),
    getSubjectProperty(projectId),
  ]);

  // Deterministic, computed on the fly — nothing is persisted.
  const analysis = calculateComparableAnalysis(comparables, subjectProperty?.surface_area ?? null);

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Link href={`/builder/${projectId}/comparables`} className={backLink}>
            ← Retour aux biens concurrents
          </Link>
          <span className={kickerLabel}>Dossier · {project.seller_name}</span>
          <h1 className={pageTitle}>Analyse des comparables</h1>
        </div>
        <Link href={`/builder/${projectId}/comparables/positioning`} className={btnSecondary}>
          Voir le positionnement →
        </Link>
      </div>

      {analysis.statistics.count === 0 ? (
        <p className={hintText}>
          Aucun comparable retenu avec un prix et une surface : l’analyse ne peut pas être produite.
        </p>
      ) : (
        <>
          <ComparableAnalysisOverview
            statistics={analysis.statistics}
            sellerComparison={analysis.sellerComparison}
          />
          <ComparableAnalysisPrices priceAnalysis={analysis.priceAnalysis} />
          <ComparableAnalysisSurfaces surfaceAnalysis={analysis.surfaceAnalysis} />
          <ComparableAnalysisFeatures featureAnalysis={analysis.featureAnalysis} />
          <ComparableAnalysisEnergy
            dpeAnalysis={analysis.dpeAnalysis}
            gesAnalysis={analysis.gesAnalysis}
          />
          <ComparableAnalysisLocation locationAnalysis={analysis.locationAnalysis} />
          <ComparableAnalysisOutliers outliers={analysis.outliers} />
        </>
      )}
    </div>
  );
}
