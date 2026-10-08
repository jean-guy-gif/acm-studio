import { notFound } from 'next/navigation';

import { kickerLabel, pageTitle } from '@/components/ui/styles';
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

type PropertyPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function PropertyPage({ params }: PropertyPageProps) {
  const { projectId } = await params;

  const project = await getProject(projectId);
  if (!project) {
    notFound();
  }

  const [property, diagnostics, condominium, photos] = await Promise.all([
    getSubjectProperty(projectId),
    getSubjectPropertyDiagnostics(projectId),
    getSubjectPropertyCondominium(projectId),
    getPropertyPhotos(projectId),
  ]);
  const save = saveSubjectPropertySheet.bind(null, projectId);
  const uploadPhotos = uploadPropertyPhotos.bind(null, projectId);
  const updatePhotos = updatePropertyPhotos.bind(null, projectId);
  const importFromUrl = importComparableUrl.bind(null, projectId);
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
      />
    </div>
  );
}
