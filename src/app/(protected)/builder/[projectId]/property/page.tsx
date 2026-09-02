import Link from 'next/link';
import { notFound } from 'next/navigation';

import { backLink, hintText, kickerLabel, pageTitle } from '@/components/ui/styles';
import { getProject } from '@/features/projects/queries/get-project';
import { saveSubjectPropertyCondominium } from '@/features/subject-property-condominium/actions/save-subject-property-condominium';
import { CondominiumForm } from '@/features/subject-property-condominium/components/condominium-form';
import { getSubjectPropertyCondominium } from '@/features/subject-property-condominium/services/get-subject-property-condominium';
import { saveSubjectPropertyDiagnostics } from '@/features/subject-property-diagnostics/actions/save-subject-property-diagnostics';
import { DiagnosticsForm } from '@/features/subject-property-diagnostics/components/diagnostics-form';
import { getSubjectPropertyDiagnostics } from '@/features/subject-property-diagnostics/services/get-subject-property-diagnostics';
import { importComparableHtml } from '@/features/comparable-import/actions/import-comparable-html';
import { importComparableUrl } from '@/features/comparable-import/actions/import-comparable-url';
import { saveSubjectProperty } from '@/features/subject-property/actions/save-subject-property';
import { getSubjectProperty } from '@/features/subject-property/queries/get-subject-property';
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
  const save = saveSubjectProperty.bind(null, projectId);
  const saveDiagnostics = saveSubjectPropertyDiagnostics.bind(null, projectId);
  const saveCondominium = saveSubjectPropertyCondominium.bind(null, projectId);
  const uploadPhotos = uploadPropertyPhotos.bind(null, projectId);
  const updatePhotos = updatePropertyPhotos.bind(null, projectId);
  const importFromUrl = importComparableUrl.bind(null, projectId);
  const importFromHtml = importComparableHtml.bind(null, projectId);
  const recoverPhoto = recoverPropertyPhoto.bind(null, projectId);

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-2">
        <Link href={`/builder/${projectId}`} className={backLink}>
          ← Retour au dossier
        </Link>
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
        findHref={`/builder/${projectId}/comparables/find`}
      />

      {property ? (
        <>
          <DiagnosticsForm diagnostics={diagnostics} saveAction={saveDiagnostics} />
          <CondominiumForm condominium={condominium} saveAction={saveCondominium} />
        </>
      ) : (
        <p className={hintText}>
          Enregistrez d’abord le bien vendeur pour renseigner les diagnostics et la copropriété.
        </p>
      )}
    </div>
  );
}
