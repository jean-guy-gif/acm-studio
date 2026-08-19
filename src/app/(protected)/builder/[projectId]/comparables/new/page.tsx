import Link from 'next/link';
import { notFound } from 'next/navigation';

import { backLink, kickerLabel, pageTitle } from '@/components/ui/styles';
import { importComparableHtml } from '@/features/comparable-import/actions/import-comparable-html';
import { importComparableUrl } from '@/features/comparable-import/actions/import-comparable-url';
import { createComparable } from '@/features/comparables/actions/create-comparable';
import { getProject } from '@/features/projects/queries/get-project';

import { NewComparablePanel } from './new-comparable-panel';

type NewComparablePageProps = {
  params: Promise<{ projectId: string }>;
  // `assistant=1` : la page de l'annonce a été envoyée depuis le navigateur du
  // conseiller (raccourci « Envoyer vers ACM Studio ») et attend d'être analysée.
  searchParams: Promise<{ importUrl?: string; assistant?: string }>;
};

export default async function NewComparablePage({ params, searchParams }: NewComparablePageProps) {
  const { projectId } = await params;
  const { importUrl, assistant } = await searchParams;

  const project = await getProject(projectId);
  if (!project) {
    notFound();
  }

  const create = createComparable.bind(null, projectId);
  const importAction = importComparableUrl.bind(null, projectId);
  const importHtmlAction = importComparableHtml.bind(null, projectId);

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-2">
        <Link href={`/builder/${projectId}/comparables`} className={backLink}>
          ← Retour aux biens concurrents
        </Link>
        <span className={kickerLabel}>Dossier · {project.seller_name}</span>
        <h1 className={pageTitle}>Ajouter un bien concurrent</h1>
      </div>
      <NewComparablePanel
        createAction={create}
        importAction={importAction}
        importHtmlAction={importHtmlAction}
        initialUrl={typeof importUrl === 'string' ? importUrl : undefined}
        fromAssistant={assistant === '1'}
      />
    </div>
  );
}
