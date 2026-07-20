import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getComparables } from '@/features/comparables/queries/get-comparables';
import { getSavedPricePositioning } from '@/features/price-positioning/services/get-saved-price-positioning';
import { getProject } from '@/features/projects/queries/get-project';
import { PresentationComparables } from '@/features/seller-presentation/components/presentation-comparables';
import { PresentationMarketAnalysis } from '@/features/seller-presentation/components/presentation-market-analysis';
import { PresentationPositioning } from '@/features/seller-presentation/components/presentation-positioning';
import { PresentationProperty } from '@/features/seller-presentation/components/presentation-property';
import { PresentationReadiness } from '@/features/seller-presentation/components/presentation-readiness';
import { PresentationSectionCard } from '@/features/seller-presentation/components/presentation-section-card';
import { PresentationWarnings } from '@/features/seller-presentation/components/presentation-warnings';
import { buildSellerPresentation } from '@/features/seller-presentation/services/build-seller-presentation';
import { getSubjectPropertyCondominium } from '@/features/subject-property-condominium/services/get-subject-property-condominium';
import { getSubjectPropertyDiagnostics } from '@/features/subject-property-diagnostics/services/get-subject-property-diagnostics';
import { getSubjectProperty } from '@/features/subject-property/queries/get-subject-property';

type PresentationPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function SellerPresentationPage({ params }: PresentationPageProps) {
  const { projectId } = await params;

  // Access control: getProject is scoped to the caller's agency and returns null
  // for a foreign or missing project.
  const project = await getProject(projectId);
  if (!project) {
    notFound();
  }

  const [property, comparables, savedPositioning, diagnostics, condominium] = await Promise.all([
    getSubjectProperty(projectId),
    getComparables(projectId),
    getSavedPricePositioning(projectId),
    getSubjectPropertyDiagnostics(projectId),
    getSubjectPropertyCondominium(projectId),
  ]);

  // Single business entry point — generated on the fly, nothing persisted.
  const presentation = buildSellerPresentation({
    project,
    property,
    diagnostics,
    condominium,
    comparables,
    savedPositioning,
    generatedAt: new Date().toISOString(),
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href={`/builder/${projectId}/comparables/positioning`} className="underline">
          Retour au positionnement
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Présentation vendeur</h1>
        <p className="text-xs text-zinc-500">
          Aperçu de préparation (version {presentation.version}). Cette page vérifie la matière
          préparée ; elle ne remplace pas encore le mode Live.
        </p>
        <Link
          href={`/live/${projectId}`}
          className="mt-2 inline-block rounded border border-zinc-300 px-3 py-1.5 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Ouvrir dans Live
        </Link>
      </div>

      {/* 1. Readiness */}
      <PresentationReadiness
        status={presentation.status}
        sections={presentation.sections}
        warnings={presentation.warnings}
      />

      {/* 2. Sections overview */}
      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">Aperçu des sections</h2>
        <div className="flex flex-col gap-2">
          {presentation.sections.map((section) => (
            <PresentationSectionCard key={section.key} section={section} />
          ))}
        </div>
      </section>

      {/* 3. Property */}
      <PresentationProperty property={presentation.property} />

      {/* 4. Comparables */}
      <PresentationComparables comparables={presentation.comparables} />

      {/* 5. Market analysis */}
      <PresentationMarketAnalysis analysis={presentation.marketAnalysis} />

      {/* 6. Positioning */}
      <PresentationPositioning
        current={presentation.currentPositioning}
        saved={presentation.savedPositioning}
        positioningStatus={presentation.positioningStatus}
      />

      {/* 7. Warnings */}
      <PresentationWarnings warnings={presentation.warnings} />
    </div>
  );
}
