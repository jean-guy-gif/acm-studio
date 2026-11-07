import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  backLink,
  badgeNeutral,
  btnPrimary,
  card,
  kickerLabel,
  link,
  pageSubtitle,
  pageTitle,
} from '@/components/ui/styles';
import { MarketGlanceCard } from '@/features/before-meeting/components/market-glance-card';
import {
  buildMarketGlance,
  toGlanceCompetitor,
} from '@/features/before-meeting/services/market-glance';
import { getComparables } from '@/features/comparables/queries/get-comparables';
import { getSavedPricePositioning } from '@/features/price-positioning/services/get-saved-price-positioning';
import { archiveProjectAction } from '@/features/projects/actions/archive-project';
import { ArchiveProjectButton } from '@/features/projects/components/archive-project-button';
import { OverviewSteps } from '@/features/projects/components/overview-steps';
import { nextDossierAction } from '@/features/projects/services/dossier-steps';
import {
  nextStepPhrase,
  nextStepTitle,
  overviewSteps,
} from '@/features/projects/services/overview-steps';
import { openExampleDossier } from '@/features/welcome/actions/open-example-dossier';
import { evaluateProjectReadiness } from '@/features/projects/services/project-readiness';
import { readPhotoPaths } from '@/features/subject-property-photos/services/get-property-photos';
import { getSubjectProperty } from '@/features/subject-property/queries/get-subject-property';
import { PropertyBuyersBlock } from '@/features/buyers/components/property-buyers-block';
import { OfferAnswerBadge } from '@/features/purchase-offer/components/offer-answer-badge';
import {
  getAgencyOfferAnswers,
  getProjectOfferAnswers,
} from '@/features/purchase-offer/queries/get-offer-answers';
import { projectsUnderOffer, proposableMandate } from '@/features/buyers/services/proposable';
import { createClient } from '@/lib/supabase/server';
import { getPropertyBuyers } from '@/features/buyers/queries/get-property-buyers';
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
import { getProfile } from '@/lib/auth/get-profile';
import { formatRelativeDay } from '@/lib/format';

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const project = await getProject(projectId);

  if (!project) {
    notFound();
  }

  // Mission 128 B — ce qui ne dépend que du dossier part ensemble.
  const profile = await getProfile();
  const [
    conclusion,
    launch,
    reopenings,
    hasCompetitorsToLocate,
    buyers,
    offerAnswers,
    agencyOffers,
    readiness,
    property,
    comparables,
    saved,
  ] = await Promise.all([
    // Mission 75 — mandat signé : les concurrents retenus deviennent une liste à prospecter.
    project.status === 'meeting_completed' ? getConclusion(projectId) : null,
    getLiveLaunchInfo(projectId),
    // Mission 104 — pour les seuls opérateurs : rouvrir un Live figé par erreur (null sinon).
    getLiveReopenings(projectId),
    // Mission 128 B — la veille du Localisateur ne part que s'il reste une adresse à demander ;
    // un dossier conclu attend sa conclusion (un mandat signé a sa propre veille, en prospection).
    project.status === 'meeting_completed' ? null : hasSelectedCompetitorsToLocate(projectId),
    // Mission 133 — les acquéreurs de l'agence pour ce bien ; jamais pour un dossier d'exemple.
    profile && !project.is_example
      ? getPropertyBuyers(profile.agency_id, projectId, new Date())
      : undefined,
    // Mission 138 — les réponses du vendeur aux offres faites sur son bien.
    profile && project.status === 'meeting_completed'
      ? createClient().then((supabase) =>
          getProjectOfferAnswers(supabase, profile.agency_id, [projectId]),
        )
      : [],
    // Mission 145 — les offres de l'agence : la plus récente offre acceptée de chaque acquéreur
    // tient son mandat, qui ne se propose plus.
    profile && project.status === 'meeting_completed'
      ? createClient().then((supabase) => getAgencyOfferAnswers(supabase, profile.agency_id))
      : [],
    // Mission 143 (B4) — les cinq étapes et la prochaine, lues sur les mêmes faits que l'en-tête.
    profile
      ? createClient().then((supabase) =>
          evaluateProjectReadiness(supabase, projectId, profile.agency_id),
        )
      : null,
    getSubjectProperty(projectId),
    getComparables(projectId),
    getSavedPricePositioning(projectId),
  ]);
  const generatedAt = new Date().toISOString();
  const retained = comparables.filter((comparable) => comparable.is_selected);
  const glance =
    retained.length > 0
      ? buildMarketGlance(retained.map((comparable) => toGlanceCompetitor(comparable, generatedAt)))
      : null;
  const progress = {
    status: project.status,
    hasProperty: readiness?.hasProperty ?? property != null,
    exploitableCount: readiness?.exploitableCount ?? 0,
    hasDecision: readiness?.hasPositioning ?? saved != null,
    documentOnly: project.live_presentation_mode === 'document',
  };
  const steps = overviewSteps(projectId, {
    ...progress,
    photoCount: readPhotoPaths(property?.photo_urls ?? null).length,
    decisionPrice: saved?.advisorPrice ?? saved?.advisorComparativeMarketPrice ?? null,
    liveStartedAt: project.live_started_at,
    liveEndedAt: project.live_ended_at,
  });
  const action = readiness
    ? nextDossierAction(projectId, {
        ...progress,
        liveStarted: project.live_started_at != null,
        liveEnded: project.live_ended_at != null,
      })
    : null;
  // Mission 97 — pas de prospection pour un dossier d'exemple : ses concurrents sont fictifs.
  const prospectingRows =
    !project.is_example && isProspectingOpen(project.status, conclusion?.outcome)
      ? // Mission 111 — l'opposition de la carte entière, comme le lot et la tournée.
        await withCardOpposition(projectId, await getProspectingRows(projectId))
      : null;

  const watchLocator =
    prospectingRows == null &&
    (hasCompetitorsToLocate ?? (await hasSelectedCompetitorsToLocate(projectId)));
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
          {/* Mission 138 — une lecture en échec le dit, jamais « aucune réponse » (M98). */}
          {offerAnswers == null ? (
            <span role="alert" className="text-xs font-semibold text-red-700">
              Les réponses aux offres n’ont pas pu être lues : rechargez la page.
            </span>
          ) : null}
          {(offerAnswers ?? []).map((answer) => (
            <OfferAnswerBadge
              key={answer.documentId}
              decision={answer.decision}
              decidedAt={answer.decidedAt}
              suffix={answer.buyerName}
            />
          ))}
          <span className={pageSubtitle}>
            {project.seller_email || 'E-mail non renseigné'} ·{' '}
            {project.seller_phone || 'Téléphone non renseigné'} · Créé{' '}
            {formatRelativeDay(project.created_at)}
          </span>
        </div>
      </div>

      {/* Mission 143 (B4, maquette AUDIT-garcia.png) — cinq étapes qui disent vrai, et UNE
          prochaine étape avec un seul bouton plein. */}
      <OverviewSteps steps={steps} />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex min-w-0 flex-col gap-4">
          {glance ? <MarketGlanceCard glance={glance} /> : null}
        </div>
        <div className="flex flex-col gap-3">
          {action ? (
            <section
              className={`${card} flex flex-col gap-3 border-l-4 border-l-brand-deep p-5`}
              data-testid="overview-next-step"
            >
              <span className={kickerLabel}>Prochaine étape</span>
              <h2 className="font-title text-xl font-bold text-zinc-900 stage:text-white">
                {nextStepTitle(action, project.seller_name)}
              </h2>
              {nextStepPhrase(action.key, launch?.estimatedMinutes ?? null) ? (
                <p className="text-sm text-zinc-600 stage:text-white/70">
                  {nextStepPhrase(action.key, launch?.estimatedMinutes ?? null)}
                </p>
              ) : null}
              {/* Le Live passe par ses contrôles (M104, M107) : le même bouton que partout. */}
              {(action.key === 'launch' || action.key === 'resume') && launch ? (
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
                  presentationMode={launch.presentationMode}
                />
              ) : (
                <Link href={action.href} className={`${btnPrimary} self-start`}>
                  {action.label}
                </Link>
              )}
              {/* Mission 110 — le mode expert masque les rappels d'entraînement. */}
              {action.key === 'launch' && !project.is_example && profile?.expert_mode !== true ? (
                <form action={openExampleDossier}>
                  <button
                    type="submit"
                    className={`${link} text-sm`}
                    data-testid="overview-practice"
                  >
                    S’entraîner sur le dossier d’exemple
                  </button>
                </form>
              ) : null}
            </section>
          ) : null}
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-600 stage:text-white/70">
            <span>Autres actions :</span>
            {/* Mission 131 — l'Étude de marché, pour remettre ou envoyer, avec ou sans Live. */}
            <Link
              href={`/builder/${projectId}/etude-de-marche`}
              className={link}
              data-testid="market-study-link"
            >
              Télécharger l’Étude de marché
            </Link>
            {project.status === 'meeting_completed' ? (
              <Link href={`/builder/${projectId}/conclusion`} className={link}>
                Voir ou corriger l’issue
              </Link>
            ) : null}
            {/* « Supprimer » loin du bouton principal, avec sa confirmation, sur un dossier en
                cours (M93). */}
            {project.status === 'draft' || project.status === 'ready_for_meeting' ? (
              <ArchiveProjectButton
                projectId={projectId}
                projectName={project.seller_name}
                action={archiveProjectAction}
                label="Supprimer le dossier…"
                triggerClassName="text-sm font-medium text-red-700 underline underline-offset-4 hover:text-red-800"
              />
            ) : null}
          </p>
        </div>
      </div>

      {buyers !== undefined ? (
        <PropertyBuyersBlock
          result={buyers}
          followUp={
            conclusion?.outcome === 'follow_up'
              ? {
                  sellerName: project.seller_name ?? 'le vendeur',
                  href: `/suivi?relancer=${projectId}#suivi-${projectId}`,
                }
              : null
          }
          proposeKey={
            // Mission 145 (partie A) — un mandat signé sans offre acceptée, et lui seul ; une
            // lecture des offres en échec ne propose rien (M98).
            agencyOffers != null &&
            proposableMandate(conclusion?.outcome, projectId, projectsUnderOffer(agencyOffers))
              ? `project:${projectId}`
              : null
          }
        />
      ) : null}

      {prospectingRows ? (
        <ProspectingSection projectId={projectId} rows={prospectingRows} />
      ) : (
        <CompetitorLocatorWatcher projectId={projectId} enabled={watchLocator} />
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
