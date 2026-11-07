import { notFound } from 'next/navigation';

import { kickerLabel, pageTitle } from '@/components/ui/styles';
import { AddressDossierBlock } from '@/features/address-dossier/components/address-dossier-block';
import {
  addressDossierView,
  getAddressDossier,
} from '@/features/address-dossier/queries/get-address-dossier';
import { getSavedPricePositioning } from '@/features/price-positioning/services/get-saved-price-positioning';
import { getProject } from '@/features/projects/queries/get-project';
import { getSubjectPropertyCondominium } from '@/features/subject-property-condominium/services/get-subject-property-condominium';
import { getSubjectPropertyDiagnostics } from '@/features/subject-property-diagnostics/services/get-subject-property-diagnostics';
import { importComparableHtml } from '@/features/comparable-import/actions/import-comparable-html';
import { importComparableUrl } from '@/features/comparable-import/actions/import-comparable-url';
import { saveSubjectPropertySheet } from '@/features/subject-property/actions/save-subject-property-sheet';
import { getSubjectProperty } from '@/features/subject-property/queries/get-subject-property';
import {
  depositBrochurePhotos,
  parseBrochureText,
} from '@/features/subject-property-import/actions/import-brochure-pdf';
import { recoverPropertyPhoto } from '@/features/subject-property-import/actions/recover-property-photos';
import { SubjectPropertyImportForm } from '@/features/subject-property-import/components/subject-property-import-form';
import { updatePropertyPhotos } from '@/features/subject-property-photos/actions/update-property-photos';
import { uploadPropertyPhotos } from '@/features/subject-property-photos/actions/upload-property-photos';
import { getPropertyPhotos } from '@/features/subject-property-photos/services/get-property-photos';
import { importDemoSubjectListing } from '@/features/demo/actions/import-demo-subject';
import {
  demoBrochureChoices,
  demoSubjectListingChoices,
} from '@/features/demo/services/demo-choices';
import { isDemoAgency } from '@/features/demo/services/is-demo-agency';
import { getProfile } from '@/lib/auth/get-profile';

// Mission 141 — « Construire le dossier d'adresse » lit six sources publiques, dont les fichiers
// de ventes des communes voisines (mesuré le 07/11 : 3 s à Paris 15e, 6 s à Vence, 13 s à
// Boulogne-Billancourt) ; la limite de Vercel, gardée large.
export const maxDuration = 300;

type PropertyPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function PropertyPage({ params }: PropertyPageProps) {
  const { projectId } = await params;

  const project = await getProject(projectId);
  if (!project) {
    notFound();
  }

  const [property, diagnostics, condominium, photos, saved, loadedDossier] = await Promise.all([
    getSubjectProperty(projectId),
    getSubjectPropertyDiagnostics(projectId),
    getSubjectPropertyCondominium(projectId),
    getPropertyPhotos(projectId),
    getSavedPricePositioning(projectId),
    getAddressDossier(projectId),
  ]);
  // Mission 141 — le dossier d'adresse, sur l'adresse ENREGISTRÉE du bien (jamais la saisie en
  // cours) ; l'analyse de valeur enregistrée seulement (décision du 07/11).
  const addressDossier = addressDossierView(loadedDossier, property);
  // Mission 114 — l'agence de démonstration : « Importer une annonce » lit le jeu de données (même
  // signature, action liée par la page), les annonces des scénarios sont proposées d'avance, et la
  // fiche PDF de démonstration est à un clic. Décidé sur le repère de l'agence, lu en base.
  const demo = await isDemoAgency((await getProfile())?.agency_id);
  const save = saveSubjectPropertySheet.bind(null, projectId);
  const uploadPhotos = uploadPropertyPhotos.bind(null, projectId);
  const updatePhotos = updatePropertyPhotos.bind(null, projectId);
  const importFromUrl = demo
    ? importDemoSubjectListing.bind(null, projectId)
    : importComparableUrl.bind(null, projectId);
  const importFromHtml = importComparableHtml.bind(null, projectId);
  const recoverPhoto = recoverPropertyPhoto.bind(null, projectId);
  const depositBrochure = depositBrochurePhotos.bind(null, projectId);

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-2">
        {/* « ← Retour au dossier » vit dans la barre d'enregistrement : il enregistre avant de
            partir (mission 77). */}
        <span className={kickerLabel}>Dossier · {project.seller_name}</span>
        <h1 className={pageTitle}>Bien vendeur</h1>
      </div>

      <SubjectPropertyImportForm
        property={property}
        saveAction={save}
        photos={photos}
        uploadPhotosAction={uploadPhotos}
        updatePhotosAction={updatePhotos}
        importAction={importFromUrl}
        importHtmlAction={importFromHtml}
        recoverAction={recoverPhoto}
        parseBrochureAction={parseBrochureText}
        depositBrochureAction={depositBrochure}
        diagnostics={diagnostics}
        condominium={condominium}
        findHref={`/builder/${projectId}/comparables/find`}
        backHref={`/builder/${projectId}`}
        projectId={projectId}
        demoListings={demo ? demoSubjectListingChoices() : null}
        demoBrochures={demo ? demoBrochureChoices() : null}
      />

      <AddressDossierBlock
        projectId={projectId}
        view={addressDossier}
        advisorAnalysis={saved?.advisorComparativeMarketPrice ?? null}
        surface={property?.surface_area ?? null}
        energyRating={property?.energy_rating ?? null}
      />
    </div>
  );
}
