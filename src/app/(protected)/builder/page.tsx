import Link from 'next/link';

import { SubmitButton } from '@/components/submit-button';
import {
  alertError,
  badgeNeutral,
  badgeSelected,
  btnDangerGhost,
  btnPrimary,
  btnSecondary,
  card,
  emptyState,
  kickerLabel,
  pageSubtitle,
  pageTitle,
} from '@/components/ui/styles';
import { deleteProject } from '@/features/projects/actions/delete-project';
import {
  declareProjectReady,
  revertProjectToPreparation,
} from '@/features/projects/actions/set-project-readiness';
import { getPreparationDossiers } from '@/features/projects/queries/get-preparation-dossiers';
import {
  advancementSteps,
  fourchetteLabel,
  propertyLabel,
} from '@/features/projects/services/preparation-card';

type BuilderPageProps = {
  searchParams: Promise<{ error?: string; prets?: string }>;
};

const tab = 'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors';
const tabActive = `${tab} bg-brand text-white`;
const tabIdle = `${tab} text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 stage:text-white/55 stage:hover:bg-white/10`;

export default async function BuilderPage({ searchParams }: BuilderPageProps) {
  const { error, prets } = await searchParams;
  const ready = prets === '1';
  const dossiers = await getPreparationDossiers(ready);

  return (
    <div className="flex flex-col gap-6 md:gap-8">
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
                fourchette validée) : il basculera tout seul ici et dans le Live.
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
                    <span className="font-title text-xl font-semibold text-zinc-900 stage:text-white">
                      {project.seller_name}
                    </span>
                    <span className={ready ? badgeSelected : badgeNeutral}>
                      {ready ? 'Prêt pour le rendez-vous' : 'En préparation'}
                    </span>
                  </div>

                  {/* Le bien — jamais inventé : rien ne s'affiche s'il n'est pas saisi. */}
                  {bien ? (
                    <span className="text-sm font-medium text-zinc-700 stage:text-white/80">
                      {bien}
                    </span>
                  ) : (
                    <span className="text-sm text-zinc-400 italic stage:text-white/45">
                      Bien vendeur non renseigné
                    </span>
                  )}

                  {/* La fourchette du conseiller — écran conseiller, jamais le vendeur. */}
                  <span className="text-sm text-zinc-500 stage:text-white/60">
                    {fourchetteText ? (
                      <>Fourchette conseiller : {fourchetteText}</>
                    ) : (
                      <span className="text-amber-700 stage:text-amber-300">
                        Fourchette non saisie
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
                            : 'text-zinc-400 stage:text-white/45'
                        }
                      >
                        {step.done ? `${step.label} ✓` : `${step.label} — à compléter`}
                      </span>
                    ))}
                  </div>

                  <span className="text-xs text-zinc-400 stage:text-white/40">
                    {project.seller_email || 'E-mail non renseigné'} ·{' '}
                    {project.seller_phone || 'Téléphone non renseigné'} · Créé le{' '}
                    {new Date(project.created_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Link href={`/builder/${project.id}`} className={btnSecondary}>
                    Ouvrir le dossier
                  </Link>
                  {ready ? (
                    <form action={revertProjectToPreparation}>
                      <input type="hidden" name="projectId" value={project.id} />
                      <SubmitButton pendingLabel="…" className={btnDangerGhost}>
                        Remettre en préparation
                      </SubmitButton>
                    </form>
                  ) : (
                    <>
                      <form action={declareProjectReady}>
                        <input type="hidden" name="projectId" value={project.id} />
                        <SubmitButton pendingLabel="…" className={btnSecondary}>
                          Déclarer prêt
                        </SubmitButton>
                      </form>
                      <form action={deleteProject}>
                        <input type="hidden" name="projectId" value={project.id} />
                        <SubmitButton pendingLabel="Suppression…" className={btnDangerGhost}>
                          Supprimer
                        </SubmitButton>
                      </form>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
