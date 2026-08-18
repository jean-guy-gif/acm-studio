import Link from 'next/link';

import { SubmitButton } from '@/components/submit-button';
import {
  alertError,
  badgeBrand,
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
import { getProjects } from '@/features/projects/queries/get-projects';
import { statusLabel } from '@/features/projects/status-label';

type BuilderPageProps = {
  searchParams: Promise<{ error?: string }>;
};

// Couleur purement visuelle du badge de statut (les libellés viennent du
// domaine, jamais inventés ici).
const statusBadge = (status: string): string => {
  if (status === 'ready_for_meeting') return badgeSelected;
  if (status === 'meeting_completed') return badgeBrand;
  return badgeNeutral;
};

export default async function BuilderPage({ searchParams }: BuilderPageProps) {
  const [projects, { error }] = await Promise.all([getProjects(), searchParams]);

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className={kickerLabel}>Dossiers vendeurs</span>
          <h1 className={pageTitle}>Préparation</h1>
          <p className={pageSubtitle}>
            {projects.length === 0
              ? 'Préparez ici vos rendez-vous vendeurs.'
              : `${projects.length} dossier${projects.length > 1 ? 's' : ''} en cours dans votre agence.`}
          </p>
        </div>
        <Link href="/builder/new" className={btnPrimary}>
          Nouveau dossier vendeur
        </Link>
      </div>

      {error ? (
        <p role="alert" className={alertError}>
          {error}
        </p>
      ) : null}

      {projects.length === 0 ? (
        <div className={emptyState}>
          <p className="font-title text-lg font-semibold text-zinc-700 stage:text-white/85">
            Aucun dossier vendeur.
          </p>
          <p>Créez votre premier dossier pour préparer un rendez-vous vendeur.</p>
          <Link href="/builder/new" className={`${btnPrimary} mt-3`}>
            Créer un dossier
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {projects.map((project) => (
            <li
              key={project.id}
              className={`${card} flex flex-col gap-4 p-4 transition-colors hover:border-brand sm:flex-row sm:items-center sm:justify-between sm:p-5 stage:hover:border-brand`}
            >
              <div className="flex min-w-0 flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-title text-xl font-semibold text-zinc-900 stage:text-white">
                    {project.seller_name}
                  </span>
                  <span className={statusBadge(project.status)}>{statusLabel(project.status)}</span>
                </div>
                <span className="truncate text-sm text-zinc-500 stage:text-white/55">
                  {project.seller_email || 'E-mail non renseigné'} ·{' '}
                  {project.seller_phone || 'Téléphone non renseigné'}
                </span>
                <span className="text-xs text-zinc-400 stage:text-white/40">
                  Créé le {new Date(project.created_at).toLocaleDateString('fr-FR')}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link href={`/builder/${project.id}`} className={btnSecondary}>
                  Ouvrir le dossier
                </Link>
                <form action={deleteProject}>
                  <input type="hidden" name="projectId" value={project.id} />
                  <SubmitButton pendingLabel="Suppression…" className={btnDangerGhost}>
                    Supprimer
                  </SubmitButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
