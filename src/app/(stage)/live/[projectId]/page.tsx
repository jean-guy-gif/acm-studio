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
  // « fiche » : index de la fiche courante, écrit par la présentation elle-même
  // pour permettre de reprendre au bon endroit après un rechargement en plein
  // rendez-vous. Valeur invalide ou absente = on ouvre à l'introduction.
  searchParams: Promise<{ fiche?: string }>;
};

// Index d'ouverture demandé par l'URL. Volontairement tolérant : jamais d'erreur
// affichée au vendeur pour un paramètre douteux, on retombe sur l'introduction.
// Le borne haute est appliquée par la présentation (nombre réel de fiches).
function parseInitialIndex(raw: string | undefined): number {
  const parsed = Number.parseInt(raw ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

export default async function LiveProjectPage({ params, searchParams }: LivePageProps) {
  const { projectId } = await params;
  const { fiche } = await searchParams;

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

  return (
    <LiveComparativeShell
      projectId={projectId}
      presentation={presentation}
      initialIndex={parseInitialIndex(fiche)}
    />
  );
}
