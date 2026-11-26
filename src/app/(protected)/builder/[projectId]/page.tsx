import Link from 'next/link';
import { notFound } from 'next/navigation';

import { StatTiles } from '@/components/socle/stat-tiles';
import { backLink, link, socleBigStep, socleBtnFilledBig } from '@/components/ui/styles';
import { displayCommune } from '@/features/competitor-search/utils/arrondissements';
import { MarketGlanceCard } from '@/features/before-meeting/components/market-glance-card';
import {
  buildMarketGlance,
  toGlanceCompetitor,
} from '@/features/before-meeting/services/market-glance';
import { getComparables } from '@/features/comparables/queries/get-comparables';
import { getSavedPricePositioning } from '@/features/price-positioning/services/get-saved-price-positioning';
import { archiveProjectAction } from '@/features/projects/actions/archive-project';
import { ArchiveProjectButton } from '@/features/projects/components/archive-project-button';
import {
  DossierAllFold,
  DossierHeader,
  NextStepCard,
} from '@/features/projects/components/dossier-summary';
import { OverviewSteps } from '@/features/projects/components/overview-steps';
import { dossierBadge, dossierTiles } from '@/features/projects/services/dossier-summary';
import { propertyLabel } from '@/features/projects/services/property-label';
import { nextDossierAction } from '@/features/projects/services/dossier-steps';
import {
  followUpNextStep,
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
import { getProfile } from '@/lib/auth/get-profile';
import { formatRelativeDay } from '@/lib/format';

type ProjectPageProps = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ tout?: string }>;
};

// La refonte, lot E (maquette REFONTE-8) — le dossier d'un vendeur, comme la fiche d'un acquéreur :
// son état, UNE prochaine étape (le seul bouton plein, M143), trois chiffres, « Son dossier » (ses
// cinq étapes), puis « Tout le dossier », replié : tout ce que la Vue d'ensemble montrait sous ses
// étapes y est (le marché en un coup d'œil, les autres actions, les acquéreurs de l'agence, la
// prospection, la réouverture du Live). `?tout=1` l'ouvre.
export default async function ProjectPage({ params, searchParams }: ProjectPageProps) {
  const [{ projectId }, { tout }] = await Promise.all([params, searchParams]);
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
  // Mission 145 (partie B) — un vendeur à relancer que veulent des acquéreurs prêts : la relance,
  // avec l'argument, devient la Prochaine étape, seul bouton plein (M143).
  const relance =
    conclusion?.outcome === 'follow_up' && buyers
      ? followUpNextStep(projectId, project.seller_name, buyers.ready.length)
      : null;
  const nextAction = relance?.action ?? action;
  // Mission 97 — pas de prospection pour un dossier d'exemple : ses concurrents sont fictifs.
  const prospectingRows =
    !project.is_example && isProspectingOpen(project.status, conclusion?.outcome)
      ? // Mission 111 — l'opposition de la carte entière, comme le lot et la tournée.
        await withCardOpposition(projectId, await getProspectingRows(projectId))
      : null;

  const watchLocator =
    prospectingRows == null &&
    (hasCompetitorsToLocate ?? (await hasSelectedCompetitorsToLocate(projectId)));
  const nextPhrase =
    nextAction != null
      ? (relance?.phrase ?? nextStepPhrase(nextAction.key, launch?.estimatedMinutes ?? null))
      : null;
  return (
    <div className="flex flex-col gap-[18px] md:gap-5">
      <div className="flex flex-col gap-2">
        <Link href="/vendeurs" className={backLink}>
          ← Vendeurs
        </Link>
        <DossierHeader
          as="h1"
          name={project.seller_name}
          propertyText={propertyLabel(
            property
              ? {
                  propertyType: property.property_type,
                  roomsCount: property.rooms_count,
                  surfaceArea: property.surface_area,
                  city: displayCommune(property.city, property.postal_code),
                }
              : null,
          )}
          badge={dossierBadge({
            status: project.status,
            outcome: conclusion?.outcome ?? null,
            mandateType: conclusion?.mandateType ?? null,
          })}
        />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
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
          <span className="text-sm text-[#5B6380] stage:text-white/60">
            {project.seller_email || 'E-mail non renseigné'} ·{' '}
            {project.seller_phone || 'Téléphone non renseigné'} · Créé{' '}
            {formatRelativeDay(project.created_at)}
          </span>
        </div>
      </div>

      {/* Mission 143 (B4) — UNE prochaine étape, avec un seul bouton plein. */}
      {nextAction ? (
        <NextStepCard
          testId="overview-next-step"
          title={relance?.title ?? nextStepTitle(nextAction, project.seller_name)}
          phrase={nextPhrase}
          action={
            // Le Live passe par ses contrôles (M104, M107) : le même bouton que partout.
            (nextAction.key === 'launch' || nextAction.key === 'resume') && launch ? (
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
                listingsCheckStale={launch.listingsCheckStale}
                presentationMode={launch.presentationMode}
              />
            ) : (
              <Link href={nextAction.href} className={`${socleBtnFilledBig} ${socleBigStep}`}>
                {nextAction.label}
              </Link>
            )
          }
          links={
            // Mission 110 — le mode expert masque les rappels d'entraînement.
            nextAction.key === 'launch' && !project.is_example && profile?.expert_mode !== true ? (
              <form action={openExampleDossier}>
                <button type="submit" className={`${link} text-sm`} data-testid="overview-practice">
                  S’entraîner sur le dossier d’exemple
                </button>
              </form>
            ) : null
          }
        />
      ) : null}

      {/* Trois chiffres (REFONTE-8) : ses concurrents retenus, ce qui reste à vérifier sur eux, les
          acquéreurs de l'agence prêts à visiter. */}
      <StatTiles
        testId="dossier-tiles"
        tiles={dossierTiles({
          retained: retained.length,
          toVerify: launch?.toVerifyCount ?? 0,
          readyBuyers:
            buyers === undefined ? undefined : buyers == null ? null : buyers.ready.length,
        })}
      />

      {/* Mission 143 (B4) — cinq étapes qui disent vrai. */}
      <OverviewSteps steps={steps} />

      <DossierAllFold open={tout === '1'}>
        {glance ? <MarketGlanceCard glance={glance} /> : null}
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

        {buyers !== undefined ? (
          <PropertyBuyersBlock
            result={buyers}
            followUp={conclusion?.outcome === 'follow_up'}
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
      </DossierAllFold>
    </div>
  );
}
