import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  backLink,
  btnPrimary,
  kickerLabel,
  pageSubtitle,
  pageTitle,
  sectionTitle,
} from '@/components/ui/styles';

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
import { getPropertyPhotos } from '@/features/subject-property-photos/services/get-property-photos';

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

  const [property, comparables, savedPositioning, diagnostics, condominium, propertyPhotos] =
    await Promise.all([
      getSubjectProperty(projectId),
      getComparables(projectId),
      getSavedPricePositioning(projectId),
      getSubjectPropertyDiagnostics(projectId),
      getSubjectPropertyCondominium(projectId),
      getPropertyPhotos(projectId),
    ]);

  // The subject property's photo_urls are PRIVATE storage paths (Mission 37):
  // sign them here (getPropertyPhotos reuses signPropertyPhotos) so the pure,
  // synchronous builder receives ready-to-display URLs.
  const propertyPhotoUrls = propertyPhotos
    .map((photo) => photo.url)
    .filter((url): url is string => url !== null);

  // Single business entry point — generated on the fly, nothing persisted.
  const presentation = buildSellerPresentation({
    project,
    property,
    diagnostics,
    condominium,
    comparables,
    savedPositioning,
    generatedAt: new Date().toISOString(),
    propertyPhotoUrls,
  });

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Link href={`/builder/${projectId}/comparables/positioning`} className={backLink}>
            ← Retour au positionnement
          </Link>
          <span className={kickerLabel}>Dossier · {presentation.project.name}</span>
          <h1 className={pageTitle}>Présentation vendeur</h1>
          <p className={pageSubtitle}>
            Aperçu de préparation (version {presentation.version}) : vérifiez la matière avant le
            rendez-vous.
          </p>
        </div>
        <Link href={`/live/${projectId}`} className={btnPrimary}>
          Lancer le Live →
        </Link>
      </div>

      {/* 1. Readiness */}
      <PresentationReadiness
        status={presentation.status}
        sections={presentation.sections}
        warnings={presentation.warnings}
      />

      {/* 2. Sections overview */}
      <section className="flex flex-col gap-3">
        <h2 className={sectionTitle}>Aperçu des sections</h2>
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
