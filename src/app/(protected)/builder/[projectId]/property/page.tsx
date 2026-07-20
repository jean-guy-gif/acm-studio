import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getProject } from '@/features/projects/queries/get-project';
import { saveSubjectPropertyCondominium } from '@/features/subject-property-condominium/actions/save-subject-property-condominium';
import { CondominiumForm } from '@/features/subject-property-condominium/components/condominium-form';
import { getSubjectPropertyCondominium } from '@/features/subject-property-condominium/services/get-subject-property-condominium';
import { saveSubjectPropertyDiagnostics } from '@/features/subject-property-diagnostics/actions/save-subject-property-diagnostics';
import { DiagnosticsForm } from '@/features/subject-property-diagnostics/components/diagnostics-form';
import { getSubjectPropertyDiagnostics } from '@/features/subject-property-diagnostics/services/get-subject-property-diagnostics';
import { saveSubjectProperty } from '@/features/subject-property/actions/save-subject-property';
import { SubjectPropertyForm } from '@/features/subject-property/components/subject-property-form';
import { getSubjectProperty } from '@/features/subject-property/queries/get-subject-property';

type PropertyPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function PropertyPage({ params }: PropertyPageProps) {
  const { projectId } = await params;

  const project = await getProject(projectId);
  if (!project) {
    notFound();
  }

  const [property, diagnostics, condominium] = await Promise.all([
    getSubjectProperty(projectId),
    getSubjectPropertyDiagnostics(projectId),
    getSubjectPropertyCondominium(projectId),
  ]);
  const save = saveSubjectProperty.bind(null, projectId);
  const saveDiagnostics = saveSubjectPropertyDiagnostics.bind(null, projectId);
  const saveCondominium = saveSubjectPropertyCondominium.bind(null, projectId);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <Link href={`/builder/${projectId}`} className="underline">
          Retour au dossier
        </Link>
        <h1 className="text-2xl font-semibold">Bien vendeur</h1>
        <SubjectPropertyForm property={property} saveAction={save} />
      </div>

      {property ? (
        <>
          <DiagnosticsForm diagnostics={diagnostics} saveAction={saveDiagnostics} />
          <CondominiumForm condominium={condominium} saveAction={saveCondominium} />
        </>
      ) : (
        <p className="text-sm text-zinc-500">
          Enregistrez d’abord le bien vendeur pour renseigner les diagnostics et la copropriété.
        </p>
      )}
    </div>
  );
}
