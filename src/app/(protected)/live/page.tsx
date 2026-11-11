import { ExampleBadge } from '@/features/welcome/components/example-badge';
import Link from 'next/link';

import {
  badgeNeutral,
  card,
  emptyState,
  kickerLabel,
  link,
  pageSubtitle,
  pageTitle,
} from '@/components/ui/styles';
import { LiveLaunchActions } from '@/features/live-seller/components/live-launch-actions';
import { getLiveLaunchInfo } from '@/features/live-seller/queries/get-live-launch-info';
import { liveListOrder } from '@/features/live-seller/services/live-launch';
import { getReadyProjects } from '@/features/projects/queries/get-ready-projects';
import { statusLabel } from '@/features/projects/status-label';
import { formatRelativeDay } from '@/lib/format';

// Rampe de lancement du Live : on choisit le dossier, la scène s'ouvre plein cadre.
// MISSION 52 — que des dossiers PRÊTS (filtre sur status), jamais de brouillon.
export default async function LivePage() {
  const projects = await getReadyProjects();
  // Mission 89 — pour chaque dossier prêt : a-t-il des concurrents, et où en est son Live ?
  const launchInfos = await Promise.all(projects.map((project) => getLiveLaunchInfo(project.id)));
  // Mission 146 — prêts pour le Live d'abord, puis le plus récemment modifié ; un seul plein.
  const rows = liveListOrder(
    projects.map((project, index) => ({
      project,
      info: launchInfos[index],
      updatedAt: project.updated_at,
      competitorCount: launchInfos[index]?.competitorCount ?? 0,
      documentOnly: launchInfos[index]?.presentationMode === 'document',
    })),
  );

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
            Aucun dossier prêt pour le moment.
          </p>
          <p>
            Un dossier apparaît ici dès qu&apos;il est prêt : bien vendeur, au moins trois
            concurrents exploitables et décision de prix enregistrée. Terminez-en un dans la{' '}
            <Link href="/builder" className={link}>
              Préparation
            </Link>
            .
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map(({ row: { project, info }, primary }) => (
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
                  {project.is_example ? <ExampleBadge /> : null}
                </div>
                <span className="text-xs text-zinc-500 stage:text-white/40">
                  Dossier créé {formatRelativeDay(project.created_at)}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Link href={`/builder/${project.id}/avant-rendez-vous`} className={link}>
                  Vérifier la préparation
                </Link>
                <LiveLaunchActions
                  projectId={project.id}
                  competitorCount={info?.competitorCount ?? 0}
                  resume={info?.resume ?? { started: false, index: 0, total: 0 }}
                  isExample={project.is_example === true}
                  toVerifyCount={info?.toVerifyCount ?? 0}
                  decisionOutdated={info?.decisionOutdated ?? false}
                  decisionMissing={info?.decisionMissing ?? false}
                  shortlistPending={info?.shortlistPending ?? false}
                  pendingImportCount={info?.pendingImportCount ?? 0}
                  listingsCheckStale={info?.listingsCheckStale ?? false}
                  presentationMode={info?.presentationMode}
                  secondary={!primary}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
