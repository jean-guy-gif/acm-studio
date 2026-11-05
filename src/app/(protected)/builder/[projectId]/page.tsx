import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  backLink,
  badgeNeutral,
  card,
  kickerLabel,
  pageSubtitle,
  pageTitle,
} from '@/components/ui/styles';
import { CompetitorLocatorWatcher } from '@/features/competitor-locator/components/competitor-locator-watcher';
import { ProspectingSection } from '@/features/competitor-locator/components/prospecting-section';
import { withCardOpposition } from '@/features/prospecting/queries/prospecting-card-store';
import { getProspectingRows } from '@/features/competitor-locator/queries/get-prospecting-rows';
import { hasSelectedCompetitorsToLocate } from '@/features/competitor-locator/queries/has-competitors-to-locate';
import { isProspectingOpen } from '@/features/competitor-locator/services/build-prospecting-rows';
import { ReopenLivePanel } from '@/features/live-reopening/components/reopen-live-panel';
import { getLiveReopenings } from '@/features/live-reopening/queries/get-live-reopenings';
import { LiveLaunchActions } from '@/features/live-seller/components/live-launch-actions';
import { getLiveLaunchInfo } from '@/features/live-seller/queries/get-live-launch-info';
import { getConclusion } from '@/features/meeting-conclusion/queries/get-conclusion';
import { getProject } from '@/features/projects/queries/get-project';
import { statusLabel } from '@/features/projects/status-label';

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

// Étapes de préparation du dossier — purement navigationnel : aucun état
// d'avancement inventé (pas de faux indicateurs de complétion).
const STEPS = [
  {
    href: (id: string) => `/builder/${id}/property`,
    title: 'Bien vendeur',
    description: 'Caractéristiques, diagnostics et copropriété du bien à vendre.',
  },
  {
    href: (id: string) => `/builder/${id}/comparables`,
    title: 'Concurrents',
    description:
      'Chercher les biens en vente qui ressemblent au vôtre, les retenir ou les écarter.',
  },
  // Mission 91 — analyse, positionnement et présentation vendeur tiennent sur un seul écran.
  {
    href: (id: string) => `/builder/${id}/avant-rendez-vous`,
    title: 'Avant le rendez-vous',
    description: 'Le marché en un coup d’œil, votre décision de prix, ce que verra le vendeur.',
  },
];

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const project = await getProject(projectId);

  if (!project) {
    notFound();
  }

  // Mission 128 B — ce qui ne dépend que du dossier part ensemble.
  const [conclusion, launch, reopenings, hasCompetitorsToLocate] = await Promise.all([
    // Mission 75 — mandat signé : les concurrents retenus deviennent une liste à prospecter.
    project.status === 'meeting_completed' ? getConclusion(projectId) : null,
    getLiveLaunchInfo(projectId),
    // Mission 104 — pour les seuls opérateurs : rouvrir un Live figé par erreur (null sinon).
    getLiveReopenings(projectId),
    // Mission 128 B — la veille du Localisateur ne part que s'il reste une adresse à demander.
    hasSelectedCompetitorsToLocate(projectId),
  ]);
  // Mission 97 — pas de prospection pour un dossier d'exemple : ses concurrents sont fictifs.
  const prospectingRows =
    !project.is_example && isProspectingOpen(project.status, conclusion?.outcome)
      ? // Mission 111 — l'opposition de la carte entière, comme le lot et la tournée.
        await withCardOpposition(projectId, await getProspectingRows(projectId))
      : null;

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-2">
        <Link href="/builder" className={backLink}>
          ← Retour aux dossiers
        </Link>
        <span className={kickerLabel}>Dossier vendeur</span>
        <h1 className={pageTitle}>{project.seller_name}</h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className={badgeNeutral}>{statusLabel(project.status)}</span>
          <span className={pageSubtitle}>
            {project.seller_email || 'E-mail non renseigné'} ·{' '}
            {project.seller_phone || 'Téléphone non renseigné'} · Créé le{' '}
            {new Date(project.created_at).toLocaleDateString('fr-FR')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {STEPS.map((step, index) => (
          <Link
            key={step.title}
            href={step.href(projectId)}
            className={`${card} group flex items-start gap-4 p-5 transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-lg hover:shadow-brand/10 stage:hover:border-brand stage:hover:shadow-none`}
          >
            <span className="font-title text-3xl leading-none font-bold text-brand/35 transition-colors group-hover:text-brand stage:text-brand/40">
              {index + 1}
            </span>
            <span className="flex min-w-0 flex-col gap-1">
              <span className="font-title text-lg leading-snug font-semibold text-zinc-900 stage:text-white">
                {step.title}
              </span>
              <span className="text-sm text-zinc-500 stage:text-white/55">{step.description}</span>
            </span>
          </Link>
        ))}

        {/* L'accès à la scène : le rendez-vous lui-même. Mission 104 — le même bouton que la
            liste du Live : il vérifie avant d'ouvrir (concurrents, « à vérifier », vrai dossier). */}
        <div className="flex items-start gap-4 rounded-2xl bg-gradient-to-br from-brand-deep via-brand-darker to-brand-darkest p-5 text-white shadow-card">
          <span className="font-title text-3xl leading-none font-bold text-brand">→</span>
          <span className="flex min-w-0 flex-col gap-3">
            <span className="flex flex-col gap-1">
              <span className="font-title text-lg leading-snug font-semibold">Le Live</span>
              <span className="text-sm text-white/65">
                Le rendez-vous vendeur en mode présentation, plein écran.
              </span>
            </span>
            {launch ? (
              <LiveLaunchActions
                projectId={projectId}
                competitorCount={launch.competitorCount}
                resume={launch.resume}
                isExample={launch.isExample}
                toVerifyCount={launch.toVerifyCount}
                decisionOutdated={launch.decisionOutdated}
                decisionMissing={launch.decisionMissing}
                shortlistPending={launch.shortlistPending}
                pendingImportCount={launch.pendingImportCount}
                secondary
              />
            ) : null}
          </span>
        </div>

        {/* Mission 53 — l'issue du rendez-vous, côté conseiller. Disponible dès que le
            dossier est prêt (dans le Live) ; reste accessible une fois conclu (Suivi). */}
        {project.status === 'ready_for_meeting' || project.status === 'meeting_completed' ? (
          <Link
            href={`/builder/${projectId}/conclusion`}
            className={`${card} group flex items-start gap-4 p-5 transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-lg hover:shadow-brand/10 stage:hover:border-brand stage:hover:shadow-none`}
          >
            <span className="font-title text-3xl leading-none font-bold text-brand/35 transition-colors group-hover:text-brand stage:text-brand/40">
              ✓
            </span>
            <span className="flex min-w-0 flex-col gap-1">
              <span className="font-title text-lg leading-snug font-semibold text-zinc-900 stage:text-white">
                Conclure le rendez-vous
              </span>
              <span className="text-sm text-zinc-500 stage:text-white/55">
                {project.status === 'meeting_completed'
                  ? 'Dossier dans le Suivi — voir ou corriger l’issue.'
                  : 'Mandat signé ou à relancer, après le Live.'}
              </span>
            </span>
          </Link>
        ) : null}
      </div>

      {prospectingRows ? (
        <ProspectingSection projectId={projectId} rows={prospectingRows} />
      ) : (
        <CompetitorLocatorWatcher projectId={projectId} enabled={hasCompetitorsToLocate} />
      )}

      {reopenings ? (
        <ReopenLivePanel
          projectId={projectId}
          canReopen={
            (project.status === 'draft' || project.status === 'ready_for_meeting') &&
            (launch?.resume.started === true || project.live_started_at != null)
          }
          history={reopenings}
        />
      ) : null}
    </div>
  );
}
