import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  alertError,
  backLink,
  btnSecondary,
  emptyState,
  kickerLabel,
  link,
  pageTitle,
} from '@/components/ui/styles';
import {
  bulkDeleteComparables,
  bulkRejectComparables,
} from '@/features/comparables/actions/bulk-comparable-actions';
import { deleteComparable } from '@/features/comparables/actions/delete-comparable';
import { moveSelectedComparable } from '@/features/comparables/actions/move-selected-comparable';
import { toggleComparableSelection } from '@/features/comparables/actions/toggle-comparable-selection';
import { ComparableSelectionSummaryView } from '@/features/comparables/components/comparable-selection-summary';
import { ComparableSelectionWarningsView } from '@/features/comparables/components/comparable-selection-warnings';
import { RejectedComparablesList } from '@/features/comparables/components/rejected-comparables-list';
import { SelectedComparablesList } from '@/features/comparables/components/selected-comparables-list';
import { DpeCountLine } from '@/features/dpe/components/dpe-count-line';
import { getComparables } from '@/features/comparables/queries/get-comparables';
import { calculateComparableSummary } from '@/features/comparables/services/calculate-comparable-summary';
import { BasculeBanner } from '@/features/projects/components/bascule-banner';
import { PendingImportsBanner } from '@/features/competitor-search/components/pending-imports-banner';
import { getPendingImports } from '@/features/competitor-search/queries/get-pending-imports';
import { isLiveOrderFrozen } from '@/features/live-seller/queries/is-live-order-frozen';
import { getProject } from '@/features/projects/queries/get-project';
import { nextDossierAction } from '@/features/projects/services/dossier-steps';
import { evaluateProjectReadiness } from '@/features/projects/services/project-readiness';
import { listingIdentityKey } from '@/features/comparable-import/utils/extract-listing-key';
import { getOppositions } from '@/features/prospecting/queries/get-oppositions';
import { opposedOn, oppositionBadge } from '@/features/prospecting/services/opposition';
import { createClient } from '@/lib/supabase/server';
import { getSubjectProperty } from '@/features/subject-property/queries/get-subject-property';

type ComparablesPageProps = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ error?: string; bascule?: string }>;
};

export default async function ComparablesPage({ params, searchParams }: ComparablesPageProps) {
  const { projectId } = await params;

  const project = await getProject(projectId);
  if (!project) {
    notFound();
  }

  const [comparables, subjectProperty, { error, bascule }] = await Promise.all([
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
  // Mission 146 (I5) — l'étape suivante du dossier, celle du bouton plein de l'en-tête (M110) :
  // quand c'est déjà « Chercher les concurrents », « Trouver des concurrents » ne la répète pas.
  const readiness = await evaluateProjectReadiness(
    await createClient(),
    projectId,
    project.agency_id,
  );
  const searchIsNextStep =
    nextDossierAction(projectId, {
      status: project.status,
      hasProperty: readiness.hasProperty,
      exploitableCount: readiness.exploitableCount,
      hasDecision: readiness.hasPositioning,
      liveStarted: project.live_started_at != null,
      liveEnded: project.live_ended_at != null,
      documentOnly: project.live_presentation_mode === 'document',
    }).key === 'competitors';
  // Mission 110 — une fois le Live commencé, l'ordre des concurrents est figé.
  const orderFrozen = await isLiveOrderFrozen(await createClient(), project);

  // Mission 98 — une adresse de la liste « Ne plus solliciter » de l'agence le dit dès la
  // préparation d'un nouveau dossier, partout où elle apparaît.
  const oppositions = await getOppositions(await createClient(), project.agency_id);
  const oppositionNotes: Record<string, string> = {};
  for (const comparable of selected) {
    const requestedOn = opposedOn(
      {
        address: comparable.locator_address,
        listingKey: listingIdentityKey(comparable.listing_url),
      },
      oppositions,
    );
    if (requestedOn != null) {
      oppositionNotes[comparable.id] = oppositionBadge(requestedOn);
    }
  }

  const toggleAction = toggleComparableSelection.bind(null, projectId);
  const moveAction = moveSelectedComparable.bind(null, projectId);
  const deleteAction = deleteComparable.bind(null, projectId);
  const rejectSelectedAction = bulkRejectComparables.bind(null, projectId);
  const deleteSelectedAction = bulkDeleteComparables.bind(null, projectId);

  // Mission 101 — les biens retenus dont l'import n'a pas abouti : jamais perdus, toujours dits.
  const pendingImports = await getPendingImports(projectId);

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <PendingImportsBanner projectId={projectId} pending={pendingImports} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Link href={`/builder/${projectId}`} className={backLink}>
            ← Retour au dossier
          </Link>
          <span className={kickerLabel}>Dossier · {project.seller_name}</span>
          <h1 className={pageTitle}>Biens concurrents</h1>
        </div>
        {/* Mission 146 (I5) — le seul plein est le bouton d'étape suivante, au-dessus (M110) ;
            « Avant le rendez-vous » est dans la barre des étapes. */}
        <div className="flex flex-wrap items-center gap-3">
          {searchIsNextStep ? null : (
            <Link href={`/builder/${projectId}/comparables/find`} className={btnSecondary}>
              Trouver des concurrents
            </Link>
          )}
          <Link href={`/builder/${projectId}/comparables/new`} className={link}>
            Ajouter un bien
          </Link>
        </div>
      </div>

      {bascule === '1' ? <BasculeBanner projectId={projectId} /> : null}

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
            oppositionNotes={oppositionNotes}
            toggleAction={toggleAction}
            moveAction={moveAction}
            deleteAction={deleteAction}
            rejectSelectedAction={rejectSelectedAction}
            deleteSelectedAction={deleteSelectedAction}
            orderFrozen={orderFrozen}
          />
          <DpeCountLine energyRatings={selected.map((comparable) => comparable.energy_rating)} />
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
