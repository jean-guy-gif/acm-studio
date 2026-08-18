import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SubmitButton } from '@/components/submit-button';
import { alertError, backLink, card, kickerLabel, pageTitle } from '@/components/ui/styles';
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
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-2">
        <Link href={`/builder/${projectId}/comparables`} className={backLink}>
          ← Retour aux biens concurrents
        </Link>
        <span className={kickerLabel}>Bien concurrent</span>
        <h1 className={pageTitle}>Modifier le bien</h1>
      </div>

      {error ? (
        <p role="alert" className={alertError}>
          {error}
        </p>
      ) : null}

      <form
        action={update}
        className={`${card} grid w-full max-w-3xl grid-cols-1 gap-4 p-5 sm:grid-cols-2 sm:p-6`}
      >
        <ComparableFormFields comparable={comparable} />
        <SubmitButton
          pendingLabel="Enregistrement…"
          className="mt-2 self-start justify-self-start sm:col-span-2"
        >
          Enregistrer les modifications
        </SubmitButton>
      </form>
    </div>
  );
}
