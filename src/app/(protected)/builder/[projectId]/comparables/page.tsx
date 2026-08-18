import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  alertError,
  backLink,
  btnPrimary,
  btnSecondary,
  emptyState,
  kickerLabel,
  pageTitle,
} from '@/components/ui/styles';
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
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Link href={`/builder/${projectId}`} className={backLink}>
            ← Retour au dossier
          </Link>
          <span className={kickerLabel}>Dossier · {project.seller_name}</span>
          <h1 className={pageTitle}>Biens concurrents</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/builder/${projectId}/comparables/new`} className={btnPrimary}>
            Ajouter un bien
          </Link>
          <Link href={`/builder/${projectId}/comparables/find`} className={btnSecondary}>
            Trouver des concurrents
          </Link>
          <Link href={`/builder/${projectId}/comparables/analysis`} className={btnSecondary}>
            Voir l’analyse
          </Link>
        </div>
      </div>

      {error ? (
        <p role="alert" className={alertError}>
          {error}
        </p>
      ) : null}

      {comparables.length === 0 ? (
        <div className={emptyState}>
          <p className="font-title text-lg font-semibold text-zinc-700 stage:text-white/85">
            Aucun bien concurrent.
          </p>
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
    </div>
  );
}
