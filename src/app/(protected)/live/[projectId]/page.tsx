import { notFound } from 'next/navigation';

import { getComparables } from '@/features/comparables/queries/get-comparables';
import { LivePresentationShell } from '@/features/live-presentation/components/live-presentation-shell';
import { getSavedPricePositioning } from '@/features/price-positioning/services/get-saved-price-positioning';
import { getProject } from '@/features/projects/queries/get-project';
import { buildSellerPresentation } from '@/features/seller-presentation/services/build-seller-presentation';
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

  const [property, comparables, savedPositioning] = await Promise.all([
    getSubjectProperty(projectId),
    getComparables(projectId),
    getSavedPricePositioning(projectId),
  ]);

  // Same business entry point as the Builder — Live never rebuilds the content.
  const presentation = buildSellerPresentation({
    project,
    property,
    comparables,
    savedPositioning,
    generatedAt: new Date().toISOString(),
  });

  return <LivePresentationShell projectId={projectId} presentation={presentation} />;
}
