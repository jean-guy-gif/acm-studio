import 'server-only';

import { getComparables } from '@/features/comparables/queries/get-comparables';
import {
  getLiveComparableResponses,
  getLiveSellerSummary,
} from '@/features/live-seller/queries/get-live-seller-data';
import { getSavedPricePositioning } from '@/features/price-positioning/services/get-saved-price-positioning';
import { getProject } from '@/features/projects/queries/get-project';
import { LIVE_SIGNED_URL_TTL_SECONDS } from '@/features/subject-property-photos/constants';
import { buildSellerPresentation } from '@/features/seller-presentation/services/build-seller-presentation';
import type { SellerPresentation } from '@/features/seller-presentation/types/seller-presentation';
import { getSubjectPropertyCondominium } from '@/features/subject-property-condominium/services/get-subject-property-condominium';
import { getSubjectPropertyDiagnostics } from '@/features/subject-property-diagnostics/services/get-subject-property-diagnostics';
import { getPropertyPhotos } from '@/features/subject-property-photos/services/get-property-photos';
import { getSubjectProperty } from '@/features/subject-property/queries/get-subject-property';

// MISSION 51 — le SEUL chargement de la présentation Live, partagé par la route (qui en
// PROJETTE une charge neutre pour le vendeur) et par la voie de livraison (qui en tire un
// fragment autorisé). La donnée complète — prix concurrents, fourchette conseiller — ne
// vit qu'ICI, côté serveur ; ce qui atteint le navigateur passe d'abord par la projection
// ou par une autorisation gardée. Accès contrôlé : getProject est cadré sur l'agence de
// l'appelant et renvoie null pour un dossier étranger ou absent.
// Mission 144 — `scene` : la scène du Live, dont les photos du bien sont signées pour tout le
// rendez-vous (3 h) ; `reveal` : une révélation, qui ne livre qu'un concurrent ou la fourchette —
// ni les photos du bien (aucune signature demandée au stockage), ni les diagnostics, ni la
// copropriété, qu'elle ne livre pas.
export type LivePresentationUse = 'default' | 'scene' | 'reveal';

export async function loadLivePresentation(
  projectId: string,
  use: LivePresentationUse = 'default',
): Promise<SellerPresentation | null> {
  const project = await getProject(projectId);
  if (!project) {
    return null;
  }

  const [
    property,
    comparables,
    savedPositioning,
    diagnostics,
    condominium,
    sellerResponses,
    sellerSummary,
    propertyPhotos,
  ] = await Promise.all([
    getSubjectProperty(projectId),
    getComparables(projectId),
    getSavedPricePositioning(projectId),
    use === 'reveal' ? null : getSubjectPropertyDiagnostics(projectId),
    use === 'reveal' ? null : getSubjectPropertyCondominium(projectId),
    getLiveComparableResponses(projectId),
    getLiveSellerSummary(projectId),
    use === 'reveal'
      ? []
      : getPropertyPhotos(projectId, use === 'scene' ? LIVE_SIGNED_URL_TTL_SECONDS : undefined),
  ]);

  const propertyPhotoUrls = propertyPhotos
    .map((photo) => photo.url)
    .filter((url): url is string => url !== null);

  return buildSellerPresentation({
    project,
    property,
    diagnostics,
    condominium,
    comparables,
    savedPositioning,
    sellerResponses,
    sellerSummary,
    generatedAt: new Date().toISOString(),
    propertyPhotoUrls,
  });
}
