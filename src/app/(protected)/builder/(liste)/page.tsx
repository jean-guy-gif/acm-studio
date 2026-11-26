import Link from 'next/link';

import { SellerTabs } from '@/components/app-shell/seller-tabs';
import {
  alertError,
  badgeNeutral,
  badgeSelected,
  btnPrimary,
  card,
  emptyState,
  kickerLabel,
  link,
  pageSubtitle,
  pageTitle,
} from '@/components/ui/styles';
import { pendingImportsNotice } from '@/features/live-seller/services/live-launch';
import { archiveProjectAction } from '@/features/projects/actions/archive-project';
import {
  declareProjectReady,
  revertProjectToPreparation,
} from '@/features/projects/actions/set-project-readiness';
import { nextDossierAction } from '@/features/projects/services/dossier-steps';
import { ExampleBadge } from '@/features/welcome/components/example-badge';
import { PreparationCardActions } from '@/features/projects/components/preparation-card-actions';
import { getPreparationDossiers } from '@/features/projects/queries/get-preparation-dossiers';
import {
  advancementSteps,
  fourchetteLabel,
  FOURCHETTE_LABEL,
  FOURCHETTE_PENDING,
  missingForReady,
  pendingImportLabel,
  propertyLabel,
} from '@/features/projects/services/preparation-card';
import { formatRelativeDay } from '@/lib/format';

type BuilderPageProps = {
  searchParams: Promise<{ error?: string; prets?: string }>;
};

const tab = 'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors';
// Mission 146 — l'onglet choisi en bleu clair : le seul plein de l'écran est « Nouveau dossier ».
const tabActive = `${tab} bg-brand-soft font-semibold text-brand-deep stage:bg-white/10 stage:text-white`;
const tabIdle = `${tab} text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 stage:text-white/55 stage:hover:bg-white/10`;

export default async function BuilderPage({ searchParams }: BuilderPageProps) {
  const { error, prets } = await searchParams;
  const ready = prets === '1';
  const dossiers = await getPreparationDossiers(ready);

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <SellerTabs current="/builder" />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className={kickerLabel}>Dossiers vendeurs</span>
          <h1 className={pageTitle}>Préparation</h1>
          <p className={pageSubtitle}>
            {ready
              ? 'Dossiers prêts : ils sont dans le Live, et restent modifiables ici.'
              : 'Préparez ici vos rendez-vous vendeurs. Un dossier complet bascule tout seul dans le Live.'}
          </p>
        </div>
        <Link href="/builder/new" className={btnPrimary}>
          Nouveau dossier vendeur
        </Link>
      </div>

      <div className="flex items-center gap-1.5">
        <Link href="/builder" className={ready ? tabIdle : tabActive}>
          En cours
        </Link>
        <Link href="/builder?prets=1" className={ready ? tabActive : tabIdle}>
          Prêts
        </Link>
      </div>

      {error ? (
        <p role="alert" className={alertError}>
          {error}
        </p>
      ) : null}

      {dossiers.length === 0 ? (
        <div className={emptyState}>
          {ready ? (
            <>
              <p className="font-title text-lg font-semibold text-zinc-700 stage:text-white/85">
                Aucun dossier prêt.
              </p>
              <p>
                Complétez un dossier (bien vendeur, au moins trois concurrents exploitables et
                décision de prix enregistrée) : il basculera tout seul ici et dans le Live.
              </p>
            </>
          ) : (
            <>
              <p className="font-title text-lg font-semibold text-zinc-700 stage:text-white/85">
                Aucun dossier en cours.
              </p>
              <p>Créez un dossier pour préparer un rendez-vous vendeur.</p>
              <Link href="/builder/new" className={`${btnPrimary} mt-3`}>
                Créer un dossier
              </Link>
            </>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {dossiers.map(({ project, property, fourchette, readiness }) => {
            const bien = propertyLabel(property);
            const fourchetteText = fourchetteLabel(fourchette);
            return (
              <li
                key={project.id}
                className={`${card} flex flex-col gap-4 p-4 transition-colors hover:border-brand sm:flex-row sm:items-center sm:justify-between sm:p-5 stage:hover:border-brand`}
              >
                <div className="flex min-w-0 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Mission 146 — le nom mène à la Vue d'ensemble ; le bouton, à l'étape à faire. */}
                    <Link
                      href={`/builder/${project.id}`}
                      className="font-title text-xl font-semibold text-zinc-900 hover:text-brand-deep stage:text-white"
                    >
                      {project.seller_name}
                    </Link>
                    <span className={ready ? badgeSelected : badgeNeutral}>
                      {ready ? 'Prêt pour le rendez-vous' : 'En préparation'}
                    </span>
                    {project.is_example ? <ExampleBadge /> : null}
                  </div>

                  {/* Le bien — jamais inventé : rien ne s'affiche s'il n'est pas saisi. */}
                  {bien ? (
                    <span className="text-sm font-medium text-zinc-700 stage:text-white/80">
                      {bien}
                    </span>
                  ) : (
                    <span className="text-sm text-zinc-500 italic stage:text-white/45">
                      Bien vendeur non renseigné
                    </span>
                  )}

                  {/* Mission 108 — la fourchette du conseiller (M38), jamais montrée au vendeur.
                      « Décision de prix » ne désigne que le prix décidé, dans l'avancement. */}
                  <span className="text-sm text-zinc-500 stage:text-white/60">
                    {FOURCHETTE_LABEL} :{' '}
                    {fourchetteText ?? (
                      <span className="text-amber-700 stage:text-amber-300">
                        {FOURCHETTE_PENDING}
                      </span>
                    )}
                  </span>

                  {/* L'avancement NOMMÉ : ce qui est fait, ce qui manque. */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    {advancementSteps(readiness).map((step) => (
                      <span
                        key={step.label}
                        className={
                          step.done
                            ? 'font-medium text-emerald-700 stage:text-emerald-300'
                            : 'text-zinc-500 stage:text-white/45'
                        }
                      >
                        {step.done ? `${step.label} ✓` : `${step.label} — à compléter`}
                      </span>
                    ))}
                    {/* Mission 108 — un retenu qui attend son import retient le dossier. */}
                    {pendingImportLabel(readiness.pendingImportCount) ? (
                      <span
                        className="font-medium text-amber-700 stage:text-amber-300"
                        data-testid="pending-import-count"
                      >
                        {pendingImportLabel(readiness.pendingImportCount)}
                      </span>
                    ) : null}
                  </div>

                  {/* Mission 112 — rappelé près de « Déclarer prêt », sans le bloquer (M52). */}
                  {!ready && pendingImportsNotice(readiness.pendingImportCount) ? (
                    <span
                      className="text-xs font-medium text-amber-700 stage:text-amber-300"
                      data-testid="ready-pending-imports"
                    >
                      {pendingImportsNotice(readiness.pendingImportCount)} —{' '}
                      <Link href={`/builder/${project.id}/comparables`} className={link}>
                        voir les concurrents
                      </Link>
                    </span>
                  ) : null}

                  <span className="text-xs text-zinc-500 stage:text-white/40">
                    {project.seller_email || 'E-mail non renseigné'} ·{' '}
                    {project.seller_phone || 'Téléphone non renseigné'} · Créé{' '}
                    {formatRelativeDay(project.created_at)}
                  </span>
                </div>

                <PreparationCardActions
                  projectId={project.id}
                  projectName={project.seller_name}
                  ready={ready}
                  next={nextDossierAction(project.id, {
                    status: project.status,
                    hasProperty: readiness.hasProperty,
                    exploitableCount: readiness.exploitableCount,
                    hasDecision: readiness.hasPositioning,
                    liveStarted: project.live_started_at != null,
                    liveEnded: project.live_ended_at != null,
                    documentOnly: project.live_presentation_mode === 'document',
                  })}
                  missing={missingForReady(readiness)}
                  declareReady={declareProjectReady}
                  revertToPreparation={revertProjectToPreparation}
                  archive={archiveProjectAction}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
