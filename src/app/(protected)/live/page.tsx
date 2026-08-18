import Link from 'next/link';

import {
  badgeNeutral,
  btnPrimary,
  card,
  emptyState,
  kickerLabel,
  link,
  pageSubtitle,
  pageTitle,
} from '@/components/ui/styles';
import { getProjects } from '@/features/projects/queries/get-projects';
import { statusLabel } from '@/features/projects/status-label';

// Rampe de lancement du Live : on choisit le dossier, la scène s'ouvre plein
// cadre. Aucune donnée nouvelle — la même liste de dossiers que la Préparation.
export default async function LivePage() {
  const projects = await getProjects();

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-1.5">
        <span className={kickerLabel}>Rendez-vous vendeur</span>
        <h1 className={pageTitle}>Live</h1>
        <p className={pageSubtitle}>
          Choisissez un dossier : la présentation s&apos;ouvre en plein cadre, prête à animer le
          rendez-vous (bascule Clair/Sombre et plein écran sur place).
        </p>
      </div>

      {projects.length === 0 ? (
        <div className={emptyState}>
          <p className="font-title text-lg font-semibold text-zinc-700 stage:text-white/85">
            Aucun dossier vendeur à présenter.
          </p>
          <p>
            Créez d&apos;abord un dossier dans la{' '}
            <Link href="/builder" className={link}>
              Préparation
            </Link>
            .
          </p>
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
                  <span className={badgeNeutral}>{statusLabel(project.status)}</span>
                </div>
                <span className="text-xs text-zinc-400 stage:text-white/40">
                  Dossier créé le {new Date(project.created_at).toLocaleDateString('fr-FR')}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Link href={`/builder/${project.id}/presentation`} className={link}>
                  Vérifier la préparation
                </Link>
                <Link href={`/live/${project.id}`} className={btnPrimary}>
                  Lancer le Live →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
