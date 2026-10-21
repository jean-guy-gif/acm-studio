import Link from 'next/link';
import { notFound } from 'next/navigation';

import { backLink, kickerLabel, pageTitle } from '@/components/ui/styles';
import { updateComparable } from '@/features/comparables/actions/update-comparable';
import { EditComparableForm } from '@/features/comparables/components/edit-comparable-form';
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

      <EditComparableForm
        projectId={projectId}
        comparable={comparable}
        action={update}
        initialError={error ?? null}
      />
    </div>
  );
}
