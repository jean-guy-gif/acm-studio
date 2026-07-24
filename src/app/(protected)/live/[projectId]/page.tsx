import { notFound } from 'next/navigation';

import { getComparables } from '@/features/comparables/queries/get-comparables';
import { LiveComparativeShell } from '@/features/live-seller/components/live-comparative-shell';
import {
  getLiveComparableResponses,
  getLiveSellerSummary,
} from '@/features/live-seller/queries/get-live-seller-data';
import { getSavedPricePositioning } from '@/features/price-positioning/services/get-saved-price-positioning';
import { getProject } from '@/features/projects/queries/get-project';
import { buildSellerPresentation } from '@/features/seller-presentation/services/build-seller-presentation';
import { getSubjectPropertyCondominium } from '@/features/subject-property-condominium/services/get-subject-property-condominium';
import { getSubjectPropertyDiagnostics } from '@/features/subject-property-diagnostics/services/get-subject-property-diagnostics';
import { getSubjectProperty } from '@/features/subject-property/queries/get-subject-property';

type LivePageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function LiveProjectPage({ params }: LivePageProps) {
  const { projectId } = await params;

  // Access control: getProject is scoped to the caller's agency (via getProfile)
  // and returns null for a foreign or missing project → 404 (repo convention).
  const project = await getProject(projectId);
  if (!project) {
    notFound();
  }

  const [
    property,
    comparables,
    savedPositioning,
    diagnostics,
    condominium,
    sellerResponses,
    sellerSummary,
  ] = await Promise.all([
    getSubjectProperty(projectId),
    getComparables(projectId),
    getSavedPricePositioning(projectId),
    getSubjectPropertyDiagnostics(projectId),
    getSubjectPropertyCondominium(projectId),
    getLiveComparableResponses(projectId),
    getLiveSellerSummary(projectId),
  ]);

  // Same business entry point as the Builder — Live never rebuilds the content.
  const presentation = buildSellerPresentation({
    project,
    property,
    diagnostics,
    condominium,
    comparables,
    savedPositioning,
    sellerResponses,
    sellerSummary,
    generatedAt: new Date().toISOString(),
  });

  return <LiveComparativeShell projectId={projectId} presentation={presentation} />;
}
