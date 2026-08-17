import Link from 'next/link';
import { notFound } from 'next/navigation';

import { importComparableHtml } from '@/features/comparable-import/actions/import-comparable-html';
import { importComparableUrl } from '@/features/comparable-import/actions/import-comparable-url';
import { createComparable } from '@/features/comparables/actions/create-comparable';
import { getProject } from '@/features/projects/queries/get-project';

import { NewComparablePanel } from './new-comparable-panel';

type NewComparablePageProps = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ importUrl?: string }>;
};

export default async function NewComparablePage({ params, searchParams }: NewComparablePageProps) {
  const { projectId } = await params;
  const { importUrl } = await searchParams;

  const project = await getProject(projectId);
  if (!project) {
    notFound();
  }

  const create = createComparable.bind(null, projectId);
  const importAction = importComparableUrl.bind(null, projectId);
  const importHtmlAction = importComparableHtml.bind(null, projectId);

  return (
    <div className="flex flex-col gap-4">
      <Link href={`/builder/${projectId}/comparables`} className="underline">
        Retour aux biens concurrents
      </Link>
      <h1 className="text-2xl font-semibold">Ajouter un bien concurrent</h1>
      <NewComparablePanel
        createAction={create}
        importAction={importAction}
        importHtmlAction={importHtmlAction}
        initialUrl={typeof importUrl === 'string' ? importUrl : undefined}
      />
    </div>
  );
}
