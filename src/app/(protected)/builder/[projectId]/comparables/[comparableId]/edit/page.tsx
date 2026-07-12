import Link from 'next/link';
import { notFound } from 'next/navigation';

import { updateComparable } from '@/features/comparables/actions/update-comparable';
import { ComparableFormFields } from '@/features/comparables/comparable-form-fields';
import { getComparable } from '@/features/comparables/queries/get-comparable';

type EditComparablePageProps = {
  params: Promise<{ projectId: string; comparableId: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function EditComparablePage({
  params,
  searchParams,
}: EditComparablePageProps) {
  const { projectId, comparableId } = await params;

  const comparable = await getComparable(projectId, comparableId);
  if (!comparable) {
    notFound();
  }

  const { error } = await searchParams;
  const update = updateComparable.bind(null, projectId, comparableId);

  return (
    <div className="flex flex-col gap-4">
      <Link href={`/builder/${projectId}/comparables`} className="underline">
        Retour aux biens concurrents
      </Link>
      <h1 className="text-2xl font-semibold">Modifier le bien concurrent</h1>
      {error ? <p role="alert">{error}</p> : null}
      <form action={update} className="flex max-w-xl flex-col gap-3">
        <ComparableFormFields comparable={comparable} />
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
