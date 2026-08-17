import Link from 'next/link';
import { notFound } from 'next/navigation';

import { deleteComparable } from '@/features/comparables/actions/delete-comparable';
import { moveSelectedComparable } from '@/features/comparables/actions/move-selected-comparable';
import { toggleComparableSelection } from '@/features/comparables/actions/toggle-comparable-selection';
import { ComparableSelectionSummaryView } from '@/features/comparables/components/comparable-selection-summary';
import { ComparableSelectionWarningsView } from '@/features/comparables/components/comparable-selection-warnings';
import { RejectedComparablesList } from '@/features/comparables/components/rejected-comparables-list';
import { SelectedComparablesList } from '@/features/comparables/components/selected-comparables-list';
import { getComparables } from '@/features/comparables/queries/get-comparables';
import { calculateComparableSummary } from '@/features/comparables/services/calculate-comparable-summary';
import { getProject } from '@/features/projects/queries/get-project';
import { getSubjectProperty } from '@/features/subject-property/queries/get-subject-property';

type ComparablesPageProps = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function ComparablesPage({ params, searchParams }: ComparablesPageProps) {
  const { projectId } = await params;

  const project = await getProject(projectId);
  if (!project) {
    notFound();
  }

  const [comparables, subjectProperty, { error }] = await Promise.all([
    getComparables(projectId),
    getSubjectProperty(projectId),
    searchParams,
  ]);

  // Recomputed on every render → the summary always reflects the current
  // selection (no client state to keep in sync).
  const summary = calculateComparableSummary(comparables);
  const selected = comparables.filter((comparable) => comparable.is_selected);
  const rejected = comparables.filter((comparable) => !comparable.is_selected);
  const subjectSurfaceArea = subjectProperty?.surface_area ?? null;

  const toggleAction = toggleComparableSelection.bind(null, projectId);
  const moveAction = moveSelectedComparable.bind(null, projectId);
  const deleteAction = deleteComparable.bind(null, projectId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/builder/${projectId}`}
          className="text-sm font-medium text-brand underline-offset-2 transition-colors hover:text-brand-deep"
        >
          Retour au dossier
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Biens concurrents</h1>
      </div>

      {error ? <p role="alert">{error}</p> : null}

      {comparables.length === 0 ? (
        <div className="flex flex-col gap-1 text-zinc-500">
          <p>Aucun bien concurrent.</p>
          <p>Ajoutez les biens actuellement en concurrence avec le bien du vendeur.</p>
        </div>
      ) : (
        <>
          <ComparableSelectionSummaryView summary={summary} />
          <ComparableSelectionWarningsView warnings={summary.warnings} />
          <SelectedComparablesList
            comparables={selected}
            projectId={projectId}
            subjectSurfaceArea={subjectSurfaceArea}
            toggleAction={toggleAction}
            moveAction={moveAction}
            deleteAction={deleteAction}
          />
          <RejectedComparablesList
            comparables={rejected}
            projectId={projectId}
            subjectSurfaceArea={subjectSurfaceArea}
            toggleAction={toggleAction}
            deleteAction={deleteAction}
          />
        </>
      )}

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/builder/${projectId}/comparables/new`}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Ajouter un bien concurrent
        </Link>
        <Link
          href={`/builder/${projectId}/comparables/find`}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Trouver des concurrents
        </Link>
        <Link
          href={`/builder/${projectId}/comparables/analysis`}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Voir l’analyse
        </Link>
      </div>
    </div>
  );
}
