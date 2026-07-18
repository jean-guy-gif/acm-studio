import Link from 'next/link';
import { notFound } from 'next/navigation';

import { importComparableUrl } from '@/features/comparable-import/actions/import-comparable-url';
import { createComparable } from '@/features/comparables/actions/create-comparable';
import { getProject } from '@/features/projects/queries/get-project';

import { NewComparablePanel } from './new-comparable-panel';

type NewComparablePageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function NewComparablePage({ params }: NewComparablePageProps) {
  const { projectId } = await params;

  const project = await getProject(projectId);
  if (!project) {
    notFound();
  }

  const create = createComparable.bind(null, projectId);
  const importAction = importComparableUrl.bind(null, projectId);

  return (
    <div className="flex flex-col gap-4">
      <Link href={`/builder/${projectId}/comparables`} className="underline">
        Retour aux biens concurrents
      </Link>
      <h1 className="text-2xl font-semibold">Ajouter un bien concurrent</h1>
      <NewComparablePanel createAction={create} importAction={importAction} />
    </div>
  );
}
