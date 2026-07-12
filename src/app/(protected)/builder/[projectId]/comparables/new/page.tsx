import Link from 'next/link';
import { notFound } from 'next/navigation';

import { createComparable } from '@/features/comparables/actions/create-comparable';
import { ComparableFormFields } from '@/features/comparables/comparable-form-fields';
import { getProject } from '@/features/projects/queries/get-project';

type NewComparablePageProps = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function NewComparablePage({ params, searchParams }: NewComparablePageProps) {
  const { projectId } = await params;

  const project = await getProject(projectId);
  if (!project) {
    notFound();
  }

  const { error } = await searchParams;
  const create = createComparable.bind(null, projectId);

  return (
    <div className="flex flex-col gap-4">
      <Link href={`/builder/${projectId}/comparables`} className="underline">
        Retour aux biens concurrents
      </Link>
      <h1 className="text-2xl font-semibold">Ajouter un bien concurrent</h1>
      {error ? <p role="alert">{error}</p> : null}
      <form action={create} className="flex max-w-xl flex-col gap-3">
        <ComparableFormFields />
        <button
          type="submit"
          className="rounded border border-zinc-300 px-3 py-1.5 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Enregistrer
        </button>
      </form>
    </div>
  );
}
