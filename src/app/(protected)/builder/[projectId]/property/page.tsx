import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getProject } from '@/features/projects/queries/get-project';
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

  const property = await getSubjectProperty(projectId);
  const save = saveSubjectProperty.bind(null, projectId);

  return (
    <div className="flex flex-col gap-4">
      <Link href={`/builder/${projectId}`} className="underline">
        Retour au dossier
      </Link>
      <h1 className="text-2xl font-semibold">Bien vendeur</h1>
      <SubjectPropertyForm property={property} saveAction={save} />
    </div>
  );
}
